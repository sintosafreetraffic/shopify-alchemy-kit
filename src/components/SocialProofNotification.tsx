import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";

interface Purchase {
  name: string;
  location: string;
  product: string;
  time: string;
}

const recentPurchases: Purchase[] = [
  { name: "Sarah M.", location: "New York, NY", product: "RiseByNight™ Pillow", time: "2 minutes ago" },
  { name: "Michael R.", location: "Los Angeles, CA", product: "2x Pillow Bundle", time: "5 minutes ago" },
  { name: "Jennifer K.", location: "Chicago, IL", product: "RiseByNight™ Pillow", time: "8 minutes ago" },
  { name: "David L.", location: "Houston, TX", product: "2x Pillow Bundle", time: "12 minutes ago" },
  { name: "Emily S.", location: "Phoenix, AZ", product: "RiseByNight™ Pillow", time: "15 minutes ago" },
  { name: "Robert T.", location: "Philadelphia, PA", product: "2x Pillow Bundle", time: "18 minutes ago" },
];

export const SocialProofNotification = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentPurchase, setCurrentPurchase] = useState<Purchase>(recentPurchases[0]);
  const [purchaseIndex, setPurchaseIndex] = useState(0);

  useEffect(() => {
    // Show first notification after 5 seconds
    const initialDelay = setTimeout(() => {
      setIsVisible(true);
      
      // Hide after 5 seconds
      setTimeout(() => setIsVisible(false), 5000);
    }, 5000);

    return () => clearTimeout(initialDelay);
  }, []);

  useEffect(() => {
    if (!isVisible) {
      // Show next notification every 20-30 seconds
      const nextNotification = setTimeout(() => {
        const nextIndex = (purchaseIndex + 1) % recentPurchases.length;
        setPurchaseIndex(nextIndex);
        setCurrentPurchase(recentPurchases[nextIndex]);
        setIsVisible(true);
        
        // Hide after 5 seconds
        setTimeout(() => setIsVisible(false), 5000);
      }, Math.random() * 10000 + 20000); // Random between 20-30 seconds

      return () => clearTimeout(nextNotification);
    }
  }, [isVisible, purchaseIndex]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 md:bottom-24 md:top-auto z-50 animate-in slide-in-from-left duration-500">
      <div className="bg-background border-2 border-primary shadow-lg rounded-lg p-4 max-w-sm flex items-start gap-3">
        <div className="bg-primary/10 p-2 rounded-full">
          <ShoppingBag className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">{currentPurchase.name} from {currentPurchase.location}</p>
          <p className="text-xs text-muted-foreground">purchased {currentPurchase.product}</p>
          <p className="text-xs text-primary font-medium mt-1">{currentPurchase.time}</p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
