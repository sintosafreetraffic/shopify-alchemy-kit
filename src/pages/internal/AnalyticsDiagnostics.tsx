import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  getAllProviderStatuses,
  getEventLog,
  clearEventLog,
  sendTestEvent,
  FUNNEL_EVENT_TABLE,
  getEnvironment,
  areScriptsLoaded,
  ProviderStatus,
  EventLogEntry,
} from '@/lib/analyticsRegistry';
import { Activity, CheckCircle, XCircle, AlertTriangle, RefreshCw, Trash2, Send, Shield, Wifi, Clock } from 'lucide-react';

// Rate limiting for test events
const lastTestEvent: Record<string, number> = {};
const TEST_COOLDOWN_MS = 2000;

export default function AnalyticsDiagnostics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>([]);
  const [eventLog, setEventLog] = useState<EventLogEntry[]>([]);
  const [webhookData, setWebhookData] = useState<any[]>([]);
  const [checkoutStats, setCheckoutStats] = useState<any>(null);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(false);
  const [scriptsLoaded, setScriptsLoaded] = useState(false);
  const [environment, setEnvironment] = useState<string>('unknown');

  // Authorization check
  useEffect(() => {
    const checkAuth = async () => {
      // Allow access with ?debug=1 in non-production
      const debugParam = searchParams.get('debug');
      const env = getEnvironment();
      setEnvironment(env);
      
      if (debugParam === '1' && env !== 'production') {
        setIsAuthorized(true);
        return;
      }
      
      // Otherwise require admin role
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsAuthorized(false);
        return;
      }
      
      const { data: hasRole } = await supabase.rpc('has_role', {
        _role: 'admin',
        _user_id: user.id,
      });
      
      setIsAuthorized(hasRole === true);
    };
    
    checkAuth();
  }, [searchParams]);

  // Refresh provider statuses
  const refreshStatuses = useCallback(() => {
    setProviderStatuses(getAllProviderStatuses());
    setEventLog(getEventLog());
    setScriptsLoaded(areScriptsLoaded());
  }, []);

  // Initial load and periodic refresh
  useEffect(() => {
    if (isAuthorized) {
      refreshStatuses();
      const interval = setInterval(refreshStatuses, 3000);
      return () => clearInterval(interval);
    }
  }, [isAuthorized, refreshStatuses]);

  // Fetch webhook data
  const fetchWebhookData = async () => {
    setIsLoadingWebhooks(true);
    try {
      // Fetch checkout analytics
      const { data: checkoutData } = await supabase
        .from('checkout_analytics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      setWebhookData(checkoutData || []);
      
      // Calculate checkout stats
      if (checkoutData && checkoutData.length > 0) {
        const initiated = checkoutData.filter(e => e.event_type === 'checkout_initiated').length;
        const success = checkoutData.filter(e => e.event_type === 'checkout_success').length;
        const timeout = checkoutData.filter(e => e.event_type === 'checkout_timeout').length;
        const errors = checkoutData.filter(e => e.event_type === 'checkout_error').length;
        
        setCheckoutStats({
          total: checkoutData.length,
          initiated,
          success,
          timeout,
          errors,
          successRate: initiated > 0 ? ((success / initiated) * 100).toFixed(1) : 'N/A',
        });
      }
    } catch (e) {
      console.error('Failed to fetch webhook data:', e);
    } finally {
      setIsLoadingWebhooks(false);
    }
  };

  useEffect(() => {
    if (isAuthorized) {
      fetchWebhookData();
    }
  }, [isAuthorized]);

  // Handle test event
  const handleTestEvent = (eventType: 'page_view' | 'add_to_cart' | 'begin_checkout' | 'identify', provider: string) => {
    const key = `${eventType}-${provider}`;
    const now = Date.now();
    
    if (lastTestEvent[key] && now - lastTestEvent[key] < TEST_COOLDOWN_MS) {
      toast.error('Please wait before sending another test event');
      return;
    }
    
    lastTestEvent[key] = now;
    const result = sendTestEvent(eventType, provider);
    
    if (result.success) {
      toast.success(`Test ${eventType} sent to ${provider}`);
    } else {
      toast.error(`Failed: ${result.error}`);
    }
    
    refreshStatuses();
  };

  // Clear log
  const handleClearLog = () => {
    clearEventLog();
    refreshStatuses();
    toast.success('Event log cleared');
  };

  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-[#F7F7F6] flex items-center justify-center">
        <div className="text-[#6F6A66]">Checking authorization...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F7F7F6] flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>
              This page requires admin access or ?debug=1 in non-production environments.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/auth')} variant="outline">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F6] py-8">
      <div className="container max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-[#2D2B29] mb-2">Analytics Diagnostics</h1>
          <p className="text-[#6F6A66]">
            Monitor tracking health, test events, and validate funnel configuration.
          </p>
          <div className="flex gap-2 mt-4">
            <Badge variant="outline" className="bg-white">
              Environment: {environment}
            </Badge>
            <Badge variant={scriptsLoaded ? 'default' : 'secondary'} className={scriptsLoaded ? 'bg-emerald-100 text-emerald-800' : ''}>
              {scriptsLoaded ? 'Scripts Loaded' : 'Scripts Pending'}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="status" className="space-y-6">
          <TabsList className="bg-white border border-[#E6E6E4]">
            <TabsTrigger value="status">Provider Status</TabsTrigger>
            <TabsTrigger value="test">Test Console</TabsTrigger>
            <TabsTrigger value="log">Event Log</TabsTrigger>
            <TabsTrigger value="funnel">Funnel Map</TabsTrigger>
            <TabsTrigger value="webhooks">Webhook Health</TabsTrigger>
          </TabsList>

          {/* Provider Status Tab */}
          <TabsContent value="status" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={refreshStatuses}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {providerStatuses.map((status) => (
                <Card key={status.name} className="bg-white border-[#E6E6E4]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{status.name}</CardTitle>
                      {status.initialized ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6F6A66]">Initialized</span>
                      <span className={status.initialized ? 'text-emerald-600' : 'text-amber-500'}>
                        {status.initialized ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6F6A66]">Script Loaded</span>
                      <span className={status.scriptLoaded ? 'text-emerald-600' : 'text-[#A7A29C]'}>
                        {status.scriptLoaded ? 'Yes' : 'Pending'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6F6A66]">Last Event</span>
                      <span className="text-[#2D2B29] text-xs">
                        {status.lastEventAt ? new Date(status.lastEventAt).toLocaleTimeString() : '-'}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#6F6A66]">Last Route</span>
                      <span className="text-[#2D2B29] text-xs truncate max-w-[120px]">
                        {status.lastRoute || '-'}
                      </span>
                    </div>
                    {status.blockers.length > 0 && (
                      <div className="pt-2 border-t border-[#E6E6E4]">
                        {status.blockers.map((blocker, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-amber-600">
                            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{blocker}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Audit Summary */}
            <Card className="bg-white border-[#E6E6E4]">
              <CardHeader>
                <CardTitle className="text-lg">Tracking Health Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-[#2D2B29]">Providers Installed</h4>
                    <ul className="space-y-1 text-[#6F6A66]">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        Klaviyo Onsite (ThHaCi) - index.html:57-61
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        Pinterest Tag (2612541212823) - index.html:70-73
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        Microsoft Clarity (ue7ibjdmdj) - index.html:63-68
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-[#A7A29C]" />
                        Google Analytics / GTM - Not installed
                      </li>
                      <li className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-[#A7A29C]" />
                        Meta Pixel - Not installed
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium text-[#2D2B29]">Key Findings</h4>
                    <ul className="space-y-1 text-[#6F6A66]">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        Pinterest checkout events blocked (intentional)
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        Scripts deferred for TTI optimization
                      </li>
                      <li className="flex items-center gap-2">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        SPA route tracking: Manual implementation needed
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        Purchase events: Server-side only (Shopify webhook)
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Console Tab */}
          <TabsContent value="test" className="space-y-4">
            <Card className="bg-white border-[#E6E6E4]">
              <CardHeader>
                <CardTitle className="text-lg">Test Event Console</CardTitle>
                <CardDescription>
                  Dispatch test events to verify provider connectivity. Events are rate-limited to prevent spam.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Pinterest Tests */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-[#2D2B29] flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Pinterest
                    </h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleTestEvent('page_view', 'Pinterest')}
                      >
                        <Send className="h-3 w-3 mr-2" />
                        pagevisit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleTestEvent('add_to_cart', 'Pinterest')}
                      >
                        <Send className="h-3 w-3 mr-2" />
                        addtocart
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleTestEvent('begin_checkout', 'Pinterest')}
                      >
                        <Send className="h-3 w-3 mr-2" />
                        initiatecheckout
                      </Button>
                    </div>
                  </div>

                  {/* Klaviyo Tests */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-[#2D2B29] flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Klaviyo
                    </h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleTestEvent('page_view', 'Klaviyo')}
                      >
                        <Send className="h-3 w-3 mr-2" />
                        page_view (implicit)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleTestEvent('add_to_cart', 'Klaviyo')}
                      >
                        <Send className="h-3 w-3 mr-2" />
                        Added to Cart
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleTestEvent('begin_checkout', 'Klaviyo')}
                      >
                        <Send className="h-3 w-3 mr-2" />
                        Started Checkout
                      </Button>
                    </div>
                  </div>

                  {/* Clarity Tests */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-[#2D2B29] flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Clarity
                    </h4>
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => handleTestEvent('page_view', 'Clarity')}
                      >
                        <Send className="h-3 w-3 mr-2" />
                        page_view (auto)
                      </Button>
                      <p className="text-xs text-[#A7A29C] px-2">
                        Clarity automatically tracks page views and user sessions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">Safety Note</p>
                      <p>Test events use mock data and will not affect real analytics. Purchase events cannot be tested from this page.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Event Log Tab */}
          <TabsContent value="log" className="space-y-4">
            <Card className="bg-white border-[#E6E6E4]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Live Event Log</CardTitle>
                    <CardDescription>Last 50 tracked events across all providers</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleClearLog}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {eventLog.length === 0 ? (
                    <div className="text-center py-8 text-[#A7A29C]">
                      No events logged yet. Navigate the site or use the test console.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {eventLog.map((entry) => (
                        <div
                          key={entry.id}
                          className={`p-3 rounded-lg border ${
                            entry.success ? 'bg-white border-[#E6E6E4]' : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {entry.success ? (
                                <CheckCircle className="h-3 w-3 text-emerald-600" />
                              ) : (
                                <XCircle className="h-3 w-3 text-red-500" />
                              )}
                              <span className="font-medium text-sm text-[#2D2B29]">
                                {entry.eventName}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {entry.provider}
                              </Badge>
                            </div>
                            <span className="text-xs text-[#A7A29C]">
                              {new Date(entry.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          {entry.error && (
                            <p className="text-xs text-red-600 mt-1">{entry.error}</p>
                          )}
                          <pre className="text-xs text-[#6F6A66] mt-1 overflow-x-auto">
                            {JSON.stringify(entry.payload, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Funnel Map Tab */}
          <TabsContent value="funnel" className="space-y-4">
            <Card className="bg-white border-[#E6E6E4]">
              <CardHeader>
                <CardTitle className="text-lg">Funnel Event Truth Table</CardTitle>
                <CardDescription>
                  Canonical mapping of which events fire, where, and how they're deduplicated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#E6E6E4]">
                        <th className="text-left py-3 px-2 font-medium text-[#2D2B29]">Event</th>
                        <th className="text-left py-3 px-2 font-medium text-[#2D2B29]">Providers</th>
                        <th className="text-left py-3 px-2 font-medium text-[#2D2B29]">Data</th>
                        <th className="text-left py-3 px-2 font-medium text-[#2D2B29]">Location</th>
                        <th className="text-left py-3 px-2 font-medium text-[#2D2B29]">Deduplication</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FUNNEL_EVENT_TABLE.map((row, i) => (
                        <tr key={i} className="border-b border-[#E6E6E4] last:border-0">
                          <td className="py-3 px-2">
                            <span className="font-mono text-xs bg-[#F7F7F6] px-2 py-1 rounded">
                              {row.event}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-[#6F6A66] text-xs">
                            {row.providers.join(', ')}
                          </td>
                          <td className="py-3 px-2 text-[#6F6A66] text-xs">
                            {row.data.join(', ')}
                          </td>
                          <td className="py-3 px-2 text-[#6F6A66] text-xs max-w-[200px] truncate">
                            {row.location}
                          </td>
                          <td className="py-3 px-2 text-[#6F6A66] text-xs">
                            {row.deduplication}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhook Health Tab */}
          <TabsContent value="webhooks" className="space-y-4">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={fetchWebhookData} disabled={isLoadingWebhooks}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingWebhooks ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            {/* Checkout Stats */}
            {checkoutStats && (
              <Card className="bg-white border-[#E6E6E4]">
                <CardHeader>
                  <CardTitle className="text-lg">Checkout Analytics Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center p-3 bg-[#F7F7F6] rounded-lg">
                      <div className="text-2xl font-semibold text-[#2D2B29]">{checkoutStats.total}</div>
                      <div className="text-xs text-[#6F6A66]">Total Events</div>
                    </div>
                    <div className="text-center p-3 bg-[#F7F7F6] rounded-lg">
                      <div className="text-2xl font-semibold text-[#2D2B29]">{checkoutStats.initiated}</div>
                      <div className="text-xs text-[#6F6A66]">Initiated</div>
                    </div>
                    <div className="text-center p-3 bg-emerald-50 rounded-lg">
                      <div className="text-2xl font-semibold text-emerald-600">{checkoutStats.success}</div>
                      <div className="text-xs text-[#6F6A66]">Success</div>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                      <div className="text-2xl font-semibold text-amber-600">{checkoutStats.timeout}</div>
                      <div className="text-xs text-[#6F6A66]">Timeout</div>
                    </div>
                    <div className="text-center p-3 bg-[#F7F7F6] rounded-lg">
                      <div className="text-2xl font-semibold text-[#2D2B29]">{checkoutStats.successRate}%</div>
                      <div className="text-xs text-[#6F6A66]">Success Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Events */}
            <Card className="bg-white border-[#E6E6E4]">
              <CardHeader>
                <CardTitle className="text-lg">Recent Checkout Events</CardTitle>
                <CardDescription>Last 10 checkout-related events from the database</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {webhookData.length === 0 ? (
                    <div className="text-center py-8 text-[#A7A29C]">
                      No checkout events recorded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {webhookData.map((event: any) => (
                        <div
                          key={event.id}
                          className="p-3 rounded-lg border border-[#E6E6E4] bg-white"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  event.event_type === 'checkout_success'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : event.event_type === 'checkout_timeout'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : event.event_type === 'checkout_error'
                                    ? 'bg-red-50 text-red-700 border-red-200'
                                    : ''
                                }
                              >
                                {event.event_type}
                              </Badge>
                              <span className="text-xs text-[#A7A29C]">
                                {event.device_type}
                              </span>
                            </div>
                            <span className="text-xs text-[#A7A29C] flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(event.created_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-[#6F6A66]">
                            <div>
                              <span className="text-[#A7A29C]">Duration:</span>{' '}
                              {event.duration_ms ? `${event.duration_ms}ms` : '-'}
                            </div>
                            <div>
                              <span className="text-[#A7A29C]">Retries:</span>{' '}
                              {event.retry_count ?? 0}
                            </div>
                            <div>
                              <span className="text-[#A7A29C]">Session:</span>{' '}
                              {event.session_id?.substring(0, 8)}...
                            </div>
                          </div>
                          {event.error_message && (
                            <p className="text-xs text-red-600 mt-2">{event.error_message}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Reconciliation Note */}
            <Card className="bg-white border-[#E6E6E4]">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Wifi className="h-5 w-5" />
                  Reconciliation Strategy
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-[#6F6A66] space-y-3">
                <p>
                  <strong className="text-[#2D2B29]">Source of Truth:</strong> Shopify orders are the canonical conversion source.
                  Client-side events (Clarity sessions, Pinterest pagevisits) are engagement metrics, not conversions.
                </p>
                <p>
                  <strong className="text-[#2D2B29]">Attribution Flow:</strong> Pinterest epik click ID is captured on landing,
                  stored in localStorage/cookie, written to Shopify cart attributes before checkout, and extracted by the
                  shopify-order-webhook for server-side Pinterest Conversions API.
                </p>
                <p>
                  <strong className="text-[#2D2B29]">Deduplication:</strong> Purchase events use order_id as the canonical key.
                  Client-side checkout events are intentionally blocked to prevent double-counting.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
