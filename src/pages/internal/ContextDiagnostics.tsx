/**
 * Context Diagnostics Page
 * 
 * Internal diagnostics for Pinterest context tracking.
 * Shows context_id, consent status, and whether match signals are captured.
 * 
 * NEVER displays raw IP or UA - only boolean indicators.
 */

import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getContextId } from '@/lib/contextTracking';
import { getConsentStatus } from '@/lib/consent';
import { getAttribution, getEpik } from '@/lib/attribution';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

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

const ContextDiagnostics = () => {
  const [localData, setLocalData] = useState<ContextData | null>(null);
  const [serverData, setServerData] = useState<ContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
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

      // Fetch server data if we have a context_id
      if (contextId) {
        // Use service role key from env (this is for internal diagnostics only)
        const { data, error: fetchError } = await supabase
          .from('pinterest_context')
          .select('*')
          .eq('context_id', contextId)
          .maybeSingle();

        if (fetchError) {
          console.warn('[ContextDiagnostics] Server fetch error:', fetchError);
          // Don't show error to user - RLS may block access
        } else if (data) {
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
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Context Diagnostics</h1>
          <p className="text-muted-foreground">Pinterest CAPI context tracking status</p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <span className="text-destructive">{error}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Local State */}
        <Card>
          <CardHeader>
            <CardTitle>Local State</CardTitle>
            <CardDescription>Data stored in browser (localStorage/cookie)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {localData ? (
              <>
                <div>
                  <label className="text-xs text-muted-foreground uppercase">Context ID</label>
                  <p className="font-mono text-sm break-all">
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
              </>
            ) : (
              <p className="text-muted-foreground italic">Loading...</p>
            )}
          </CardContent>
        </Card>

        {/* Server State */}
        <Card>
          <CardHeader>
            <CardTitle>Server State</CardTitle>
            <CardDescription>Data stored in pinterest_context table</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serverData ? (
              <>
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
                
                <div>
                  <label className="text-xs text-muted-foreground uppercase">Last Updated</label>
                  <p className="text-sm">
                    {serverData.updated_at 
                      ? new Date(serverData.updated_at).toLocaleString() 
                      : <span className="text-muted-foreground italic">Unknown</span>}
                  </p>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground uppercase">Expires</label>
                  <p className="text-sm">
                    {serverData.expires_at 
                      ? new Date(serverData.expires_at).toLocaleString() 
                      : <span className="text-muted-foreground italic">Unknown</span>}
                  </p>
                </div>
              </>
            ) : localData?.context_id ? (
              <div className="text-muted-foreground italic">
                <p>No server record found.</p>
                <p className="text-xs mt-2">Context may not have been captured yet, or RLS is blocking access.</p>
              </div>
            ) : (
              <p className="text-muted-foreground italic">No context_id set locally</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">How It Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Context ID:</strong> A unique identifier stored in your browser that persists across sessions (30 days).
          </p>
          <p>
            <strong>Match Signals:</strong> IP address and User Agent are captured server-side when consent is granted. 
            These improve Pinterest's ability to match conversions to ad clicks.
          </p>
          <p>
            <strong>Attribution:</strong> UTM parameters and Pinterest click ID (epik) are captured on first visit. 
            Epik uses last-touch (latest click wins), while UTMs use first-touch (never overwritten).
          </p>
          <p>
            <strong>Privacy:</strong> Raw IP and User Agent are never displayed here. Only boolean indicators show whether data is present.
          </p>
        </CardContent>
      </Card>

      {/* Cleanup Note - purge job is now implemented */}
      <div className="mt-6 p-4 bg-muted rounded-md">
        <h3 className="font-semibold mb-2">Data Retention</h3>
        <p className="text-sm text-muted-foreground">
          Expired context rows are automatically purged daily via the <code className="bg-background px-1 rounded">purge-pinterest-context</code> edge function.
        </p>
      </div>
    </div>
  );
};

export default ContextDiagnostics;
