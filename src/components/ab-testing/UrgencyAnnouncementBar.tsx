/**
 * Urgency Announcement Bar for Variant B
 * 
 * Fixed bar at top with countdown and offer messaging
 */

import { useState, useEffect } from 'react';
import { X, Clock, Gift, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountdownTimer } from '@/components/CountdownTimer';

interface UrgencyAnnouncementBarProps {
  className?: string;
}

export function UrgencyAnnouncementBar({ className }: UrgencyAnnouncementBarProps) {
  const [dismissed, setDismissed] = useState(false);
  const { timeLeft } = useCountdownTimer();
  const [currentMessage, setCurrentMessage] = useState(0);
  
  const messages = [
    { icon: Gift, text: "🎁 FREE Sleep Mask with every order today!" },
    { icon: Truck, text: "🚚 FREE Express Shipping - Order now!" },
    { icon: Clock, text: `⏰ Sale ends in ${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}` },
  ];
  
  // Rotate messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages.length]);
  
  // When dismissed, still render a placeholder to maintain layout
  if (dismissed) {
    return <div data-header-banner className="fixed top-0 left-0 right-0 h-9 z-[80]" />;
  }
  
  const CurrentIcon = messages[currentMessage].icon;
  
  return (
    <div 
      data-header-banner
      className={cn(
        "fixed top-0 left-0 right-0 h-9 z-[80]",
        "bg-primary text-primary-foreground px-4 relative",
        "flex items-center justify-center",
        className
      )}
    >
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm font-medium">
        <CurrentIcon className="h-4 w-4 animate-bounce" />
        <span className="animate-in fade-in duration-500" key={currentMessage}>
          {messages[currentMessage].text}
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/20 rounded transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export default UrgencyAnnouncementBar;
