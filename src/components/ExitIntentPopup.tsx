import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const ExitIntentPopup = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Check if popup has been shown in this session
    const popupShown = sessionStorage.getItem('exitPopupShown');
    if (popupShown) {
      setHasShown(true);
      return;
    }

    const handleMouseLeave = (e: MouseEvent) => {
      // Only trigger if mouse leaves from top of page (indicating intent to leave)
      if (e.clientY <= 0 && !hasShown) {
        setIsOpen(true);
        setHasShown(true);
        sessionStorage.setItem('exitPopupShown', 'true');
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);
    return () => document.removeEventListener('mouseleave', handleMouseLeave);
  }, [hasShown]);

  const handleContinue = () => {
    setIsOpen(false);
    // Scroll to add to cart button
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            ⏰ Wait! Don't Miss Out
          </DialogTitle>
          <DialogDescription className="text-center space-y-4 pt-4">
            <p className="text-lg font-semibold text-foreground">
              Your 100-Night Risk-Free Trial is Waiting!
            </p>
            <div className="bg-primary/10 border-2 border-primary rounded-lg p-4 space-y-2">
              <p className="font-bold text-primary text-lg">
                ✓ 100 Nights Risk-Free Trial
              </p>
              <p className="font-bold text-primary text-lg">
                ✓ Free Shipping & Returns
              </p>
              <p className="font-bold text-primary text-lg">
                ✓ Free Sleep Mask Included
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              98% of our customers keep their pillow after trying it!
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleContinue} size="lg" className="w-full">
            Continue Shopping - Claim My Deal
          </Button>
          <Button
            onClick={() => setIsOpen(false)}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            No thanks, I'll pass on better sleep
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
