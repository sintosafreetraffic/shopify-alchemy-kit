/**
 * Urgency Announcement Bar for Variant B
 * 
 * Fixed bar at top with countdown and offer messaging
 */

import { useState, useEffect } from 'react';
import { Clock, Gift, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCountdownTimer } from '@/components/CountdownTimer';

interface UrgencyAnnouncementBarProps {
  className?: string;
}

export function UrgencyAnnouncementBar({ className }: UrgencyAnnouncementBarProps) {
  const { timeLeft } = useCountdownTimer();
  const [currentMessage, setCurrentMessage] = useState(0);
  
  const messages = [
    { icon: Gift, text: "🎁 FREE Sleep Mask today!" },
    { icon: Truck, text: "🚚 FREE Express Shipping!" },
    {
      icon: Clock,
      text: `⏰ Sale ends ${String(timeLeft.hours).padStart(2, '0')}:${String(timeLeft.minutes).padStart(2, '0')}:${String(timeLeft.seconds).padStart(2, '0')}`,
    },
  ];
  
  // Rotate messages every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [messages.length]);
  
  const CurrentIcon = messages[currentMessage].icon;
  
  return (
    <div 
      data-header-banner
      className={cn(
        "fixed top-0 left-0 right-0 h-9 z-[85]",
        "bg-primary text-primary-foreground px-4 relative",
        "flex items-center justify-center",
        className
      )}
    >
      <div className="container mx-auto flex items-center justify-center gap-2 text-xs sm:text-sm font-medium whitespace-nowrap">
        <CurrentIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-bounce flex-shrink-0" />
        <span className="animate-in fade-in duration-500" key={currentMessage}>
          {messages[currentMessage].text}
        </span>
      </div>
    </div>
  );
}

export default UrgencyAnnouncementBar;
