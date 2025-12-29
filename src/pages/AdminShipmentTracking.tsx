import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, Mail, CheckCircle, XCircle, Clock, Ban, Package } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ShipmentEvent {
  id: string;
  order_id: string;
  tracking_number: string;
  status: string;
  status_detail: Record<string, unknown>;
  occurred_at: string;
  received_at: string;
}

interface NotificationStats {
  pending: number;
  sent: number;
  failed: number;
  skipped_dedupe: number;
  skipped_rate_limit: number;
  skipped_cap: number;
}

interface EmailSettings {
  shipping_email_info_received_enabled: boolean;
  shipping_email_pickup_enabled: boolean;
  shipping_email_cooldown_hours: number;
  shipping_email_max_per_order: number;
}

const STATUS_LABELS: Record<string, string> = {
  'info_received': 'Info Received',
  'in_transit': 'In Transit',
  'out_for_delivery': 'Out for Delivery',
  'delivered': 'Delivered',
  'pickup': 'Ready for Pickup',
  'undelivered': 'Delivery Attempted',
  'alert': 'Alert',
  'expired': 'Expired',
  'pending': 'Pending',
};

const STATUS_COLORS: Record<string, string> = {
  'info_received': 'bg-blue-100 text-blue-800',
  'in_transit': 'bg-yellow-100 text-yellow-800',
  'out_for_delivery': 'bg-orange-100 text-orange-800',
  'delivered': 'bg-green-100 text-green-800',
  'pickup': 'bg-purple-100 text-purple-800',
  'undelivered': 'bg-red-100 text-red-800',
  'alert': 'bg-red-100 text-red-800',
  'expired': 'bg-gray-100 text-gray-800',
  'pending': 'bg-gray-100 text-gray-800',
};

export default function AdminShipmentTracking() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<ShipmentEvent[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [settings, setSettings] = useState<EmailSettings>({
    shipping_email_info_received_enabled: false,
    shipping_email_pickup_enabled: false,
    shipping_email_cooldown_hours: 12,
    shipping_email_max_per_order: 6,
  });
  const [savingSettings, setSavingSettings] = useState(false);

  // Check admin status
  useEffect(() => {
    async function checkAdmin() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin');

      if (!roles || roles.length === 0) {
        navigate('/');
        return;
      }

      setIsAdmin(true);
      loadData();
    }
    checkAdmin();
  }, [navigate]);

  async function loadData() {
    setLoading(true);
    try {
      // Load recent events
      const { data: eventsData } = await supabase
        .from('shipment_tracking_events')
        .select('*')
        .order('occurred_at', { ascending: false })
        .limit(20);

      setEvents((eventsData as ShipmentEvent[]) || []);

      // Load notification stats
      const { data: notificationsData } = await supabase
        .from('shipment_notifications')
        .select('status_state');

      const statsCount: NotificationStats = {
        pending: 0,
        sent: 0,
        failed: 0,
        skipped_dedupe: 0,
        skipped_rate_limit: 0,
        skipped_cap: 0,
      };

      (notificationsData || []).forEach((n: { status_state: string }) => {
        if (n.status_state in statsCount) {
          statsCount[n.status_state as keyof NotificationStats]++;
        }
      });

      setStats(statsCount);

      // Load settings
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', [
          'shipping_email_info_received_enabled',
          'shipping_email_pickup_enabled',
          'shipping_email_cooldown_hours',
          'shipping_email_max_per_order',
        ]);

      if (settingsData) {
        const newSettings = { ...settings };
        settingsData.forEach((s: { key: string; value: unknown }) => {
          if (s.key === 'shipping_email_info_received_enabled') {
            newSettings.shipping_email_info_received_enabled = s.value === true;
          } else if (s.key === 'shipping_email_pickup_enabled') {
            newSettings.shipping_email_pickup_enabled = s.value === true;
          } else if (s.key === 'shipping_email_cooldown_hours') {
            newSettings.shipping_email_cooldown_hours = typeof s.value === 'number' ? s.value : 12;
          } else if (s.key === 'shipping_email_max_per_order') {
            newSettings.shipping_email_max_per_order = typeof s.value === 'number' ? s.value : 6;
          }
        });
        setSettings(newSettings);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSavingSettings(true);
    try {
      const updates = [
        { key: 'shipping_email_info_received_enabled', value: settings.shipping_email_info_received_enabled },
        { key: 'shipping_email_pickup_enabled', value: settings.shipping_email_pickup_enabled },
        { key: 'shipping_email_cooldown_hours', value: settings.shipping_email_cooldown_hours },
        { key: 'shipping_email_max_per_order', value: settings.shipping_email_max_per_order },
      ];

      for (const update of updates) {
        await supabase
          .from('app_settings')
          .update({ value: update.value })
          .eq('key', update.key);
      }

      toast.success('Settings saved');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Shipment Tracking
          </h1>
          <p className="text-muted-foreground">Monitor shipment events and email notifications</p>
        </div>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.pending || 0}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.sent || 0}</p>
                <p className="text-xs text-muted-foreground">Sent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.failed || 0}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-gray-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.skipped_dedupe || 0}</p>
                <p className="text-xs text-muted-foreground">Deduped</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.skipped_rate_limit || 0}</p>
                <p className="text-xs text-muted-foreground">Rate Limited</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats?.skipped_cap || 0}</p>
                <p className="text-xs text-muted-foreground">Capped</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Settings Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Settings
            </CardTitle>
            <CardDescription>Configure shipment notification emails</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="info_received">Info Received emails</Label>
              <Switch
                id="info_received"
                checked={settings.shipping_email_info_received_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, shipping_email_info_received_enabled: checked })
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="pickup">Pickup emails</Label>
              <Switch
                id="pickup"
                checked={settings.shipping_email_pickup_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, shipping_email_pickup_enabled: checked })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cooldown">Cooldown (hours)</Label>
              <Input
                id="cooldown"
                type="number"
                min={1}
                max={48}
                value={settings.shipping_email_cooldown_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    shipping_email_cooldown_hours: parseInt(e.target.value) || 12,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_per_order">Max emails per order</Label>
              <Input
                id="max_per_order"
                type="number"
                min={1}
                max={20}
                value={settings.shipping_email_max_per_order}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    shipping_email_max_per_order: parseInt(e.target.value) || 6,
                  })
                }
              />
            </div>
            <Button onClick={saveSettings} disabled={savingSettings} className="w-full">
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Shipment Events</CardTitle>
            <CardDescription>Last 20 tracking updates from 17TRACK</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : events.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No shipment events yet</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Tracking</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono text-sm">{event.order_id}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[event.status] || 'bg-gray-100'}>
                            {STATUS_LABELS[event.status] || event.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(event.occurred_at), 'MMM d, HH:mm')}
                        </TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[120px]">
                          {event.tracking_number}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
