import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

interface CheckoutLoadingOverlayProps {
  isVisible: boolean;
  startTime: number | null;
}

export const CheckoutLoadingOverlay = ({ isVisible, startTime }: CheckoutLoadingOverlayProps) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isVisible || !startTime) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible, startTime]);

  if (!isVisible) return null;

  // Message hierarchy based on elapsed time
  const getMessage = () => {
    if (elapsedSeconds >= 15) {
      return "Almost there...";
    } else if (elapsedSeconds >= 8) {
      return "This is taking longer than expected...";
    }
    return "Redirecting to secure checkout...";
  };

  // Pulse animation after 15 seconds
  const shouldPulse = elapsedSeconds >= 15;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(247, 247, 246, 0.65)" }}
      role="dialog"
      aria-modal="true"
      aria-label="Processing checkout"
    >
      <div 
        className="rounded-xl px-8 py-6 flex flex-col items-center gap-4 max-w-sm mx-4"
        style={{ 
          backgroundColor: "#FAFAF8",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.06)"
        }}
      >
        <div className={shouldPulse ? "animate-pulse" : ""}>
          <Loader2 
            className="w-8 h-8 animate-spin" 
            style={{ color: "rgba(60, 131, 246, 0.75)" }}
          />
        </div>
        <div className="text-center">
          <p 
            className="font-medium text-base"
            style={{ color: "#2D2B29" }}
          >
            {getMessage()}
          </p>
          <p 
            className="text-sm mt-1"
            style={{ color: "#6F6A66" }}
          >
            Please don't close this window
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
};
