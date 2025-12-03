import { useEffect, useState } from "react";

// Get next midnight in Eastern Time (ET)
const getNextMidnightET = (): number => {
  // Create a date formatter for Eastern Time
  const etFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const now = new Date();
  const parts = etFormatter.formatToParts(now);
  
  // Extract current ET date components
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2025');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  
  // Create tomorrow's date in ET
  const tomorrowET = new Date(Date.UTC(year, month, day + 1, 5, 0, 0, 0)); // 00:00 ET = 05:00 UTC (EST) or 04:00 UTC (EDT)
  
  // Adjust for DST - check if we're in EDT or EST
  const jan = new Date(year, 0, 1);
  const jul = new Date(year, 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  const isDST = now.getTimezoneOffset() < stdOffset;
  
  // ET is UTC-5 (EST) or UTC-4 (EDT)
  const utcMidnightET = new Date(Date.UTC(year, month, day + 1, isDST ? 4 : 5, 0, 0, 0));
  
  return utcMidnightET.getTime();
};

// Calculate time remaining until next midnight ET
const calculateTimeLeft = () => {
  const now = Date.now();
  const targetMidnight = getNextMidnightET();
  let distance = targetMidnight - now;
  
  // If somehow negative (edge case), add 24 hours
  if (distance <= 0) {
    distance += 24 * 60 * 60 * 1000;
  }

  const hours = Math.floor(distance / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  return { hours, minutes, seconds };
};

export const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft());
  const [saleName] = useState("CYBER MONDAY");

  useEffect(() => {
    // Calculate immediately on mount
    setTimeLeft(calculateTimeLeft());
    
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
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
