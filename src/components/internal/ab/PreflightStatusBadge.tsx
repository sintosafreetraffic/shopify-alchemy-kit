/**
 * PreflightStatusBadge - v2.4.2
 * 
 * Displays the preflight run status with last run timestamp.
 * Shows passed/degraded/failed/pending states with appropriate styling.
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, AlertTriangle, XCircle, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { PreflightRun } from '@/hooks/usePreflightStatus';

interface PreflightStatusBadgeProps {
  run: PreflightRun | null;
  loading?: boolean;
}

export function PreflightStatusBadge({ run, loading }: PreflightStatusBadgeProps) {
  if (loading) {
    return (
      <Badge variant="outline" className="text-xs flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking...
      </Badge>
    );
  }

  if (!run) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="text-xs flex items-center gap-1 text-muted-foreground cursor-help">
            <Clock className="h-3 w-3" />
            No preflight
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">No preflight checks have been run yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Run a manual preflight or save variant changes.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const timeAgo = formatDistanceToNow(new Date(run.run_at), { addSuffix: true });

  switch (run.status) {
    case 'passed':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs flex items-center gap-1 text-green-600 border-green-500/30 bg-green-500/5 cursor-help">
              <CheckCircle className="h-3 w-3" />
              Preflight: Passed
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs font-medium">All checks passed</p>
            <p className="text-xs text-muted-foreground mt-1">Last run: {timeAgo}</p>
            {run.summary && <p className="text-xs mt-1">{run.summary}</p>}
          </TooltipContent>
        </Tooltip>
      );

    case 'degraded':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs flex items-center gap-1 text-amber-600 border-amber-500/30 bg-amber-500/5 cursor-help">
              <AlertTriangle className="h-3 w-3" />
              Preflight: Degraded
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs font-medium">Some checks have warnings</p>
            <p className="text-xs text-muted-foreground mt-1">Last run: {timeAgo}</p>
            {run.summary && <p className="text-xs mt-1">{run.summary}</p>}
            <p className="text-xs text-amber-600 mt-2">Review before scaling traffic.</p>
          </TooltipContent>
        </Tooltip>
      );

    case 'failed':
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs flex items-center gap-1 text-destructive border-destructive/30 bg-destructive/5 cursor-help">
              <XCircle className="h-3 w-3" />
              Preflight: Failed
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-xs font-medium">Critical checks failed</p>
            <p className="text-xs text-muted-foreground mt-1">Last run: {timeAgo}</p>
            {run.summary && <p className="text-xs mt-1">{run.summary}</p>}
            <p className="text-xs text-destructive mt-2">Fix issues before increasing traffic to B.</p>
          </TooltipContent>
        </Tooltip>
      );

    case 'pending':
      return (
        <Badge variant="outline" className="text-xs flex items-center gap-1 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Preflight: Running...
        </Badge>
      );

    default:
      return null;
  }
}
