/**
 * QualityMetricDisplay - v2.4.2
 * 
 * Displays the Customer Quality (refund proxy) metric in the A/B test header.
 * Uses calm, non-alarming language while clearly indicating quality risks.
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ShieldAlert, ShieldCheck, Shield } from 'lucide-react';

interface QualityMetricDisplayProps {
  refundRateA: number; // As percentage (e.g., 2.5 means 2.5%)
  refundRateB: number;
  probabilityBWorse: number | null; // P(B worse than A)
  qualityLiftPercent: number; // Relative lift (e.g., +15% means B has 15% higher refund rate)
  purchasesA: number;
  purchasesB: number;
  minPurchasesRequired?: number;
}

const QUALITY_RISK_THRESHOLD = 15; // 15% worse refund rate triggers warning
const QUALITY_CRITICAL_THRESHOLD = 30; // 30% worse triggers critical

export function QualityMetricDisplay({
  refundRateA,
  refundRateB,
  probabilityBWorse,
  qualityLiftPercent,
  purchasesA,
  purchasesB,
  minPurchasesRequired = 10,
}: QualityMetricDisplayProps) {
  const hasSufficientData = purchasesA >= minPurchasesRequired && purchasesB >= minPurchasesRequired;
  const hasRefundData = refundRateA > 0 || refundRateB > 0;
  
  // Quality status determination
  let status: 'healthy' | 'watch' | 'risk' | 'insufficient' = 'insufficient';
  
  if (!hasSufficientData) {
    status = 'insufficient';
  } else if (!hasRefundData) {
    status = 'healthy'; // No refunds = good quality (so far)
  } else if (qualityLiftPercent >= QUALITY_CRITICAL_THRESHOLD) {
    status = 'risk';
  } else if (qualityLiftPercent >= QUALITY_RISK_THRESHOLD) {
    status = 'watch';
  } else {
    status = 'healthy';
  }

  // Insufficient data state
  if (status === 'insufficient') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-help">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Quality: —</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs">Insufficient purchase data for quality comparison.</p>
          <p className="text-xs text-muted-foreground mt-1">Need ≥{minPurchasesRequired} purchases per variant.</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Healthy state (no risk)
  if (status === 'healthy') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <ShieldCheck className="h-3 w-3 text-green-600" />
            <span className="text-xs text-muted-foreground">Quality:</span>
            <Badge variant="outline" className="text-xs text-green-600 border-green-500/30">
              Healthy
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs font-medium">Customer quality looks good</p>
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <p>Refund proxy A: {refundRateA.toFixed(1)}%</p>
            <p>Refund proxy B: {refundRateB.toFixed(1)}%</p>
            {probabilityBWorse !== null && (
              <p className="mt-1">P(B worse): {(probabilityBWorse * 100).toFixed(0)}%</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground/80 mt-2 pt-2 border-t border-muted">
            Early indicator based on refunds + chargebacks. Monitor as data grows.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Watch state
  if (status === 'watch') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 cursor-help">
            <Shield className="h-3 w-3 text-amber-600" />
            <span className="text-xs text-muted-foreground">Quality:</span>
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-500/30 bg-amber-500/5">
              Watch
            </Badge>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-xs font-medium">Quality signal needs attention</p>
          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
            <p>Refund proxy A: {refundRateA.toFixed(1)}%</p>
            <p>Refund proxy B: {refundRateB.toFixed(1)}% (+{qualityLiftPercent.toFixed(0)}%)</p>
            {probabilityBWorse !== null && (
              <p className="mt-1">P(B worse): {(probabilityBWorse * 100).toFixed(0)}%</p>
            )}
          </div>
          <p className="text-xs text-amber-600 mt-2 pt-2 border-t border-muted">
            B shows elevated refund signal. Directional — monitor before scaling.
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Risk state
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 cursor-help">
          <ShieldAlert className="h-3 w-3 text-destructive" />
          <span className="text-xs text-muted-foreground">Quality:</span>
          <Badge variant="outline" className="text-xs text-destructive border-destructive/30 bg-destructive/5">
            Risk
          </Badge>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <p className="text-xs font-medium">Quality risk detected</p>
        <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
          <p>Refund proxy A: {refundRateA.toFixed(1)}%</p>
          <p>Refund proxy B: {refundRateB.toFixed(1)}% (+{qualityLiftPercent.toFixed(0)}%)</p>
          {probabilityBWorse !== null && (
            <p className="mt-1">P(B worse): {(probabilityBWorse * 100).toFixed(0)}%</p>
          )}
        </div>
        <p className="text-xs text-destructive mt-2 pt-2 border-t border-muted">
          B shows significantly higher refund rate. Investigate customer fit before declaring winner.
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
