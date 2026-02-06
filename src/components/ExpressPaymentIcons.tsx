/**
 * Express Payment Icons - CRO Trust Signals
 * 
 * Shows payment method badges near the CTA to build trust.
 * Apple Pay, Google Pay, PayPal, etc.
 */

import { CreditCard } from "lucide-react";

interface ExpressPaymentIconsProps {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export const ExpressPaymentIcons = ({ 
  className = "",
  showLabel = true,
  size = "md"
}: ExpressPaymentIconsProps) => {
  const iconSize = size === "sm" ? "h-5" : "h-6";
  
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {showLabel && (
        <span className="text-xs text-muted-foreground">Express checkout available</span>
      )}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {/* Apple Pay */}
        <div className={`${iconSize} px-2 bg-black text-white rounded flex items-center justify-center`}>
          <svg className="h-3" viewBox="0 0 50 20" fill="currentColor">
            <path d="M9.6 5.3c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.4-.6.6-1 1.6-.9 2.6.9.1 1.9-.5 2.6-1.3zM10.5 6.4c-1.4-.1-2.6.8-3.3.8-.7 0-1.7-.8-2.8-.7-1.5 0-2.8.8-3.6 2.1-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.2 0 2-1 2.7-2.1.9-1.2 1.2-2.4 1.2-2.5 0 0-2.4-.9-2.4-3.6 0-2.3 1.9-3.4 2-3.5-.9-1.5-2.5-1.6-3-1.6-.2.1-.1.4-.2.4z"/>
          </svg>
          <span className="text-[10px] font-medium ml-0.5">Pay</span>
        </div>
        
        {/* Google Pay */}
        <div className={`${iconSize} px-2 bg-white border rounded flex items-center justify-center`}>
          <svg className="h-3" viewBox="0 0 50 20">
            <path fill="#4285F4" d="M24.4 10.2v3.9h-1.2V4.5h3.2c.8 0 1.5.3 2.1.8.6.5.8 1.2.8 2s-.3 1.4-.8 2c-.6.5-1.3.8-2.1.8h-2zm0-4.5v3.4h2c.5 0 .9-.2 1.2-.5.3-.3.5-.7.5-1.2s-.2-.9-.5-1.2c-.3-.3-.7-.5-1.2-.5h-2z"/>
            <path fill="#34A853" d="M33.4 8.1c.9 0 1.6.2 2.1.7.5.5.8 1.2.8 2v4.3h-1.2v-1h0c-.5.8-1.1 1.2-2 1.2-.7 0-1.4-.2-1.8-.6-.5-.4-.7-1-.7-1.6 0-.7.3-1.3.8-1.7.5-.4 1.2-.6 2.1-.6.7 0 1.3.1 1.8.4v-.3c0-.5-.2-.8-.5-1.1-.3-.3-.7-.5-1.2-.5-.7 0-1.2.3-1.6.9l-1.1-.7c.6-.9 1.5-1.4 2.5-1.4zm-1.6 5.2c0 .3.2.6.4.8.3.2.6.3 1 .3.5 0 1-.2 1.4-.6.4-.4.6-.9.6-1.4-.4-.3-.9-.4-1.6-.4-.5 0-.9.1-1.2.4-.4.2-.6.5-.6.9z"/>
            <path fill="#4285F4" d="M43 8.3l-4.2 9.7h-1.2l1.6-3.4-2.8-6.3h1.3l2 4.8h0l2-4.8H43z"/>
            <path fill="#EA4335" d="M17.1 9.9c0-.4 0-.7-.1-1.1h-5.5v2h3.2c-.1.7-.5 1.3-1.1 1.7v1.4h1.8c1-1 1.7-2.4 1.7-4z"/>
            <path fill="#FBBC04" d="M11.5 15.2c1.5 0 2.8-.5 3.7-1.3l-1.8-1.4c-.5.3-1.1.5-1.9.5-1.5 0-2.7-1-3.2-2.3H6.4v1.5c.9 1.8 2.8 3 5.1 3z"/>
            <path fill="#34A853" d="M8.3 10.7c-.1-.4-.2-.7-.2-1.1s.1-.8.2-1.1V7H6.4c-.3.6-.4 1.2-.4 1.9s.1 1.3.4 1.9l1.9-1.1z"/>
            <path fill="#EA4335" d="M11.5 6.2c.8 0 1.6.3 2.2.8l1.6-1.6c-1-.9-2.3-1.5-3.8-1.5-2.3 0-4.2 1.2-5.1 3l1.9 1.5c.5-1.4 1.7-2.2 3.2-2.2z"/>
          </svg>
        </div>
        
        {/* PayPal */}
        <div className={`${iconSize} px-2 bg-paypal rounded flex items-center justify-center`}>
          <svg className="h-3" viewBox="0 0 100 26">
            <path fill="#003087" d="M13.7 24.7H7.2c-.4 0-.8-.3-.8-.7l2.8-17.7c0-.3.3-.5.6-.5h6.5c2.2 0 3.7.4 4.8 1.3 1 .9 1.4 2.1 1.2 3.8-.4 2.3-1.5 3.9-3.3 4.9-1.8 1-4 1.4-6.7 1.4h-1.7c-.4 0-.8.3-.8.7l-.9 5.6c0 .6-.5 1.2-1.2 1.2z"/>
            <path fill="#0070E0" d="M38.4 6.8H32c-.4 0-.7.3-.8.6l-2.5 16c0 .3.2.5.5.5h3.4c.3 0 .5-.2.5-.4l.7-4.5c0-.3.4-.6.8-.6h1.8c3.8 0 6-1.8 6.5-5.5.2-1.6 0-2.9-.7-3.8-.8-1-2.3-1.5-4.4-1.5-.4.2-.4.2-.4.2zm.7 5.4c-.3 2-1.8 2-3.3 2h-.8l.6-3.8c0-.2.2-.3.4-.3h.4c1 0 1.9 0 2.4.6.3.3.4.9.3 1.5z"/>
            <path fill="#003087" d="M62.8 12.1h-3.4c-.2 0-.4.1-.4.3l-.1.9-.2-.3c-.7-1-2.2-1.3-3.7-1.3-3.5 0-6.5 2.6-7 6.3-.3 1.9.1 3.6 1.2 4.9 1 1.1 2.4 1.6 4.1 1.6 2.9 0 4.5-1.9 4.5-1.9l-.1.9c0 .3.2.5.5.5h3c.4 0 .7-.3.8-.6l1.8-11c0-.2-.2-.5-.5-.5 0 .2 0 .2 0 .2zm-4.5 6.1c-.3 1.8-1.6 3-3.4 3-.9 0-1.7-.3-2.1-.8-.5-.5-.7-1.3-.5-2.1.2-1.8 1.7-3 3.4-3 .9 0 1.6.3 2.1.8.5.6.6 1.3.5 2.1z"/>
            <path fill="#0070E0" d="M85.2 12.1h-3.4c-.2 0-.4.1-.4.3l-.1.9-.2-.3c-.7-1-2.2-1.3-3.7-1.3-3.5 0-6.5 2.6-7 6.3-.3 1.9.1 3.6 1.2 4.9 1 1.1 2.4 1.6 4.1 1.6 2.9 0 4.5-1.9 4.5-1.9l-.1.9c0 .3.2.5.5.5h3c.4 0 .7-.3.8-.6l1.8-11c0-.2-.2-.5-.5-.5 0 .2 0 .2 0 .2zm-4.5 6.1c-.3 1.8-1.6 3-3.4 3-.9 0-1.7-.3-2.1-.8-.5-.5-.7-1.3-.5-2.1.2-1.8 1.7-3 3.4-3 .9 0 1.6.3 2.1.8.5.6.6 1.3.5 2.1z"/>
            <path fill="#0070E0" d="M71.3 12.1H68c-.3 0-.5.1-.6.4l-3.6 5.4-1.5-5.2c-.1-.4-.5-.6-.8-.6h-3.4c-.3 0-.6.3-.5.7l2.9 8.5-2.7 3.8c-.2.3 0 .8.4.8h3.4c.3 0 .5-.1.6-.4l8.7-12.6c.2-.4 0-.8-.4-.8 0 0 0 .2-.2 0z"/>
          </svg>
        </div>
        
        {/* Visa/Mastercard indicator */}
        <div className={`${iconSize} px-2 bg-muted/50 rounded flex items-center justify-center gap-1`}>
          <CreditCard className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">Cards</span>
        </div>
      </div>
    </div>
  );
};
