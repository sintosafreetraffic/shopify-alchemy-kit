/**
 * Sleep Sources Settings Page
 * Manage connected sleep data sources (Apple Health, Garmin)
 * Route: /settings/sleep-sources
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, Smartphone, RefreshCw, AlertCircle, FlaskConical } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { GarminSettingsCard } from "@/components/garmin/GarminSettingsCard";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<SleepSource[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [pendingTimezone, setPendingTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [connectingSource, setConnectingSource] = useState<'apple_health' | null>(null);
  const [updatingTimezone, setUpdatingTimezone] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [testingSyncFor, setTestingSyncFor] = useState<string | null>(null);
  const [garminOauthError, setGarminOauthError] = useState<string | null>(null);

  const [backfillStatus, setBackfillStatus] = useState<'idle' | 'requesting' | 'requested' | 'error'>('idle');

  // Trigger backfill request for Garmin
  const requestGarminBackfill = async () => {
    setBackfillStatus('requesting');
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return;

      const response = await supabase.functions.invoke('garmin-backfill', {
        body: { days: 30 },
      });

      if (response.error) {
        console.error('Backfill request failed:', response.error);
        setBackfillStatus('error');
        return;
      }

      const data = response.data as { status: string };
      if (data.status === 'requested' || data.status === 'already_requested') {
        setBackfillStatus('requested');
        toast({
          title: "Requesting sleep history",
          description: "Your last 30 days of sleep data will arrive within a few hours.",
        });
      }
    } catch (err) {
      console.error('Backfill error:', err);
      setBackfillStatus('error');
    }
  };

  // Track if we need to trigger backfill after auth is ready
  const [pendingBackfill, setPendingBackfill] = useState(false);

  // Handle URL params for Garmin OAuth results - only parse and clean URL
  useEffect(() => {
    const connected = searchParams.get('connected');
    const garminSuccess = searchParams.get('garmin');
    const error = searchParams.get('error');

    // Handle new OAuth 2.0 success param
    if (garminSuccess === 'success') {
      toast({
        title: "Garmin connected",
        description: "Requesting your sleep history...",
      });
      // Mark that we need backfill once auth is ready
      setPendingBackfill(true);
      // Clean up URL
      searchParams.delete('garmin');
      setSearchParams(searchParams, { replace: true });
    }

    // Legacy param handling
    if (connected === 'garmin') {
      toast({
        title: "Garmin connected",
        description: "Requesting your sleep history...",
      });
      setPendingBackfill(true);
      searchParams.delete('connected');
      setSearchParams(searchParams, { replace: true });
    }

    if (error) {
      setGarminOauthError(error);
      searchParams.delete('error');
      searchParams.delete('reason');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Trigger backfill once auth is ready and we have a pending request
  useEffect(() => {
    if (pendingBackfill && userId) {
      setPendingBackfill(false);
      requestGarminBackfill();
    }
  }, [pendingBackfill, userId]);

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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && userId) {
        loadSources(userId);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userId, loadSources]);

  const getSourceForType = (type: 'apple_health' | 'garmin'): SleepSource | undefined => {
    return sources.find(s => s.source === type);
  };

  // Apple Health connect (simplified - no OAuth flow yet)
  const handleAppleHealthConnect = async () => {
    if (!userId || !pendingTimezone) {
      toast({ title: "Timezone required", description: "Please select a timezone first", variant: "destructive" });
      return;
    }

    const existingSource = getSourceForType('apple_health');
    
    if (existingSource?.status === 'connected') {
      toast({ title: "Already connected", description: "This source is already active" });
      return;
    }
    
    if (existingSource?.status === 'pending') {
      toast({ title: "Already pending", description: "Waiting for first sync to complete" });
      return;
    }

    setConnectingSource('apple_health');

    const { error } = await supabase
      .from('sleep_sources')
      .upsert(
        {
          user_id: userId,
          source: 'apple_health',
          status: 'pending',
          user_timezone: pendingTimezone,
          revoked_at: null,
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
      toast({ 
        title: "Source added", 
        description: "Apple Health is pending. It will activate when first sync completes." 
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
        const errorData = response.error as { message?: string };
        const message = errorData.message || 'Test sync failed';
        
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
          <h1 className="text-2xl font-semibold tracking-tight">Sleep Data Sources</h1>
          <p className="text-muted-foreground mt-1">
            Connect your wearable to automatically import sleep data for your personalized sleep plan.
          </p>
        </div>

        {/* Garmin Card - New v1 component */}
        <GarminSettingsCard
          source={garminSource || null}
          userId={userId!}
          onRefresh={() => loadSources(userId!)}
          oauthError={garminOauthError}
        />

        {/* Apple Health Card - Existing pattern, simplified */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-muted">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-lg">Apple Health</CardTitle>
                  <CardDescription className="text-sm">
                    {appleSource ? getStatusExplanation(appleSource) : 'Coming soon — native app integration required'}
                  </CardDescription>
                </div>
              </div>
              {appleSource && getStatusBadge(appleSource.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {appleSource && appleSource.status !== 'revoked' && (
              <>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground min-w-20">Timezone</span>
                  <Select
                    value={appleSource.user_timezone || ''}
                    onValueChange={(val) => handleTimezoneUpdate(appleSource, val)}
                    disabled={updatingTimezone === appleSource.id}
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
                  {updatingTimezone === appleSource.id && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <Separator />
              </>
            )}
            
            <div className="flex justify-between items-center">
              {/* Dev-only Test Sync button */}
              {IS_DEV && appleSource && appleSource.status !== 'revoked' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTestSync(appleSource)}
                  disabled={testingSyncFor === appleSource.id}
                  className="text-muted-foreground"
                >
                  {testingSyncFor === appleSource.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <FlaskConical className="h-4 w-4 mr-2" />
                  )}
                  Test Sync
                </Button>
              )}
              
              {(!IS_DEV || !appleSource || appleSource.status === 'revoked') && <div />}
              
              <div className="flex gap-2">
                {appleSource?.status === 'revoked' && (
                  <Button
                    variant="outline"
                    onClick={handleAppleHealthConnect}
                    disabled={connectingSource === 'apple_health'}
                  >
                    {connectingSource === 'apple_health' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Reconnect
                  </Button>
                )}
                {appleSource && appleSource.status !== 'revoked' && (
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDisconnect(appleSource)}
                    disabled={disconnecting === appleSource.id}
                  >
                    {disconnecting === appleSource.id && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Disconnect
                  </Button>
                )}
                {!appleSource && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    Native app coming soon
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Button variant="ghost" onClick={() => navigate("/sleep-coach")} className="text-muted-foreground">
          ← Back to Sleep Coach
        </Button>
      </div>
    </div>
  );
};

export default SleepSources;
