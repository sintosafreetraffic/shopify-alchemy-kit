/**
 * Exit Intent Popup for Variant B
 * 
 * Captures abandoning visitors with a special offer
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Gift, Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCountdownTimer } from '@/components/CountdownTimer';

interface ExitIntentPopupProps {
  onClaim?: () => void;
}

export function ExitIntentPopup({ onClaim }: ExitIntentPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const { timeLeft } = useCountdownTimer();
  
  const handleMouseLeave = useCallback((e: MouseEvent) => {
    // Only trigger when mouse leaves from the top of the page
    if (e.clientY <= 0 && !hasShown) {
      setIsOpen(true);
      setHasShown(true);
    }
  }, [hasShown]);
  
  useEffect(() => {
    // Check if already shown in this session
    const shown = sessionStorage.getItem('exit_intent_shown');
    if (shown) {
      setHasShown(true);
      return;
    }
    
    // Delay before enabling exit intent (give user time to browse)
    const timeout = setTimeout(() => {
      document.addEventListener('mouseleave', handleMouseLeave);
    }, 5000);
    
    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseLeave]);
  
  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('exit_intent_shown', 'true');
  };
  
  const handleClaim = () => {
    onClaim?.();
    handleClose();
    // Scroll to top where CTA is
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Header with urgency gradient */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-4 text-center">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Gift className="h-6 w-6" /> Wait! Don't Miss This...
            </DialogTitle>
          </DialogHeader>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Offer */}
          <div className="text-center">
            <h3 className="text-2xl font-bold mb-2">
              Your FREE Sleep Mask Is Waiting!
            </h3>
            <p className="text-muted-foreground">
              Complete your order now and receive a premium silk sleep mask 
              (worth $29.99) absolutely FREE.
            </p>
          </div>
          
          {/* Countdown */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <div className="flex items-center justify-center gap-2 text-red-600 font-medium">
              <Clock className="h-4 w-4" />
              <span>Offer expires in:</span>
              <span className="font-bold">
                {String(timeLeft.hours).padStart(2, '0')}:
                {String(timeLeft.minutes).padStart(2, '0')}:
                {String(timeLeft.seconds).padStart(2, '0')}
              </span>
            </div>
          </div>
          
          {/* CTA */}
          <Button 
            className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-500"
            onClick={handleClaim}
          >
            Yes, Claim My FREE Gift!
          </Button>
          
          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" /> 100-Night Trial
            </span>
            <span>•</span>
            <span>Free Shipping</span>
            <span>•</span>
            <span>Easy Returns</span>
          </div>
          
          {/* No thanks link */}
          <button
            onClick={handleClose}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            No thanks, I'll pay full price later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ExitIntentPopup;
