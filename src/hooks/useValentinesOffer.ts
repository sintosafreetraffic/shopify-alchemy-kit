/**
 * useValentinesOffer Hook
 * 
 * Manages Valentine's Day 1+1 couples deal state and logic.
 * Reads from valentines_offer.json config and determines if offer is active.
 */

import { useMemo, useState, useEffect } from 'react';
import valentinesConfig from '@/configs/valentines_offer.json';

export interface ValentinesOfferState {
  isActive: boolean;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  endDate: Date;
  deliveryDeadline: Date;
  isDeliveryDeadlinePassed: boolean;
  pricing: {
    singlePrice: number;
    regularTwoPrice: number;
    couplesDealPrice: number;
    savings: number;
    currency: string;
  };
  messaging: {
    bannerText: string;
    heroHeadline: string;
    heroOfferLine: string;
    heroSubheadline: string;
    ctaText: string;
    singleCtaText: string;
    savingsBadge: string;
  };
  urgency: {
    showCountdown: boolean;
    countdownLabel: string;
    showStock: boolean;
    stockText: string;
    stockCount: number;
  };
  style: {
    accentColor: string;
    backgroundColor: string;
    borderColor: string;
  };
  deliveryText: string;
}

// Calculate a pseudo-random but stable stock count based on day
const getStockCount = (): number => {
  const today = new Date();
  const dayOfMonth = today.getDate();
  const seed = dayOfMonth * 7;
  const range = valentinesConfig.urgency.initialStock - valentinesConfig.urgency.minStock;
  const offset = seed % range;
  return valentinesConfig.urgency.initialStock - offset;
};

export function useValentinesOffer(): ValentinesOfferState {
  return useMemo(() => {
    const now = new Date();
    const startDate = new Date(valentinesConfig.schedule.startDate);
    const endDate = new Date(valentinesConfig.schedule.endDate);
    const deliveryDeadline = new Date(valentinesConfig.schedule.deliveryDeadline);
    
    const isActive = now >= startDate && now <= endDate;
    const isDeliveryDeadlinePassed = now > deliveryDeadline;
    
    // Calculate time remaining
    const timeRemaining = Math.max(0, endDate.getTime() - now.getTime());
    const totalSeconds = Math.floor(timeRemaining / 1000);
    const daysRemaining = Math.floor(totalSeconds / 86400);
    const hoursRemaining = Math.floor((totalSeconds % 86400) / 3600);
    const minutesRemaining = Math.floor((totalSeconds % 3600) / 60);
    const secondsRemaining = totalSeconds % 60;
    
    return {
      isActive,
      daysRemaining,
      hoursRemaining,
      minutesRemaining,
      secondsRemaining,
      endDate,
      deliveryDeadline,
      isDeliveryDeadlinePassed,
      pricing: {
        singlePrice: valentinesConfig.pricing.singlePillowPrice,
        regularTwoPrice: valentinesConfig.pricing.regularTwoPrice,
        couplesDealPrice: valentinesConfig.pricing.couplesDealPrice,
        savings: valentinesConfig.pricing.savingsAmount,
        currency: valentinesConfig.pricing.currency,
      },
      messaging: {
        bannerText: valentinesConfig.messaging.bannerText,
        heroHeadline: valentinesConfig.messaging.heroHeadline,
        heroOfferLine: (valentinesConfig.messaging as any).heroOfferLine || '',
        heroSubheadline: valentinesConfig.messaging.heroSubheadline,
        ctaText: valentinesConfig.messaging.ctaText,
        singleCtaText: valentinesConfig.messaging.singleCtaText,
        savingsBadge: valentinesConfig.messaging.savingsBadge,
      },
      urgency: {
        showCountdown: valentinesConfig.urgency.showCountdown,
        countdownLabel: valentinesConfig.urgency.countdownLabel,
        showStock: valentinesConfig.urgency.showStock,
        stockText: valentinesConfig.urgency.stockText,
        stockCount: getStockCount(),
      },
      style: {
        accentColor: valentinesConfig.style.accentColor,
        backgroundColor: valentinesConfig.style.backgroundColor,
        borderColor: valentinesConfig.style.borderColor,
      },
      deliveryText: valentinesConfig.schedule.deliveryDeadlineText,
    };
  }, []);
}

// Get next midnight in Irish Time (Europe/Dublin)
const getNextMidnightIrish = (): number => {
  const dublinFormatter = new Intl.DateTimeFormat('en-IE', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const now = new Date();
  const parts = dublinFormatter.formatToParts(now);
  
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2026');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  
  // Ireland is UTC+0 (GMT) or UTC+1 (IST - Irish Summer Time)
  const jan = new Date(year, 0, 1);
  const jul = new Date(year, 6, 1);
  const stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  const isDST = now.getTimezoneOffset() < stdOffset;
  
  // Irish midnight = UTC midnight (GMT) or UTC-1 hour (IST)
  const utcMidnightIrish = new Date(Date.UTC(year, month, day + 1, isDST ? -1 : 0, 0, 0, 0));
  
  return utcMidnightIrish.getTime();
};

// Real-time countdown hook - 24hr countdown to midnight Irish time
export function useValentinesCountdown() {
  const { isActive } = useValentinesOffer();
  
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  
  useEffect(() => {
    if (!isActive) return;
    
    const updateCountdown = () => {
      const now = Date.now();
      const targetMidnight = getNextMidnightIrish();
      let remaining = targetMidnight - now;
      
      // If negative, add 24 hours
      if (remaining <= 0) {
        remaining += 24 * 60 * 60 * 1000;
      }
      
      const totalSeconds = Math.floor(remaining / 1000);
      
      setTimeLeft({
        days: 0, // Always 0 for 24hr countdown
        hours: Math.floor(totalSeconds / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [isActive]);
  
  return { isActive, ...timeLeft };
}

// Hook for decreasing stock count per user session
export function useValentinesStock() {
  const [stockCount, setStockCount] = useState(3);
  
  useEffect(() => {
    // After 60 seconds, decrease to 2
    const timer = setTimeout(() => {
      setStockCount(2);
    }, 60000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return stockCount;
}
