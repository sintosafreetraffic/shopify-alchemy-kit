/**
 * Urgency Elements for Variant B
 * 
 * Stock indicator, viewer count, selling fast banner, and scarcity bar
 * All driven by the variant_b_urgency.json config
 */

import { useState, useEffect, useMemo } from 'react';
import { Eye, Flame, TrendingUp, AlertTriangle, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import urgencyConfig from '@/configs/variant_b_urgency.json';

// ============================================================================
// STOCK INDICATOR
// ============================================================================

interface StockIndicatorProps {
  className?: string;
}

export function StockIndicator({ className }: StockIndicatorProps) {
  const config = urgencyConfig.stockIndicator;
  
  if (!config.enabled) return null;
  
  // Calculate "current" stock based on config
  // In static_decrement mode, we use a deterministic calculation based on date
  const stockCount = useMemo(() => {
    if (config.mode === 'static_decrement') {
      const startDate = new Date('2025-01-13'); // Test start date
      const today = new Date();
      const daysSinceStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const decremented = config.initialStock - (daysSinceStart * config.decrementPerDay);
      return Math.max(decremented, config.minStock);
    }
    return config.initialStock;
  }, []);
  
  const isLowStock = stockCount <= config.lowStockThreshold;
  const displayText = isLowStock 
    ? config.lowStockText 
    : config.text.replace('{count}', String(stockCount));

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm font-medium",
      isLowStock ? "text-destructive" : "text-orange-600",
      className
    )}>
      <Package className="h-4 w-4" />
      <span>{displayText}</span>
      {isLowStock && <AlertTriangle className="h-4 w-4 animate-pulse" />}
    </div>
  );
}

// ============================================================================
// VIEWER COUNT
// ============================================================================

interface ViewerCountProps {
  className?: string;
}

export function ViewerCount({ className }: ViewerCountProps) {
  const config = urgencyConfig.viewerCount;
  
  if (!config.enabled) return null;
  
  const count = config.staticValue;
  const displayText = config.text.replace('{count}', String(count));

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm text-muted-foreground",
      className
    )}>
      <Eye className="h-4 w-4" />
      <span>{displayText}</span>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
      </span>
    </div>
  );
}

// ============================================================================
// SELLING FAST BANNER
// ============================================================================

interface SellingFastBannerProps {
  className?: string;
}

export function SellingFastBanner({ className }: SellingFastBannerProps) {
  const config = urgencyConfig.sellingFast;
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (!config.enabled) return;
    
    const timer = setTimeout(() => {
      setVisible(true);
    }, config.showAfterSeconds * 1000);
    
    return () => clearTimeout(timer);
  }, [config.enabled, config.showAfterSeconds]);
  
  if (!config.enabled || !visible) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
      "bg-gradient-to-r from-orange-500/10 to-red-500/10 text-orange-700",
      "border border-orange-200/50",
      "animate-in fade-in slide-in-from-bottom-2 duration-500",
      className
    )}>
      <Flame className="h-4 w-4 text-orange-500" />
      <span>{config.text}</span>
    </div>
  );
}

// ============================================================================
// DEMAND INDICATOR
// ============================================================================

interface DemandIndicatorProps {
  className?: string;
}

export function DemandIndicator({ className }: DemandIndicatorProps) {
  const config = urgencyConfig.demandIndicator;
  
  if (!config.enabled) return null;

  return (
    <div className={cn(
      "flex items-center gap-2 text-sm font-medium text-green-700",
      className
    )}>
      <TrendingUp className="h-4 w-4" />
      <span>{config.text}</span>
      {config.showPercentage && (
        <span className="text-green-600 font-semibold">
          {config.percentage}% interest
        </span>
      )}
    </div>
  );
}

// ============================================================================
// SCARCITY BAR
// ============================================================================

interface ScarcityBarProps {
  className?: string;
}

