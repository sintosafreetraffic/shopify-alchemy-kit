import { useEffect, useState } from "react";

// Helper function to get US time (Eastern Time)
const getUSTime = () => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
};

// Helper function to determine sale type and end time
const getSaleInfo = () => {
  const now = getUSTime();
  const currentDate = now.getDate();
  const currentMonth = now.getMonth(); // 0-indexed (11 = December)
  const currentYear = now.getFullYear();
  
  // Sunday November 30, 2025 23:59:59 ET
  const blackFridayEnd = new Date('2025-11-30T23:59:59-05:00');
  
  // Monday December 1, 2025 23:59:59 ET
  const cyberMondayEnd = new Date('2025-12-01T23:59:59-05:00');
  
  // If before end of Sunday (Nov 30), it's BLACK FRIDAY
  if (now < blackFridayEnd) {
    return {
      saleName: "BLACK FRIDAY",
      endTime: blackFridayEnd
    };
  }
  
  // If Monday Dec 1, it's CYBER MONDAY
  if (now < cyberMondayEnd) {
    return {
      saleName: "CYBER MONDAY",
      endTime: cyberMondayEnd
    };
  }
  
  // Sale ended
  return {
    saleName: "SALE ENDED",
    endTime: cyberMondayEnd
  };
};

export const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [saleName, setSaleName] = useState("BLACK FRIDAY");

  useEffect(() => {
    const timer = setInterval(() => {
      const saleInfo = getSaleInfo();
      setSaleName(saleInfo.saleName);
      
      const now = new Date().getTime();
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
