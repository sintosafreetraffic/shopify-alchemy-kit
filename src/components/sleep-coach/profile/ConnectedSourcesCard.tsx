// Connected wearable sources card for Sleep Coach profile
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Watch, Plus, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface SleepSource {
  id: string;
  source: string;
  status: string;
  connected_at: string | null;
  last_sync_at: string | null;
}

interface ConnectedSourcesCardProps {
  userId: string;
}

export function ConnectedSourcesCard({ userId }: ConnectedSourcesCardProps) {
  const [sources, setSources] = useState<SleepSource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSources = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('sleep_sources')
        .select('id, source, status, connected_at, last_sync_at')
        .eq('user_id', userId);
      
      if (!error && data) {
        setSources(data);
      }
    } catch (error) {
      console.error('Failed to fetch sleep sources:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchSources();
    }
  }, [userId, fetchSources]);

  const getSourceDisplay = (source: string) => {
    switch (source) {
      case 'garmin':
        return { name: 'Garmin', icon: '⌚' };
      case 'apple_health':
        return { name: 'Apple Health', icon: '🍎' };
      default:
        return { name: source, icon: '📱' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge 
            variant="outline" 
            className="font-normal border-0 text-xs gap-1"
            style={{ 
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              color: 'rgba(34, 197, 94, 0.85)',
            }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Connected
          </Badge>
        );
      case 'pending':
        return (
          <Badge 
            variant="outline" 
            className="font-normal border-0 text-xs gap-1"
            style={{ 
              backgroundColor: 'rgba(251, 191, 36, 0.1)',
              color: 'rgba(217, 119, 6, 0.85)',
            }}
          >
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'revoked':
      case 'error':
        return (
          <Badge 
            variant="outline" 
            className="font-normal border-0 text-xs gap-1"
            style={{ 
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'rgba(239, 68, 68, 0.85)',
            }}
          >
            <AlertCircle className="h-3 w-3" />
            {status === 'revoked' ? 'Revoked' : 'Error'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="font-normal text-xs">
            {status}
          </Badge>
        );
    }
  };

  const connectedSources = sources.filter(s => s.status === 'connected');
  const hasConnectedSource = connectedSources.length > 0;

  if (loading) {
    return (
      <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
        <CardContent className="py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 rounded w-1/3" style={{ backgroundColor: '#E6E6E4' }} />
            <div className="h-12 rounded" style={{ backgroundColor: '#E6E6E4' }} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-4 pt-7 px-7">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2" style={{ color: '#2D2B29' }}>
              <Watch className="h-4 w-4" style={{ stroke: '#A7B4C2' }} />
              Connected Wearables
            </CardTitle>
            <p className="text-xs mt-1" style={{ color: '#A7A29C' }}>
              Sync sleep data from your devices
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="text-xs h-8"
          >
            <Link to="/settings/sleep-sources">
              {hasConnectedSource ? 'Manage' : (
                <>
                  <Plus className="h-3 w-3 mr-1" />
                  Connect
                </>
              )}
            </Link>
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="px-7 pb-7">
        {sources.length === 0 ? (
          <div 
            className="p-6 rounded-lg text-center"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            <Watch className="h-8 w-8 mx-auto mb-3" style={{ stroke: '#A7B4C2' }} />
            <p className="text-sm font-medium mb-1" style={{ color: '#2D2B29' }}>
              No wearables connected
            </p>
            <p className="text-xs mb-4" style={{ color: '#A7A29C' }}>
              Connect your Garmin or Apple Watch to get deeper sleep insights
            </p>
            <Button size="sm" asChild>
              <Link to="/settings/sleep-sources">
                <Plus className="h-3 w-3 mr-1" />
                Connect a Device
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sources.map((source) => {
              const display = getSourceDisplay(source.source);
              return (
                <div 
                  key={source.id}
                  className="p-4 rounded-lg flex items-center justify-between"
                  style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{display.icon}</span>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#2D2B29' }}>
                        {display.name}
                      </p>
                      {source.last_sync_at && source.status === 'connected' && (
                        <p className="text-xs" style={{ color: '#A7A29C' }}>
                          Last sync: {formatDistanceToNow(new Date(source.last_sync_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(source.status)}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
