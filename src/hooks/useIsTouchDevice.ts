import { useState, useEffect } from "react";

/**
 * Hook to detect if the device is a touch/non-hover device.
 * Uses CSS media query (hover: none) for reliable detection.
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia("(hover: none)");
    const update = () => setIsTouch(mq.matches);

    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isTouch;
}
