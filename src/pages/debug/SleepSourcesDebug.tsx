/**
 * Sleep Sources Debug Page
 * Internal diagnostics for sleep data integration
 * Route: /debug/sleep-sources
 * 
 * Access: 
 * - Production: admin role only
 * - Non-prod: admin OR ?debug=1 AND DEV mode
 */
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Loader2, Shield, RefreshCw, Database, Clock, AlertTriangle } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface SleepSourceDebug {
  id: string;
  user_id: string;
  source: string;
  status: string;
  user_timezone: string | null;
  connected_at: string | null;
  last_sync_at: string | null;
  created_at: string;
}

interface SleepNightDebug {
  id: string;
  night_date: string;
  source: string;
  total_sleep_minutes: number | null;
  is_split_segment: boolean | null;
  is_test: boolean;
  created_at: string;
}

interface RateLimitDebug {
  user_id: string;
  source: string;
  request_count: number;
  window_start: string;
}

const SleepSourcesDebug = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [accessChecking, setAccessChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Debug data
  const [sources, setSources] = useState<SleepSourceDebug[]>([]);
  const [recentNights, setRecentNights] = useState<SleepNightDebug[]>([]);
  const [rateLimits, setRateLimits] = useState<RateLimitDebug[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);

  const isDev = import.meta.env.DEV;
  const debugParam = searchParams.get('debug') === '1';

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    setAccessChecking(true);

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      // In dev with debug param, allow viewing
      if (isDev && debugParam) {
        setHasAccess(true);
        setAccessChecking(false);
        // Load public data only
        return;
      }
      navigate("/auth?returnTo=/debug/sleep-sources");
      return;
    }

    setUserId(session.user.id);

    // Check admin role
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: session.user.id,
      _role: 'admin'
    });

    // Production: admin only
    // Non-prod: admin OR debug param
    if (isAdmin || (isDev && debugParam)) {
      setHasAccess(true);
      loadDebugData(session.user.id, !!isAdmin);
    } else {
      setHasAccess(false);
    }

    setAccessChecking(false);
  };

  const loadDebugData = async (uid: string, isAdmin: boolean) => {
    setLoading(true);

    try {
      // Load sources for current user (or all if admin)
      const sourcesQuery = isAdmin 
        ? supabase.from('sleep_sources').select('*').order('created_at', { ascending: false }).limit(50)
        : supabase.from('sleep_sources').select('*').eq('user_id', uid);

      const { data: sourcesData } = await sourcesQuery;
      setSources((sourcesData as SleepSourceDebug[]) || []);

      // Load recent sleep nights (include is_test for debug visibility)
      const nightsQuery = isAdmin
        ? supabase.from('sleep_nights').select('id, night_date, source, total_sleep_minutes, is_split_segment, is_test, created_at').order('created_at', { ascending: false }).limit(20)
        : supabase.from('sleep_nights').select('id, night_date, source, total_sleep_minutes, is_split_segment, is_test, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(10);

      const { data: nightsData } = await nightsQuery;
      setRecentNights((nightsData as SleepNightDebug[]) || []);

      // Load rate limits (admin sees all recent ones)
      if (isAdmin) {
        const windowStart = new Date();
        windowStart.setHours(windowStart.getHours() - 1);
        
        const { data: rateLimitData } = await supabase
          .from('sleep_intake_rate_limits')
          .select('*')
          .gte('window_start', windowStart.toISOString())
          .order('window_start', { ascending: false })
          .limit(20);
        
        setRateLimits((rateLimitData as RateLimitDebug[]) || []);
      }

      // Count split segments (duplicates indicator)
      const splitCount = (nightsData as SleepNightDebug[] || []).filter(n => n.is_split_segment).length;
      setDuplicateCount(splitCount);

    } catch (error) {
      console.error('Error loading debug data:', error);
    }

    setLoading(false);
  };

  const handleRefresh = () => {
    if (userId) {
      loadDebugData(userId, true);
    }
  };

  if (accessChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              This page requires admin privileges.
            </p>
            <Button onClick={() => navigate("/")}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <Database className="h-6 w-6" />
              Sleep Sources Debug
            </h1>
            <p className="text-muted-foreground mt-1">
              Internal diagnostics for sleep data integration
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{sources.length}</div>
                  <div className="text-sm text-muted-foreground">Connected Sources</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{recentNights.length}</div>
                  <div className="text-sm text-muted-foreground">Recent Nights</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{duplicateCount}</div>
                  <div className="text-sm text-muted-foreground">Split Segments</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-2xl font-bold">{rateLimits.reduce((sum, r) => sum + r.request_count, 0)}</div>
                  <div className="text-sm text-muted-foreground">Requests (1h)</div>
                </CardContent>
              </Card>
            </div>

            {/* Sources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sleep Sources</CardTitle>
                <CardDescription>Connected data sources and their status</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  {sources.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No sources connected</p>
                  ) : (
                    <div className="space-y-3">
                      {sources.map((source) => (
                        <div key={source.id} className="flex items-center justify-between text-sm border-b pb-2">
                          <div className="flex items-center gap-3">
                            <Badge variant={source.status === 'connected' ? 'default' : 'secondary'}>
                              {source.status}
                            </Badge>
                            <span className="font-mono">{source.source}</span>
                            <span className="text-muted-foreground">{source.user_timezone || 'No TZ'}</span>
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            {source.last_sync_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(source.last_sync_at), { addSuffix: true })}
                              </span>
                            )}
                            <span className="font-mono text-xs">{source.user_id.slice(0, 8)}...</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Recent Nights */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Sleep Nights</CardTitle>
                <CardDescription>Last 10-20 normalized sleep records</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {recentNights.length === 0 ? (
                    <p className="text-muted-foreground text-sm">No sleep nights recorded</p>
                  ) : (
                    <div className="space-y-2">
                      {recentNights.map((night) => (
                        <div key={night.id} className="flex items-center justify-between text-sm border-b pb-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono">{night.night_date}</span>
                            <Badge variant="outline">{night.source}</Badge>
                            {night.is_test && (
                              <Badge variant="outline" className="text-xs text-muted-foreground border-dashed">
                                TEST
                              </Badge>
                            )}
                            {night.is_split_segment && (
                              <Badge variant="secondary" className="text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Split
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            <span>{night.total_sleep_minutes ? `${Math.round(night.total_sleep_minutes / 60 * 10) / 10}h` : '-'}</span>
                            <span className="text-xs">{format(new Date(night.created_at), 'HH:mm')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Rate Limits */}
            {rateLimits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Rate Limit Usage</CardTitle>
                  <CardDescription>Current hour request counts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {rateLimits.map((rl, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="font-mono text-xs">{rl.user_id.slice(0, 8)}... / {rl.source}</span>
                        <div className="flex items-center gap-2">
                          <span className={rl.request_count >= 80 ? 'text-destructive font-medium' : ''}>
                            {rl.request_count}/100
                          </span>
                          {rl.request_count >= 80 && <AlertTriangle className="h-4 w-4 text-destructive" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button variant="ghost" onClick={() => navigate("/")} className="text-muted-foreground">
              ← Back to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default SleepSourcesDebug;
