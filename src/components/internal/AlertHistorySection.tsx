/**
 * Alert History Section Component
 * Displays all sent alerts with status (acknowledged/open) and filtering
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";

interface Alert {
  id: string;
  created_at: string;
  day: string;
  type: string;
  severity: string;
  message: string;
  status: string;
  acknowledged_at: string | null;
}

interface AlertHistorySectionProps {
  windowStart?: string;
  windowEnd?: string;
}

export function AlertHistorySection({ windowStart, windowEnd }: AlertHistorySectionProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "acknowledged">("all");
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("tracking_alerts")
        .select("id, created_at, day, type, severity, message, status, acknowledged_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (windowStart && windowEnd) {
        query = query.gte("created_at", windowStart).lt("created_at", windowEnd);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAlerts(data || []);
    } catch (err) {
      console.error("Error fetching alerts:", err);
      toast.error("Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, [windowStart, windowEnd]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const acknowledgeAlert = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      const { error } = await supabase
        .from("tracking_alerts")
        .update({
          status: "acknowledged",
          acknowledged_at: new Date().toISOString(),
        })
        .eq("id", alertId);

      if (error) throw error;

      setAlerts(prev => 
        prev.map(a => 
          a.id === alertId 
            ? { ...a, status: "acknowledged", acknowledged_at: new Date().toISOString() }
            : a
        )
      );
      toast.success("Alert acknowledged");
    } catch (err) {
      console.error("Error acknowledging alert:", err);
      toast.error("Failed to acknowledge alert");
    } finally {
      setAcknowledging(null);
    }
  };

  const filteredAlerts = alerts.filter(a => {
    if (statusFilter === "all") return true;
    return a.status === statusFilter;
  });

  const openCount = alerts.filter(a => a.status === "open").length;
  const acknowledgedCount = alerts.filter(a => a.status === "acknowledged").length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive/10 text-destructive border-destructive/20";
      case "warn": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "info": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "acknowledged": return <CheckCircle className="w-3 h-3 text-green-600" />;
      case "open": return <Clock className="w-3 h-3 text-yellow-600" />;
      default: return <Bell className="w-3 h-3" />;
    }
  };

  const formatAlertType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading alerts...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Alert History</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchAlerts}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <TabsList className="mb-4">
          <TabsTrigger value="all" className="text-xs">
            All ({alerts.length})
          </TabsTrigger>
          <TabsTrigger value="open" className="text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Open ({openCount})
          </TabsTrigger>
          <TabsTrigger value="acknowledged" className="text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Acknowledged ({acknowledgedCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-0">
          {filteredAlerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No {statusFilter === "all" ? "" : statusFilter} alerts found
            </p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredAlerts.map((alert) => (
                <div 
                  key={alert.id} 
                  className="border border-border rounded-md p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {getStatusIcon(alert.status)}
                        <Badge variant="outline" className={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatAlertType(alert.type)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground line-clamp-2">
                        {alert.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>Day: {alert.day}</span>
                        <span>Created: {format(new Date(alert.created_at), "MMM d, HH:mm")}</span>
                        {alert.acknowledged_at && (
                          <span className="text-green-600">
                            Ack'd: {format(new Date(alert.acknowledged_at), "MMM d, HH:mm")}
                          </span>
                        )}
                      </div>
                    </div>
                    {alert.status === "open" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id)}
                        disabled={acknowledging === alert.id}
                        className="shrink-0"
                      >
                        {acknowledging === alert.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        <span className="ml-1 text-xs">Ack</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
