/**
 * AdminAffiliateCampaigns
 * 
 * Admin interface for managing seasonal affiliate campaigns.
 * Features:
 * - CRUD for campaigns
 * - Active/inactive toggle
 * - Bonus rate configuration
 * - Tier eligibility settings
 * - Date range management
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowLeft, Plus, Pencil, Trash2, Loader2, Zap, Calendar, 
  Gift, Snowflake, Sun, Leaf, Heart, Sparkles, Star, PartyPopper, Flame, Moon, CloudSun
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { format, parseISO, isPast, isFuture } from "date-fns";

// Available icons
const ICON_OPTIONS = [
  { value: 'Gift', label: 'Gift', Icon: Gift },
  { value: 'Snowflake', label: 'Snowflake', Icon: Snowflake },
  { value: 'Sun', label: 'Sun', Icon: Sun },
  { value: 'Leaf', label: 'Leaf', Icon: Leaf },
  { value: 'Heart', label: 'Heart', Icon: Heart },
  { value: 'Sparkles', label: 'Sparkles', Icon: Sparkles },
  { value: 'Star', label: 'Star', Icon: Star },
  { value: 'PartyPopper', label: 'Party', Icon: PartyPopper },
  { value: 'Flame', label: 'Flame', Icon: Flame },
  { value: 'Moon', label: 'Moon', Icon: Moon },
  { value: 'CloudSun', label: 'CloudSun', Icon: CloudSun },
];

const ICON_MAP: Record<string, React.ElementType> = {
  Gift, Snowflake, Sun, Leaf, Heart, Sparkles, Star, PartyPopper, Flame, Moon, CloudSun,
};

const COLOR_OPTIONS = [
  { value: 'text-purple-500', bg: 'bg-purple-50', label: 'Purple' },
  { value: 'text-rose-500', bg: 'bg-rose-50', label: 'Rose' },
  { value: 'text-green-500', bg: 'bg-green-50', label: 'Green' },
  { value: 'text-amber-500', bg: 'bg-amber-50', label: 'Amber' },
  { value: 'text-red-500', bg: 'bg-red-50', label: 'Red' },
  { value: 'text-blue-500', bg: 'bg-blue-50', label: 'Blue' },
  { value: 'text-sky-500', bg: 'bg-sky-50', label: 'Sky' },
];

const TIERS = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];

interface Campaign {
  id: string;
  campaign_key: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  icon_color: string | null;
  bg_color: string | null;
  start_date: string;
  end_date: string;
  bonus_rate: number;
  is_active: boolean;
  eligible_tiers: string[] | null;
  created_at: string;
}

interface CampaignFormData {
  campaign_key: string;
  name: string;
  description: string;
  icon_name: string;
  icon_color: string;
  bg_color: string;
  start_date: string;
  end_date: string;
  bonus_rate: number;
  is_active: boolean;
  eligible_tiers: string[];
}

const defaultFormData: CampaignFormData = {
  campaign_key: '',
  name: '',
  description: '',
  icon_name: 'Sparkles',
  icon_color: 'text-purple-500',
  bg_color: 'bg-purple-50',
  start_date: '',
  end_date: '',
  bonus_rate: 5,
  is_active: true,
  eligible_tiers: TIERS,
};

export default function AdminAffiliateCampaigns() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState<CampaignFormData>(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  async function checkAdminAndFetch() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      // Check admin role
      const { data: hasRole } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });

      if (!hasRole) {
        toast({
          title: "Access Denied",
          description: "Admin privileges required.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await fetchCampaigns();
    } catch (error) {
      console.error('[AdminCampaigns] Error:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  async function fetchCampaigns() {
    const { data, error } = await supabase
      .from('affiliate_campaigns')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) {
      console.error('[AdminCampaigns] Fetch error:', error);
      toast({ title: "Error", description: "Failed to load campaigns.", variant: "destructive" });
      return;
    }

    setCampaigns(data || []);
  }

  function getCampaignStatus(campaign: Campaign): { label: string; variant: 'default' | 'secondary' | 'outline' } {
    const now = new Date();
    const start = parseISO(campaign.start_date);
    const end = parseISO(campaign.end_date);

    if (!campaign.is_active) return { label: 'Disabled', variant: 'outline' };
    if (isPast(end)) return { label: 'Ended', variant: 'secondary' };
    if (isFuture(start)) return { label: 'Scheduled', variant: 'secondary' };
    return { label: 'Active', variant: 'default' };
  }

  function openCreateDialog() {
    setEditingCampaign(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  }

  function openEditDialog(campaign: Campaign) {
    setEditingCampaign(campaign);
    setFormData({
      campaign_key: campaign.campaign_key,
      name: campaign.name,
      description: campaign.description || '',
      icon_name: campaign.icon_name || 'Sparkles',
      icon_color: campaign.icon_color || 'text-purple-500',
      bg_color: campaign.bg_color || 'bg-purple-50',
      start_date: campaign.start_date.split('T')[0],
      end_date: campaign.end_date.split('T')[0],
      bonus_rate: Number(campaign.bonus_rate),
      is_active: campaign.is_active,
      eligible_tiers: campaign.eligible_tiers || TIERS,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.campaign_key || !formData.start_date || !formData.end_date) {
      toast({ title: "Validation Error", description: "Please fill all required fields.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const campaignData = {
        campaign_key: formData.campaign_key.toLowerCase().replace(/\s+/g, '_'),
        name: formData.name,
        description: formData.description || null,
        icon_name: formData.icon_name,
        icon_color: formData.icon_color,
        bg_color: formData.bg_color,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date + 'T23:59:59').toISOString(),
        bonus_rate: formData.bonus_rate,
        is_active: formData.is_active,
        eligible_tiers: formData.eligible_tiers,
      };

      if (editingCampaign) {
        const { error } = await supabase
          .from('affiliate_campaigns')
          .update(campaignData)
          .eq('id', editingCampaign.id);

        if (error) throw error;
        toast({ title: "Campaign Updated", description: `${formData.name} has been updated.` });
      } else {
        const { error } = await supabase
          .from('affiliate_campaigns')
          .insert(campaignData);

        if (error) throw error;
        toast({ title: "Campaign Created", description: `${formData.name} has been created.` });
      }

      setDialogOpen(false);
      await fetchCampaigns();
    } catch (error: any) {
      console.error('[AdminCampaigns] Save error:', error);
      toast({ 
        title: "Error", 
        description: error.message?.includes('duplicate') ? 'Campaign key already exists.' : 'Failed to save campaign.',
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    setDeleting(id);
    try {
      const { error } = await supabase
        .from('affiliate_campaigns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: "Campaign Deleted" });
      await fetchCampaigns();
    } catch (error) {
      console.error('[AdminCampaigns] Delete error:', error);
      toast({ title: "Error", description: "Failed to delete campaign.", variant: "destructive" });
    } finally {
      setDeleting(null);
    }
  }

  async function toggleActive(campaign: Campaign) {
    try {
      const { error } = await supabase
        .from('affiliate_campaigns')
        .update({ is_active: !campaign.is_active })
        .eq('id', campaign.id);

      if (error) throw error;
      await fetchCampaigns();
      toast({ title: campaign.is_active ? "Campaign Disabled" : "Campaign Enabled" });
    } catch (error) {
      console.error('[AdminCampaigns] Toggle error:', error);
      toast({ title: "Error", description: "Failed to update campaign.", variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/affiliate-dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Zap className="h-6 w-6 text-amber-500" />
                Campaign Manager
              </h1>
              <p className="text-muted-foreground">Manage seasonal affiliate campaigns</p>
            </div>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            New Campaign
          </Button>
        </div>

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Campaigns</CardTitle>
            <CardDescription>{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''} configured</CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-10 w-10 mx-auto mb-4 opacity-30" />
                <p>No campaigns yet. Create your first seasonal campaign.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Bonus</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const CampaignIcon = ICON_MAP[campaign.icon_name || 'Sparkles'] || Sparkles;
                    const status = getCampaignStatus(campaign);
                    
                    return (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${campaign.bg_color || 'bg-purple-50'} flex items-center justify-center`}>
                              <CampaignIcon className={`h-4 w-4 ${campaign.icon_color || 'text-purple-500'}`} />
                            </div>
                            <div>
                              <div className="font-medium">{campaign.name}</div>
                              <div className="text-xs text-muted-foreground">{campaign.campaign_key}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-green-600">+{campaign.bonus_rate}%</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{format(parseISO(campaign.start_date), 'MMM d')} - {format(parseISO(campaign.end_date), 'MMM d, yyyy')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Switch 
                              checked={campaign.is_active} 
                              onCheckedChange={() => toggleActive(campaign)}
                            />
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(campaign)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDelete(campaign.id)}
                              disabled={deleting === campaign.id}
                            >
                              {deleting === campaign.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4 text-destructive" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'New Campaign'}</DialogTitle>
              <DialogDescription>Configure the campaign details below.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Holiday Season"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="campaign_key">Key *</Label>
                  <Input
                    id="campaign_key"
                    value={formData.campaign_key}
                    onChange={(e) => setFormData(prev => ({ ...prev, campaign_key: e.target.value }))}
                    placeholder="holiday_2026"
                    disabled={!!editingCampaign}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Give the gift of better sleep"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <Select
                    value={formData.icon_name}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, icon_name: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ICON_OPTIONS.map(({ value, label, Icon }) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Select
                    value={formData.icon_color}
                    onValueChange={(value) => {
                      const color = COLOR_OPTIONS.find(c => c.value === value);
                      setFormData(prev => ({ 
                        ...prev, 
                        icon_color: value,
                        bg_color: color?.bg || 'bg-purple-50'
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COLOR_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${value.replace('text-', 'bg-').replace('-500', '-400')}`} />
                            {label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus_rate">Bonus %</Label>
                  <Input
                    id="bonus_rate"
                    type="number"
                    min="1"
                    max="50"
                    value={formData.bonus_rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, bonus_rate: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label>Campaign Active</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingCampaign ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
