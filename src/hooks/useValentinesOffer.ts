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

// Real-time countdown hook with seconds precision
export function useValentinesCountdown() {
  const { isActive, endDate } = useValentinesOffer();
  
  // For real-time updates, use useState + useEffect
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  
  useEffect(() => {
    if (!isActive) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const remaining = Math.max(0, endDate.getTime() - now.getTime());
      const totalSeconds = Math.floor(remaining / 1000);
      
      setTimeLeft({
        days: Math.floor(totalSeconds / 86400),
        hours: Math.floor((totalSeconds % 86400) / 3600),
        minutes: Math.floor((totalSeconds % 3600) / 60),
        seconds: totalSeconds % 60,
      });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    
    return () => clearInterval(interval);
  }, [isActive, endDate]);
  
  return { isActive, ...timeLeft };
}
