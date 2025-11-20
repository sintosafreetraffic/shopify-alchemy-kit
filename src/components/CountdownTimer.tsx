import { useEffect, useState } from "react";

export const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Set end time to 48 hours from now (can be adjusted to actual sale end)
    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 48);
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTime.getTime() - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-center gap-2 text-sm font-medium">
      <span className="text-red-600 dark:text-red-400">⏰ Ends in:</span>
      <div className="flex gap-1">
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
