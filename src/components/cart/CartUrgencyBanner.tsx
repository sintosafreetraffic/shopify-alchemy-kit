 import { useState, useEffect } from "react";
 import { Clock, Truck, AlertTriangle } from "lucide-react";
 import { addBusinessDays, format } from "date-fns";
 
 interface CartUrgencyBannerProps {
   hasItems: boolean;
 }
 
 const RESERVATION_KEY = "cart-reservation-timestamp";
 const RESERVATION_MINUTES = 10;
 const SHIPPING_CUTOFF_HOUR = 14; // 2 PM local time
 
 export function CartUrgencyBanner({ hasItems }: CartUrgencyBannerProps) {
   const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
   const [shippingInfo, setShippingInfo] = useState<{ hoursLeft: number; minutesLeft: number; deliveryDate: string } | null>(null);
 
   // Initialize or reset reservation timer
   useEffect(() => {
     if (!hasItems) {
       // Clear reservation when cart is empty
       sessionStorage.removeItem(RESERVATION_KEY);
       setTimeRemaining(null);
       return;
     }
 
     // Get or set reservation timestamp
     let timestamp = sessionStorage.getItem(RESERVATION_KEY);
     if (!timestamp) {
       timestamp = Date.now().toString();
       sessionStorage.setItem(RESERVATION_KEY, timestamp);
     }
 
     const startTime = parseInt(timestamp, 10);
     const endTime = startTime + RESERVATION_MINUTES * 60 * 1000;
 
     const updateTimer = () => {
       const now = Date.now();
       const remaining = Math.max(0, endTime - now);
       setTimeRemaining(remaining);
     };
 
     updateTimer();
     const interval = setInterval(updateTimer, 1000);
 
     return () => clearInterval(interval);
   }, [hasItems]);
 
   // Calculate shipping cutoff info
   useEffect(() => {
     const now = new Date();
     const today = new Date(now);
     today.setHours(SHIPPING_CUTOFF_HOUR, 0, 0, 0);
 
     let cutoffTime: Date;
     let deliveryStart: Date;
 
     if (now < today) {
       // Before cutoff today
       cutoffTime = today;
       deliveryStart = now;
     } else {
       // After cutoff, next business day
       cutoffTime = new Date(today);
       cutoffTime.setDate(cutoffTime.getDate() + 1);
       cutoffTime.setHours(SHIPPING_CUTOFF_HOUR, 0, 0, 0);
       deliveryStart = cutoffTime;
     }
 
     const msUntilCutoff = cutoffTime.getTime() - now.getTime();
     const hoursLeft = Math.floor(msUntilCutoff / (1000 * 60 * 60));
     const minutesLeft = Math.floor((msUntilCutoff % (1000 * 60 * 60)) / (1000 * 60));
 
     // Delivery is 5-7 business days from ship date
     const deliveryDate = format(addBusinessDays(deliveryStart, 5), "EEE, MMM d");
 
     setShippingInfo({ hoursLeft, minutesLeft, deliveryDate });
 
     // Update every minute
     const interval = setInterval(() => {
       const newNow = new Date();
       const newMs = cutoffTime.getTime() - newNow.getTime();
       if (newMs > 0) {
         setShippingInfo({
           hoursLeft: Math.floor(newMs / (1000 * 60 * 60)),
           minutesLeft: Math.floor((newMs % (1000 * 60 * 60)) / (1000 * 60)),
           deliveryDate,
         });
       }
     }, 60000);
 
     return () => clearInterval(interval);
   }, []);
 
   if (!hasItems) return null;
 
   const formatTime = (ms: number) => {
     const minutes = Math.floor(ms / 60000);
     const seconds = Math.floor((ms % 60000) / 1000);
     return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
   };
 
   const isExpired = timeRemaining !== null && timeRemaining <= 0;
 
   return (
     <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
       {/* Reservation Timer */}
       <div className="flex items-center gap-2">
         {isExpired ? (
           <>
             <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
             <span className="text-sm text-amber-700 font-medium">
               Items may sell out soon
             </span>
           </>
         ) : timeRemaining !== null ? (
           <>
             <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
             <span className="text-sm text-amber-700">
               Your items are reserved for{" "}
               <span className="font-bold tabular-nums">{formatTime(timeRemaining)}</span>
             </span>
           </>
         ) : null}
       </div>
 
       {/* Shipping Cutoff */}
       {shippingInfo && shippingInfo.hoursLeft >= 0 && (
         <div className="flex items-center gap-2">
           <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />
           <span className="text-sm text-amber-700">
             Order within{" "}
             <span className="font-semibold">
               {shippingInfo.hoursLeft}h {shippingInfo.minutesLeft}m
             </span>{" "}
             for delivery by <span className="font-semibold">{shippingInfo.deliveryDate}</span>
           </span>
         </div>
       )}
     </div>
   );
 }