/**
 * Urgency Announcement Bar for Variant B
 * 
 * Fixed bar at top with countdown and offer messaging
 */

import { useState, useEffect } from 'react';
import { Clock, Gift, Truck } from 'lucide-react';
import { useCountdownTimer } from '@/components/CountdownTimer';

export function UrgencyAnnouncementBar() {
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
      className="fixed top-0 left-0 right-0 h-9 bg-primary text-primary-foreground text-center text-sm font-medium z-[80] flex items-center justify-center"
    >
      <div className="container mx-auto px-4 flex items-center justify-center gap-2">
        <CurrentIcon className="h-4 w-4 animate-bounce flex-shrink-0" />
        <span className="animate-in fade-in duration-500" key={currentMessage}>
          {messages[currentMessage].text}
        </span>
      </div>
    </div>
  );
}

export default UrgencyAnnouncementBar;
