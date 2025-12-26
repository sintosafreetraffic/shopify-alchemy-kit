/**
 * Sleep Sources Settings Page
 * Manage connected sleep data sources (Apple Health, Garmin)
 * Route: /settings/sleep-sources
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, Watch, Smartphone, RefreshCw, AlertCircle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

type SleepSourceStatus = 'pending' | 'connected' | 'revoked';

interface SleepSource {
  id: string;
  source: 'apple_health' | 'garmin';
  status: SleepSourceStatus;
  user_timezone: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  created_at: string;
}

const COMMON_TIMEZONES = [
  'Europe/Copenhagen',
  'Europe/Stockholm',
  'Europe/Oslo',
  'Europe/Helsinki',
  'Europe/London',
  'Europe/Berlin',
  'Europe/Paris',
  'Europe/Amsterdam',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

const SleepSources = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<SleepSource[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingTimezone, setPendingTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [connectingSource, setConnectingSource] = useState<'apple_health' | 'garmin' | null>(null);
  const [updatingTimezone, setUpdatingTimezone] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Please sign in", description: "Authentication required", variant: "destructive" });
      navigate("/auth?returnTo=/settings/sleep-sources");
      return;
    }
    setUserId(session.user.id);
    loadSources(session.user.id);
  };

  const loadSources = async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('sleep_sources')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading sleep sources:', error);
      toast({ title: "Error", description: "Failed to load sleep sources", variant: "destructive" });
    } else {
      setSources((data as SleepSource[]) || []);
    }
    setLoading(false);
  };

  const getSourceForType = (type: 'apple_health' | 'garmin'): SleepSource | undefined => {
    return sources.find(s => s.source === type);
  };

  const handleConnect = async (sourceType: 'apple_health' | 'garmin') => {
    if (!userId || !pendingTimezone) {
      toast({ title: "Timezone required", description: "Please select a timezone first", variant: "destructive" });
      return;
    }

    setConnectingSource(sourceType);

    // Use upsert with on_conflict to handle unique constraint (user_id, source)
    // Status always goes to 'pending' - only intake can set 'connected'
    const { error } = await supabase
      .from('sleep_sources')
      .upsert(
        {
          user_id: userId,
          source: sourceType,
          status: 'pending',
          user_timezone: pendingTimezone,
          updated_at: new Date().toISOString(),
        },
        { 
          onConflict: 'user_id,source',
          ignoreDuplicates: false 
        }
      );

    if (error) {
      console.error('Error connecting source:', error);
      toast({ title: "Error", description: "Failed to connect source", variant: "destructive" });
    } else {
      const sourceName = sourceType === 'apple_health' ? 'Apple Health' : 'Garmin';
      toast({ 
        title: "Source added", 
        description: `${sourceName} is pending. It will activate when first sync completes.` 
      });
      loadSources(userId);
    }

    setConnectingSource(null);
  };

  const handleDisconnect = async (source: SleepSource) => {
    setDisconnecting(source.id);

    const { error } = await supabase
      .from('sleep_sources')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', source.id);

    if (error) {
      console.error('Error disconnecting source:', error);
      toast({ title: "Error", description: "Failed to disconnect source", variant: "destructive" });
    } else {
      toast({ title: "Source disconnected", description: "Your historical sleep data is preserved" });
      loadSources(userId!);
    }

    setDisconnecting(null);
  };

  const handleTimezoneUpdate = async (source: SleepSource, newTimezone: string) => {
    setUpdatingTimezone(source.id);

    const { error } = await supabase
      .from('sleep_sources')
      .update({
        user_timezone: newTimezone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', source.id);

    if (error) {
      console.error('Error updating timezone:', error);
      toast({ title: "Error", description: "Failed to update timezone", variant: "destructive" });
    } else {
      toast({ title: "Timezone updated" });
      loadSources(userId!);
    }

    setUpdatingTimezone(null);
  };

  const getStatusBadge = (status: SleepSourceStatus) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-600">Connected</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="text-muted-foreground">Disconnected</Badge>;
    }
  };

  const getSourceIcon = (source: 'apple_health' | 'garmin') => {
    return source === 'apple_health' 
      ? <Smartphone className="h-5 w-5" /> 
      : <Watch className="h-5 w-5" />;
  };

  const getSourceName = (source: 'apple_health' | 'garmin') => {
    return source === 'apple_health' ? 'Apple Health' : 'Garmin';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const appleSource = getSourceForType('apple_health');
  const garminSource = getSourceForType('garmin');

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Connected Sleep Sources</h1>
          <p className="text-muted-foreground mt-1">
            Sleep data is used to support your Sleep Coach insights. You can disconnect at any time.
          </p>
        </div>

        {/* Existing sources */}
        {sources.length > 0 && (
          <div className="space-y-4">
            {sources.map((source) => (
              <Card key={source.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getSourceIcon(source.source)}
                      <div>
                        <CardTitle className="text-lg">{getSourceName(source.source)}</CardTitle>
                        {source.last_sync_at && (
                          <CardDescription>
                            Last sync: {formatDistanceToNow(new Date(source.last_sync_at), { addSuffix: true })}
                          </CardDescription>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(source.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {source.status !== 'revoked' && (
                    <>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground min-w-20">Timezone</span>
                        <Select
                          value={source.user_timezone || ''}
                          onValueChange={(val) => handleTimezoneUpdate(source, val)}
                          disabled={updatingTimezone === source.id}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Select timezone" />
                          </SelectTrigger>
                          <SelectContent>
                            {COMMON_TIMEZONES.map((tz) => (
                              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {updatingTimezone === source.id && <Loader2 className="h-4 w-4 animate-spin" />}
                      </div>
                      <Separator />
                    </>
                  )}
                  
                  <div className="flex justify-end">
                    {source.status === 'revoked' ? (
                      <Button
                        variant="outline"
                        onClick={() => handleConnect(source.source)}
                        disabled={connectingSource === source.source}
                      >
                        {connectingSource === source.source ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Reconnect
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDisconnect(source)}
                        disabled={disconnecting === source.id}
                      >
                        {disconnecting === source.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                        Disconnect
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Add new sources */}
        {(!appleSource || appleSource.status === 'revoked') || (!garminSource || garminSource.status === 'revoked') ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Sleep Source</CardTitle>
              <CardDescription>
                Connect a wearable to automatically import your sleep data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground min-w-20">Timezone</span>
                <Select value={pendingTimezone} onValueChange={setPendingTimezone}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {(!appleSource || appleSource.status === 'revoked') && (
                  <Button
                    variant="outline"
                    onClick={() => handleConnect('apple_health')}
                    disabled={connectingSource === 'apple_health'}
                    className="flex-1"
                  >
                    {connectingSource === 'apple_health' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Smartphone className="h-4 w-4 mr-2" />
                    )}
                    Connect Apple Health
                  </Button>
                )}
                {(!garminSource || garminSource.status === 'revoked') && (
                  <Button
                    variant="outline"
                    onClick={() => handleConnect('garmin')}
                    disabled={connectingSource === 'garmin'}
                    className="flex-1"
                  >
                    {connectingSource === 'garmin' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Watch className="h-4 w-4 mr-2" />
                    )}
                    Connect Garmin
                  </Button>
                )}
              </div>

              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Native app integration coming soon. Once connected, sources will activate automatically 
                  when the first sync completes.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Button variant="ghost" onClick={() => navigate("/sleep-coach")} className="text-muted-foreground">
          ← Back to Sleep Coach
        </Button>
      </div>
    </div>
  );
};

export default SleepSources;