export function ScarcityBar({ className }: ScarcityBarProps) {
  const config = urgencyConfig.scarcityBar;
  
  if (!config.enabled) return null;
  
  const displayText = config.text.replace('{percentage}', String(config.percentage));

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{displayText}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${config.percentage}%`,
            backgroundColor: config.color,
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// MORNING PUFFINESS SECTION
// ============================================================================

interface MorningPuffinessSectionProps {
  className?: string;
}

export function MorningPuffinessSection({ className }: MorningPuffinessSectionProps) {
  const config = urgencyConfig.morningPuffiness;
  
  if (!config.enabled) return null;

  return (
    <div className={cn(
      "p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100",
      className
    )}>
      <h4 className="font-semibold text-foreground mb-1">{config.headline}</h4>
      <p className="text-sm text-muted-foreground">{config.subtext}</p>
    </div>
  );
}

// ============================================================================
// URGENCY CTA ENHANCEMENTS
// ============================================================================

interface UrgencyCTAProps {
  onClick?: () => void;
  isLoading?: boolean;
  className?: string;
}

export function UrgencyCTA({ onClick, isLoading, className }: UrgencyCTAProps) {
  const config = urgencyConfig.ctaEnhancements;
  
  if (!config.enabled) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <button
        onClick={onClick}
        disabled={isLoading}
        className={cn(
          "w-full py-3 px-6 rounded-lg font-semibold text-white",
          "bg-gradient-to-r from-primary to-primary/90",
          "hover:from-primary/90 hover:to-primary",
          "transition-all duration-200",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          config.pulseAnimation && "animate-pulse-subtle"
        )}
      >
        {isLoading ? 'Adding...' : config.primaryText}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        {config.urgencySubtext}
      </p>
    </div>
  );
}

// ============================================================================
// SOCIAL PROOF (RECENT PURCHASES)
// ============================================================================

interface SocialProofToastProps {
  className?: string;
}

export function SocialProofToast({ className }: SocialProofToastProps) {
  const config = urgencyConfig.socialProof;
  const [visible, setVisible] = useState(false);
  const [currentCity, setCurrentCity] = useState('');
  
  useEffect(() => {
    if (!config.enabled || !config.showRecentPurchases) return;
    
    let timeoutId: ReturnType<typeof setTimeout>;
    
    const showToast = () => {
      const randomCity = config.cities[Math.floor(Math.random() * config.cities.length)];
      setCurrentCity(randomCity);
      setVisible(true);
      
      // Hide after 5 seconds
      setTimeout(() => setVisible(false), 5000);
      
      // Schedule next toast
      timeoutId = setTimeout(showToast, config.intervalSeconds * 1000);
    };
    
    // Initial delay before first toast
    timeoutId = setTimeout(showToast, 10000);
    
    return () => clearTimeout(timeoutId);
  }, [config.enabled, config.showRecentPurchases, config.cities, config.intervalSeconds]);
  
  if (!config.enabled || !visible) return null;
  
  const displayText = config.recentPurchaseText.replace('{city}', currentCity);

  return (
    <div className={cn(
      "fixed bottom-4 left-4 z-50",
      "px-4 py-3 rounded-lg shadow-lg",
      "bg-white border border-border",
      "animate-in slide-in-from-left-5 fade-in duration-300",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
          <Package className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <p className="text-sm font-medium">{displayText}</p>
          <p className="text-xs text-muted-foreground">Just now</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMBINED URGENCY PANEL
// ============================================================================

interface UrgencyPanelProps {
  className?: string;
  showAll?: boolean;
}

export function UrgencyPanel({ className, showAll = false }: UrgencyPanelProps) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < urgencyConfig.mobile.collapseThresholdPx;
  const shouldCollapse = isMobile && urgencyConfig.mobile.collapseSecondaryElements;

  return (
    <div className={cn("space-y-3", className)}>
      <StockIndicator />
      {(!shouldCollapse || showAll) && <ViewerCount />}
      <ScarcityBar />
      {(!shouldCollapse || showAll) && <SellingFastBanner />}
      <DemandIndicator />
    </div>
  );
}
