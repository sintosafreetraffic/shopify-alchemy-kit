/**
 * Sleep Sources Settings Page
 * Manage connected sleep data sources (Apple Health, Garmin)
 * Route: /settings/sleep-sources
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, Watch, Smartphone, RefreshCw, AlertCircle, FlaskConical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

// Check if we're in dev mode (Vite exposes this)
const IS_DEV = import.meta.env.DEV;

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
  const [testingSyncFor, setTestingSyncFor] = useState<string | null>(null);

  const loadSources = useCallback(async (uid: string) => {
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
  }, []);

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Please sign in", description: "Authentication required", variant: "destructive" });
      navigate("/auth?returnTo=/settings/sleep-sources");
      return;
    }
    setUserId(session.user.id);
    loadSources(session.user.id);
  }, [navigate, loadSources]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Refresh-on-focus: re-fetch sources when window regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (userId) {
        loadSources(userId);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && userId) {
        loadSources(userId);
      }
    });

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId, loadSources]);

  const getSourceForType = (type: 'apple_health' | 'garmin'): SleepSource | undefined => {
    return sources.find(s => s.source === type);
  };

  const handleConnect = async (sourceType: 'apple_health' | 'garmin') => {
    if (!userId || !pendingTimezone) {
      toast({ title: "Timezone required", description: "Please select a timezone first", variant: "destructive" });
      return;
    }

    const existingSource = getSourceForType(sourceType);
    
    // Guard: don't allow downgrading connected → pending
    if (existingSource?.status === 'connected') {
      toast({ title: "Already connected", description: "This source is already active" });
      return;
    }
    
    // Guard: don't allow reconnecting pending (already waiting)
    if (existingSource?.status === 'pending') {
      toast({ title: "Already pending", description: "Waiting for first sync to complete" });
      return;
    }

    setConnectingSource(sourceType);

    // Only set pending when: no row exists OR status is revoked
    // Use upsert with on_conflict to handle unique constraint (user_id, source)
    const { error } = await supabase
      .from('sleep_sources')
      .upsert(
        {
          user_id: userId,
          source: sourceType,
          status: 'pending',
          user_timezone: pendingTimezone,
          revoked_at: null, // Clear revoked_at on reconnect
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

  const handleTestSync = async (source: SleepSource) => {
    setTestingSyncFor(source.id);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ title: "Error", description: "Not authenticated", variant: "destructive" });
        return;
      }

      const response = await supabase.functions.invoke('sleep-intake', {
        body: { 
          source: source.source, 
          test_mode: true 
        },
      });

      if (response.error) {
        // Check for specific error codes
        const errorData = response.error as { message?: string };
        const message = errorData.message || 'Test sync failed';
        
        // Try to parse the message if it's JSON
        try {
          const parsed = JSON.parse(message);
          if (parsed.code === 'TEST_MODE_DISABLED') {
            toast({ 
              title: "Test mode disabled", 
              description: "Test sync is not enabled on the server", 
              variant: "destructive" 
            });
          } else if (parsed.code === 'SOURCE_REVOKED') {
            toast({ 
              title: "Source disconnected", 
              description: "Please reconnect this source first", 
              variant: "destructive" 
            });
          } else {
            toast({ title: "Error", description: parsed.message || message, variant: "destructive" });
          }
        } catch {
          toast({ title: "Error", description: message, variant: "destructive" });
        }
        return;
      }

      const data = response.data as { status: string; sleep_night_id?: string; code?: string; message?: string };
      
      if (data.status === 'success') {
        toast({ 
          title: "Test sync complete", 
          description: `Sleep night created: ${data.sleep_night_id?.slice(0, 8)}...` 
        });
        loadSources(userId!);
      } else if (data.status === 'duplicate') {
        toast({ 
          title: "Already synced today", 
          description: "Test data for today already exists" 
        });
      } else if (data.code === 'SOURCE_REVOKED') {
        toast({ 
          title: "Source disconnected", 
          description: "Please reconnect this source first", 
          variant: "destructive" 
        });
      } else if (data.code === 'TEST_MODE_DISABLED') {
        toast({ 
          title: "Test mode disabled", 
          description: "Test sync is not enabled on the server", 
          variant: "destructive" 
        });
      } else {
        toast({ title: "Error", description: data.message || "Unknown error", variant: "destructive" });
      }
    } catch (err) {
      console.error('Test sync error:', err);
      toast({ title: "Error", description: "Failed to run test sync", variant: "destructive" });
    } finally {
      setTestingSyncFor(null);
    }
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

  const getStatusExplanation = (source: SleepSource): string => {
    switch (source.status) {
      case 'pending':
        return 'Waiting for first sync from your device';
      case 'connected':
        return source.last_sync_at 
          ? `Last sync ${formatDistanceToNow(new Date(source.last_sync_at), { addSuffix: true })}`
          : 'Connected — awaiting first data';
      case 'revoked':
        return 'Disconnected — your historical data is preserved';
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
                        <CardDescription className="text-sm">
                          {getStatusExplanation(source)}
                        </CardDescription>
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
                  
                  <div className="flex justify-between items-center">
                    {/* Dev-only Test Sync button */}
                    {IS_DEV && source.status !== 'revoked' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestSync(source)}
                        disabled={testingSyncFor === source.id}
                        className="text-muted-foreground"
                      >
                        {testingSyncFor === source.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <FlaskConical className="h-4 w-4 mr-2" />
                        )}
                        Test Sync
                      </Button>
                    )}
                    
                    {/* Spacer when no test button */}
                    {(!IS_DEV || source.status === 'revoked') && <div />}
                    
                    <div className="flex gap-2">
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
