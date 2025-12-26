/**
 * Garmin Settings Card
 * Displays Garmin connection status and actions
 * States: disconnected | connecting | connected | stale | revoked | error
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Watch, 
  Loader2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Shield
} from "lucide-react";
import { formatDistanceToNow, differenceInHours } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { GarminConnectModal } from "./GarminConnectModal";
import { GarminDisconnectModal } from "./GarminDisconnectModal";

export type GarminStatus = 'disconnected' | 'connecting' | 'connected' | 'stale' | 'revoked' | 'error';

interface GarminSource {
  id: string;
  status: 'pending' | 'connected' | 'revoked';
  user_timezone: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  created_at: string;
}

interface GarminSettingsCardProps {
  source: GarminSource | null;
  userId: string;
  onRefresh: () => void;
  oauthError?: string | null;
}

// Determine display status from database status + sync time
function getDisplayStatus(source: GarminSource | null, oauthError?: string | null): GarminStatus {
  if (oauthError) return 'error';
  if (!source) return 'disconnected';
  
  switch (source.status) {
    case 'revoked':
      return 'revoked';
    case 'pending':
      return 'connecting';
    case 'connected':
      if (source.last_sync_at) {
        const hoursSinceSync = differenceInHours(new Date(), new Date(source.last_sync_at));
        if (hoursSinceSync > 24) return 'stale';
      }
      return 'connected';
    default:
      return 'disconnected';
  }
}

function getStatusConfig(status: GarminStatus) {
  switch (status) {
    case 'disconnected':
      return {
        badge: null,
        icon: Watch,
        iconClass: 'text-muted-foreground',
        description: 'Connect your Garmin to automatically import sleep data.',
      };
    case 'connecting':
      return {
        badge: <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Connecting</Badge>,
        icon: Watch,
        iconClass: 'text-primary',
        description: 'Garmin can take up to 24 hours to send your first sleep session.',
      };
    case 'connected':
      return {
        badge: <Badge variant="default" className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" />Connected</Badge>,
        icon: Watch,
        iconClass: 'text-green-600',
        description: null, // Will show last sync time
      };
    case 'stale':
      return {
        badge: <Badge variant="outline" className="text-amber-600 border-amber-600 gap-1"><AlertTriangle className="h-3 w-3" />Stale</Badge>,
        icon: Watch,
        iconClass: 'text-amber-600',
        description: 'Make sure your Garmin app is syncing to your phone.',
      };
    case 'revoked':
      return {
        badge: <Badge variant="outline" className="text-muted-foreground gap-1"><XCircle className="h-3 w-3" />Disconnected</Badge>,
        icon: Watch,
        iconClass: 'text-muted-foreground',
        description: 'Connection lost. Reconnect to continue syncing sleep data.',
      };
    case 'error':
      return {
        badge: <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Error</Badge>,
        icon: Watch,
        iconClass: 'text-destructive',
        description: 'Connection failed. Please try again.',
      };
  }
}

export function GarminSettingsCard({ 
  source, 
  userId, 
  onRefresh,
  oauthError 
}: GarminSettingsCardProps) {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const displayStatus = getDisplayStatus(source, oauthError);
  const config = getStatusConfig(displayStatus);
  const StatusIcon = config.icon;

  const handleConnect = async (timezone: string) => {
    setIsConnecting(true);

    try {
      // Step 1: Upsert the pending source with timezone
      const { error: upsertError } = await supabase
        .from('sleep_sources')
        .upsert(
          {
            user_id: userId,
            source: 'garmin',
            status: 'pending',
            user_timezone: timezone,
            revoked_at: null,
            updated_at: new Date().toISOString(),
          },
          { 
            onConflict: 'user_id,source',
            ignoreDuplicates: false 
          }
        );

      if (upsertError) {
        throw new Error('Failed to initialize connection');
      }

      // Step 2: Get the OAuth start URL from edge function
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        throw new Error('Not authenticated');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(`${supabaseUrl}/functions/v1/garmin-oauth-start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start Garmin OAuth');
      }

      // Step 3: Redirect to Garmin authorization
      if (result.authorization_url) {
        window.location.href = result.authorization_url;
      } else {
        throw new Error('No authorization URL received');
      }

    } catch (error) {
      console.error('Garmin connect error:', error);
      toast({
        title: "Connection failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setIsConnecting(false);
      setShowConnectModal(false);
    }
  };

  const handleDisconnect = async () => {
    if (!source) return;
    setIsDisconnecting(true);

    try {
      const { error } = await supabase
        .from('sleep_sources')
        .update({
          status: 'revoked',
          revoked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', source.id);

      if (error) throw error;

      toast({
        title: "Garmin disconnected",
        description: "Your historical sleep data is preserved.",
      });
      
      setShowDisconnectModal(false);
      onRefresh();
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Get last sync display text
  const getLastSyncText = () => {
    if (!source?.last_sync_at) return null;
    const syncDate = new Date(source.last_sync_at);
    return `Last synced ${formatDistanceToNow(syncDate, { addSuffix: true })}`;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full bg-muted`}>
                <StatusIcon className={`h-5 w-5 ${config.iconClass}`} />
              </div>
              <div>
                <CardTitle className="text-lg">Garmin</CardTitle>
                <CardDescription className="text-sm">
                  {displayStatus === 'connected' && source?.last_sync_at 
                    ? getLastSyncText() 
                    : config.description}
                </CardDescription>
              </div>
            </div>
            {config.badge}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Trust copy - always visible when not disconnected */}
          {displayStatus !== 'disconnected' && (
            <div className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
              <Shield className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                We use your Garmin sleep data to personalize your sleep plan. 
                We only access sleep sessions — not activity, heart rate, or steps.
              </span>
            </div>
          )}

          {/* Stale warning - additional context */}
          {displayStatus === 'stale' && source?.last_sync_at && (
            <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 rounded-lg p-3">
              <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                Last synced {formatDistanceToNow(new Date(source.last_sync_at), { addSuffix: true })}. 
                Make sure your Garmin app is syncing.
              </span>
            </div>
          )}

          {/* Connecting state - extended wait info */}
          {displayStatus === 'connecting' && (
            <div className="flex items-start gap-2 text-sm bg-muted/50 rounded-lg p-3">
              <Clock className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground">
                Garmin can take up to 24 hours to send your first sleep session. 
                You'll see your data here once it arrives.
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {displayStatus === 'disconnected' && (
              <Button onClick={() => setShowConnectModal(true)}>
                <Watch className="h-4 w-4 mr-2" />
                Connect Garmin
              </Button>
            )}

            {(displayStatus === 'revoked' || displayStatus === 'error') && (
              <Button onClick={() => setShowConnectModal(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            )}

            {(displayStatus === 'connected' || displayStatus === 'stale' || displayStatus === 'connecting') && (
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setShowDisconnectModal(true)}
              >
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <GarminConnectModal
        open={showConnectModal}
        onOpenChange={setShowConnectModal}
        onConfirm={handleConnect}
        isConnecting={isConnecting}
      />

      <GarminDisconnectModal
        open={showDisconnectModal}
        onOpenChange={setShowDisconnectModal}
        onConfirm={handleDisconnect}
        isDisconnecting={isDisconnecting}
      />
    </>
  );
}
