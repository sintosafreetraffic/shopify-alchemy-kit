/**
 * Urgency Announcement Bar for Valentine's Sale
 * 
 * Fixed bar at top with marquee scrolling effect (right to left)
 */

import { Heart } from 'lucide-react';

export function UrgencyAnnouncementBar() {
  const messages = [
    "Buy 1 Get 1 Free",
    "Buy 1 Get 1 Free",
    "Buy 1 Get 1 Free",
    "Buy 1 Get 1 Free",
  ];
  
  return (
    <div
      data-header-banner
      className="fixed top-0 left-0 right-0 h-9 bg-black text-white text-center text-sm font-semibold z-[80] flex items-center overflow-hidden"
    >
      <div className="animate-marquee whitespace-nowrap flex items-center">
        {messages.map((msg, i) => (
          <span key={i} className="flex items-center gap-2 mx-10">
            <Heart className="w-4 h-4 fill-current" />
            <span>{msg}</span>
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {messages.map((msg, i) => (
          <span key={`dup-${i}`} className="flex items-center gap-2 mx-10">
            <Heart className="w-4 h-4 fill-current" />
            <span>{msg}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default UrgencyAnnouncementBar;
