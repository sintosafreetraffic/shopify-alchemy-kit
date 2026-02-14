import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";

interface CartUrgencyBannerProps {
  hasItems: boolean;
}

const RESERVATION_KEY = "cart-reservation-timestamp";
const RESERVATION_MINUTES = 10;

export function CartUrgencyBanner({ hasItems }: CartUrgencyBannerProps) {
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Initialize or reset reservation timer
  useEffect(() => {
    if (!hasItems) {
      sessionStorage.removeItem(RESERVATION_KEY);
      setTimeRemaining(null);
      return;
    }

    let timestamp = sessionStorage.getItem(RESERVATION_KEY);
    if (!timestamp) {
      timestamp = Date.now().toString();
      sessionStorage.setItem(RESERVATION_KEY, timestamp);
    }

    const startTime = parseInt(timestamp, 10);
    const endTime = startTime + RESERVATION_MINUTES * 60 * 1000;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [hasItems]);

  if (!hasItems) return null;

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const isExpired = timeRemaining !== null && timeRemaining <= 0;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
      {/* Reservation Timer */}
      <div className="flex items-center gap-2">
        {isExpired ? (
          <>
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-amber-700 font-medium">
              Items may sell out soon
            </span>
          </>
        ) : timeRemaining !== null ? (
          <>
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span className="text-sm text-amber-700">
              Your items are reserved for{" "}
              <span className="font-bold tabular-nums">{formatTime(timeRemaining)}</span>
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}
