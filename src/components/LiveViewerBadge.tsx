import { Eye } from "lucide-react";
import { useState, useEffect } from "react";

interface LiveViewerBadgeProps {
  className?: string;
}

/**
 * Displays a "X people viewing now" badge with realistic-looking numbers.
 * Uses a simulated count that varies slightly over time for authenticity.
 */
export const LiveViewerBadge = ({ className = "" }: LiveViewerBadgeProps) => {
  // Start with a base count and add minor random variance
  const [viewerCount, setViewerCount] = useState(() => {
    const baseCount = 12;
    return baseCount + Math.floor(Math.random() * 5);
  });

  useEffect(() => {
    // Occasionally update the count slightly to appear real-time
    const interval = setInterval(() => {
      setViewerCount(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        const newCount = prev + change;
        // Keep between 8 and 22
        return Math.max(8, Math.min(22, newCount));
      });
    }, 15000); // Every 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-affirmative opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-affirmative"></span>
      </span>
      <Eye className="w-3 h-3" />
      <span>{viewerCount} people viewing now</span>
    </div>
  );
};

