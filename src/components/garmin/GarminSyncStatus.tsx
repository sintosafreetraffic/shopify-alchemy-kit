/**
 * Garmin Sync Status Component
 * Shows the current status of activity backfill jobs with user-friendly labels
 */
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  Clock,
  RefreshCw,
  XCircle,
  ShieldAlert
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface BackfillStatusResponse {
  has_jobs: boolean;
  status: string;
  status_label: string;
  is_in_progress?: boolean;
  can_retry?: boolean;
  job_counts?: Record<string, number>;
  total_jobs?: number;
  last_attempt_at?: string | null;
  next_retry_at?: string | null;
  last_error?: string | null;
}

interface GarminSyncStatusProps {
  isActivityEnabled: boolean;
  onRetryComplete?: () => void;
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'running':
    case 'queued':
    case 'retrying':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'rate_limited':
      return <Clock className="h-4 w-4 text-amber-600" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'needs_permission':
      return <ShieldAlert className="h-4 w-4 text-amber-600" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string, label: string) {
  switch (status) {
    case 'success':
      return <Badge variant="default" className="bg-green-600 gap-1"><CheckCircle className="h-3 w-3" />{label}</Badge>;
    case 'running':
    case 'queued':
    case 'retrying':
      return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />{label}</Badge>;
    case 'rate_limited':
      return <Badge variant="outline" className="text-amber-600 border-amber-600 gap-1"><Clock className="h-3 w-3" />{label}</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{label}</Badge>;
    case 'needs_permission':
      return <Badge variant="outline" className="text-amber-600 border-amber-600 gap-1"><ShieldAlert className="h-3 w-3" />{label}</Badge>;
    default:
      return <Badge variant="secondary">{label}</Badge>;
  }
}

export function GarminSyncStatus({ isActivityEnabled, onRetryComplete }: GarminSyncStatusProps) {
  const [status, setStatus] = useState<BackfillStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await supabase.functions.invoke('garmin-backfill-status');
      
      if (response.error) {
        console.error('Failed to fetch backfill status:', response.error);
        setStatus(null);
        return;
      }
      
      setStatus(response.data as BackfillStatusResponse);
    } catch (err) {
      console.error('Error fetching backfill status:', err);
      setStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isActivityEnabled) {
      fetchStatus();
      
      // Poll every 30 seconds if in progress
      const interval = setInterval(() => {
        if (status?.is_in_progress) {
          fetchStatus();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [isActivityEnabled, status?.is_in_progress]);

  const handleRetry = async () => {
    setIsRetrying(true);
    
    try {
      const response = await supabase.functions.invoke('garmin-activity-backfill', {
        body: { retry_failed: true },
      });
      
      if (response.error) {
        // Try to parse error response - data may contain the JSON body even on error
        const errorData = response.data as { error?: string; pending_jobs?: number; message?: string } | null;
        
        // Check if it's a 409 "already in progress" response
        if (errorData?.error === 'Backfill already in progress') {
          toast({
            title: "Sync already in progress",
            description: `${errorData.pending_jobs || 'Some'} job(s) are still processing. Please wait for them to complete.`,
          });
          await fetchStatus();
          return;
        }
        
        // Also check error message for this case (fallback)
        const errorMessage = response.error?.message || '';
        if (errorMessage.includes('409') || errorMessage.toLowerCase().includes('already in progress')) {
          toast({
            title: "Sync already in progress",
            description: "Please wait for current jobs to complete before starting new ones.",
          });
          await fetchStatus();
          return;
        }
        
        console.error('Retry failed:', response.error);
        toast({
          title: "Retry failed",
          description: "Could not restart sync. Please try again later.",
          variant: "destructive",
        });
        return;
      }
      
      const data = response.data as { success: boolean; jobs_requeued?: number; message?: string };
      
      if (data.success) {
        toast({
          title: "Sync restarted",
          description: data.jobs_requeued 
            ? `${data.jobs_requeued} job(s) queued for retry.`
            : "Sync will retry automatically.",
        });
        // Refresh status
        await fetchStatus();
        onRetryComplete?.();
      }
    } catch (err) {
      console.error('Retry error:', err);
      toast({
        title: "Error",
        description: "Failed to restart sync.",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  // Don't show if activity is not enabled
  if (!isActivityEnabled) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Checking sync status...</span>
      </div>
    );
  }

  // No jobs yet
  if (!status || !status.has_jobs) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Status Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Activity Sync</span>
          {getStatusBadge(status.status, status.status_label)}
        </div>
        
        {/* Retry button - only show when can_retry is true AND the issue is actually retryable */}
        {status.can_retry && status.status !== 'needs_permission' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="h-7 text-xs"
          >
            {isRetrying ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1" />
            )}
            Retry
          </Button>
        )}
      </div>

      {/* Progress/Status Details */}
      <div className="text-sm text-muted-foreground space-y-1">
        {/* Last attempt time */}
        {status.last_attempt_at && (
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>
              Last attempt: {formatDistanceToNow(new Date(status.last_attempt_at), { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Next retry time - only for in-progress with scheduled retry */}
        {status.is_in_progress && status.next_retry_at && (
          <div className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            <span>
              Next retry: {formatDistanceToNow(new Date(status.next_retry_at), { addSuffix: true })}
            </span>
          </div>
        )}

        {/* Job counts summary */}
        {status.job_counts && status.total_jobs && status.total_jobs > 0 && (
          <div className="flex items-center gap-1">
            {getStatusIcon(status.status)}
            <span>
              {status.job_counts.success || 0} of {status.total_jobs} synced
              {status.job_counts.failed ? `, ${status.job_counts.failed} failed` : ''}
            </span>
          </div>
        )}

        {/* Error message - sanitized, no raw HTML */}
        {status.last_error && status.status !== 'success' && (
          <div className="flex items-start gap-1 text-destructive/80">
            <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="text-xs">{status.last_error}</span>
          </div>
        )}

        {/* Helpful hint for needs_permission */}
        {status.status === 'needs_permission' && (
          <div className="flex items-start gap-1 text-amber-700">
            <ShieldAlert className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <span className="text-xs">
              Activity history import isn't available with your current connection type. New workouts will still sync automatically going forward.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
