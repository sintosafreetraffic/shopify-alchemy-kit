import { useEffect, useState, useRef } from "react";

// Helper to calculate time remaining from a target end time
const calculateTimeLeft = (endTime: number) => {
  const now = Date.now();
  let distance = endTime - now;
  
  // If expired, return null to signal reset needed
  if (distance <= 0) {
    return null;
  }

  const hours = Math.floor(distance / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
};

export const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [saleName] = useState("CYBER MONDAY");
  const endTimeRef = useRef<number>(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  useEffect(() => {
    // Initialize with 24 hours from now
    endTimeRef.current = Date.now() + 24 * 60 * 60 * 1000;
    
    const timer = setInterval(() => {
      const result = calculateTimeLeft(endTimeRef.current);
      
      if (result === null) {
        // Timer expired, reset to 24 hours
        endTimeRef.current = Date.now() + 24 * 60 * 60 * 1000;
        setTimeLeft({ hours: 24, minutes: 0, seconds: 0 });
      } else {
        setTimeLeft(result);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return {
    timeLeft,
    saleName
  };
};

// Display component for the countdown
export const CountdownTimerDisplay = () => {
  const { timeLeft } = CountdownTimer();
  
  return (
    <div className="flex items-center justify-center gap-2 text-sm font-medium">
      <span className="text-red-600 dark:text-red-400">⏰ Ends in:</span>
      <div className="flex items-center gap-1">
        <div className="bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded font-bold min-w-[32px] text-center">
          {String(timeLeft.hours).padStart(2, '0')}
        </div>
        <span>:</span>
        <div className="bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded font-bold min-w-[32px] text-center">
          {String(timeLeft.minutes).padStart(2, '0')}
        </div>
        <span>:</span>
        <div className="bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded font-bold min-w-[32px] text-center">
          {String(timeLeft.seconds).padStart(2, '0')}
        </div>
      </div>
    </div>
  );
};
