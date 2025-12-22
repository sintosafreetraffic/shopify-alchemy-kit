/**
 * Context Tab Component
 * 
 * Displays Pinterest context tracking status within the analytics dashboard.
 * Shows local vs server state, context stats, and recent context captures.
 * 
 * NEVER displays raw IP or UA - only boolean indicators.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getContextId } from '@/lib/contextTracking';
import { getConsentStatus } from '@/lib/consent';
import { getAttribution, getEpik } from '@/lib/attribution';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Fingerprint,
  Globe,
  Clock,
  TrendingUp,
  Shield
} from 'lucide-react';

interface ContextData {
  context_id: string | null;
  consent_status: string;
  has_epik: boolean;
  has_ip: boolean;
  has_ua: boolean;
  has_landing_page: boolean;
  has_utm_source: boolean;
  updated_at: string | null;
  expires_at: string | null;
}

interface ContextStats {
  total_contexts: number;
  with_epik: number;
  with_ip: number;
  with_ua: number;
  granted_consent: number;
  denied_consent: number;
}

interface RecentContext {
  context_id: string;
  consent_status: string;
  has_epik: boolean;
  has_ip: boolean;
  has_ua: boolean;
  has_landing_page: boolean;
  has_utm_source: boolean;
  updated_at: string;
  created_at: string;
}

interface ContextTabProps {
  days: string;
}

const ContextTab: React.FC<ContextTabProps> = ({ days }) => {
  const [localData, setLocalData] = useState<ContextData | null>(null);
  const [serverData, setServerData] = useState<ContextData | null>(null);
  const [stats, setStats] = useState<ContextStats | null>(null);
  const [recentContexts, setRecentContexts] = useState<RecentContext[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get local data
      const contextId = getContextId();
      const consentStatus = getConsentStatus();
      const attribution = getAttribution();
      const epik = getEpik();

      const local: ContextData = {
        context_id: contextId,
        consent_status: consentStatus,
        has_epik: !!epik,
        has_ip: false, // Not available locally
        has_ua: false, // Not available locally
        has_landing_page: !!attribution.landing_page,
        has_utm_source: !!attribution.utm_source,
        updated_at: null,
        expires_at: null,
      };
      setLocalData(local);

      // Calculate date range
      const daysNum = parseInt(days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);

      // Fetch data in parallel
      const [contextResult, serverContextResult] = await Promise.all([
        // Fetch recent contexts for the period
        supabase
          .from('pinterest_context')
          .select('*')
          .gte('created_at', startDate.toISOString())
          .order('updated_at', { ascending: false })
          .limit(50),
        // Fetch current user's context
        contextId ? supabase
          .from('pinterest_context')
          .select('*')
          .eq('context_id', contextId)
          .maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      // Process server data for current context
      if (serverContextResult.data) {
        const data = serverContextResult.data;
        const server: ContextData = {
          context_id: data.context_id,
          consent_status: data.consent_status,
          has_epik: !!data.epik,
          has_ip: !!data.client_ip_address,
          has_ua: !!data.client_user_agent,
          has_landing_page: !!data.landing_page,
          has_utm_source: !!data.utm_source,
          updated_at: data.updated_at,
          expires_at: data.expires_at,
        };
        setServerData(server);
      } else {
        setServerData(null);
      }

      // Process recent contexts
      if (contextResult.data) {
        const contexts = contextResult.data;
        
        // Calculate stats
        const statsData: ContextStats = {
          total_contexts: contexts.length,
          with_epik: contexts.filter(c => c.epik).length,
          with_ip: contexts.filter(c => c.client_ip_address).length,
          with_ua: contexts.filter(c => c.client_user_agent).length,
          granted_consent: contexts.filter(c => c.consent_status === 'granted').length,
          denied_consent: contexts.filter(c => c.consent_status === 'denied').length,
        };
        setStats(statsData);

        // Map to recent contexts (sanitized - no raw IP/UA)
        const recent: RecentContext[] = contexts.slice(0, 20).map(c => ({
          context_id: c.context_id,
          consent_status: c.consent_status,
          has_epik: !!c.epik,
          has_ip: !!c.client_ip_address,
          has_ua: !!c.client_user_agent,
          has_landing_page: !!c.landing_page,
          has_utm_source: !!c.utm_source,
          updated_at: c.updated_at,
          created_at: c.created_at,
        }));
        setRecentContexts(recent);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const StatusBadge = ({ value, label }: { value: boolean; label: string }) => (
    <div className="flex items-center gap-2">
      {value ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive" />
      )}
      <span className="text-sm">{label}</span>
    </div>
  );

  const ConsentBadge = ({ status }: { status: string }) => {
    if (status === 'granted') {
      return <Badge variant="default" className="bg-green-600">Granted</Badge>;
    } else if (status === 'denied') {
      return <Badge variant="destructive">Denied</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Pinterest Context Tracking</h3>
          <Badge variant="outline" className="text-xs">First-Party Context</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-destructive/50 bg-destructive/5">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <span className="text-destructive text-sm">{error}</span>
          </div>
        </Card>
      )}

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total_contexts}</p>
                <p className="text-xs text-muted-foreground">Total Contexts</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.with_epik}</p>
                <p className="text-xs text-muted-foreground">With Epik</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.with_ip}</p>
                <p className="text-xs text-muted-foreground">With IP</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.with_ua}</p>
                <p className="text-xs text-muted-foreground">With UA</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.granted_consent}</p>
                <p className="text-xs text-muted-foreground">Consent Granted</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.denied_consent}</p>
                <p className="text-xs text-muted-foreground">Consent Denied</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Match Rate Calculation */}
      {stats && stats.total_contexts > 0 && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Match Signal Coverage</h3>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-pink-50 dark:bg-pink-900/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Epik Rate</p>
              <p className="text-2xl font-bold text-pink-600">
                {((stats.with_epik / stats.total_contexts) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Pinterest attribution</p>
            </div>
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">IP Rate</p>
              <p className="text-2xl font-bold text-emerald-600">
                {((stats.with_ip / stats.total_contexts) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Match signal 1</p>
            </div>
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">UA Rate</p>
              <p className="text-2xl font-bold text-blue-600">
                {((stats.with_ua / stats.total_contexts) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Match signal 2</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-center">
              <p className="text-xs text-muted-foreground mb-1">Consent Rate</p>
              <p className="text-2xl font-bold text-green-600">
                {((stats.granted_consent / stats.total_contexts) * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Granted consent</p>
            </div>
          </div>
        </Card>
      )}

      {/* Current Session State */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Local State */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Your Local State</h3>
            <Badge variant="outline" className="text-xs">Browser</Badge>
          </div>
          {localData ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase">Context ID</label>
                <p className="font-mono text-xs break-all bg-muted/30 p-2 rounded mt-1">
                  {localData.context_id || <span className="text-muted-foreground italic">Not set</span>}
                </p>
              </div>
              
              <div>
                <label className="text-xs text-muted-foreground uppercase">Consent Status</label>
                <div className="mt-1">
                  <ConsentBadge status={localData.consent_status} />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase">Attribution</label>
                <StatusBadge value={localData.has_epik} label="Pinterest Click ID (epik)" />
                <StatusBadge value={localData.has_landing_page} label="Landing Page" />
                <StatusBadge value={localData.has_utm_source} label="UTM Source" />
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground italic">Loading...</p>
          )}
        </Card>

        {/* Server State */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Your Server State</h3>
            <Badge variant="outline" className="text-xs">pinterest_context</Badge>
          </div>
          {serverData ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase">Consent Status</label>
                <div className="mt-1">
                  <ConsentBadge status={serverData.consent_status} />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase">Attribution</label>
                <StatusBadge value={serverData.has_epik} label="Pinterest Click ID (epik)" />
                <StatusBadge value={serverData.has_landing_page} label="Landing Page" />
                <StatusBadge value={serverData.has_utm_source} label="UTM Source" />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase">Match Signals</label>
                <StatusBadge value={serverData.has_ip} label="Client IP Address" />
                <StatusBadge value={serverData.has_ua} label="Client User Agent" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-xs text-muted-foreground uppercase">Last Updated</label>
                  <p className="text-xs">
                    {serverData.updated_at 
                      ? new Date(serverData.updated_at).toLocaleString() 
                      : <span className="text-muted-foreground italic">Unknown</span>}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground uppercase">Expires</label>
                  <p className="text-xs">
                    {serverData.expires_at 
                      ? new Date(serverData.expires_at).toLocaleString() 
                      : <span className="text-muted-foreground italic">Unknown</span>}
                  </p>
                </div>
              </div>
            </div>
          ) : localData?.context_id ? (
            <div className="text-muted-foreground italic text-sm">
              <p>No server record found.</p>
              <p className="text-xs mt-2">Context may not have been captured yet, or RLS is blocking access.</p>
            </div>
          ) : (
            <p className="text-muted-foreground italic text-sm">No context_id set locally</p>
          )}
        </Card>
      </div>

      {/* Recent Contexts Table */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Recent Contexts</h3>
          <Badge variant="outline" className="text-xs">Last {days} days</Badge>
        </div>
        <ScrollArea className="h-[300px]">
          {recentContexts.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No context data found for this period.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Context ID</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Consent</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">Epik</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">IP</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">UA</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground text-xs">UTM</th>
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground text-xs">Updated</th>
                </tr>
              </thead>
              <tbody>
                {recentContexts.map((ctx) => (
                  <tr key={ctx.context_id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-2 px-2">
                      <code className="text-xs font-mono bg-muted/50 px-1 rounded">
                        {ctx.context_id.slice(0, 8)}...
                      </code>
                    </td>
                    <td className="py-2 px-2">
                      <ConsentBadge status={ctx.consent_status} />
                    </td>
                    <td className="py-2 px-2 text-center">
                      {ctx.has_epik ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground inline" />
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {ctx.has_ip ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground inline" />
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {ctx.has_ua ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground inline" />
                      )}
                    </td>
                    <td className="py-2 px-2 text-center">
                      {ctx.has_utm_source ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 inline" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground inline" />
                      )}
                    </td>
                    <td className="py-2 px-2 text-xs text-muted-foreground">
                      {new Date(ctx.updated_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </ScrollArea>
      </Card>

      {/* Info Box */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">How Context Tracking Works</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-6 text-sm text-muted-foreground">
          <div className="space-y-3">
            <div>
              <strong className="text-foreground">Context ID:</strong>
              <p>A unique identifier stored in your browser that persists across sessions (30 days). Used to join checkout data with first-party context.</p>
            </div>
            <div>
              <strong className="text-foreground">Match Signals:</strong>
              <p>IP address and User Agent are captured server-side when consent is granted. These improve Pinterest's ability to match conversions to ad clicks.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <strong className="text-foreground">Attribution:</strong>
              <p>UTM parameters use first-touch (never overwritten). Pinterest click ID (epik) uses last-touch (latest click wins).</p>
            </div>
            <div>
              <strong className="text-foreground">Privacy:</strong>
              <p>Raw IP and User Agent are never displayed here. Only boolean indicators show whether data is present. Data is only stored with user consent.</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ContextTab;
