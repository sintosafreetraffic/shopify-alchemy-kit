import { useEffect, useState } from "react";

// Helper function to get US time (Eastern Time)
const getUSTime = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
};

// Helper function to determine sale type and end time
const getSaleInfo = () => {
  const now = getUSTime();
  
  // Get the end of the current day in ET (23:59:59)
  const endOfDay = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  endOfDay.setHours(23, 59, 59, 999);
  
  return {
    saleName: "CYBER MONDAY",
    endTime: endOfDay
  };
};

export const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [saleName, setSaleName] = useState("CYBER MONDAY");

  useEffect(() => {
    const timer = setInterval(() => {
      const saleInfo = getSaleInfo();
      setSaleName(saleInfo.saleName);
      
      const now = getUSTime().getTime();
      const distance = saleInfo.endTime.getTime() - now;

      if (distance < 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      
      setTimeLeft({
        days: days,
        hours: hours,
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
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
  const { timeLeft, saleName } = CountdownTimer();
  
  return (
    <div className="flex items-center justify-center gap-2 text-sm font-medium">
      <span className="text-red-600 dark:text-red-400">⏰ Ends in:</span>
      <div className="flex items-center gap-1">
        {timeLeft.days > 0 && (
          <>
            <div className="bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded font-bold text-center">
              {timeLeft.days}d
            </div>
          </>
        )}
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
