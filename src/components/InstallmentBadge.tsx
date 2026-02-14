/**
 * Installment Badge - CRO Price Objection Reducer
 * 
 * Shows payment installment options (Klarna, Afterpay style)
 * to reduce price objection for higher-ticket items.
 */

import { formatPrice } from "@/lib/formatPrice";

interface InstallmentBadgeProps {
  price: number;
  className?: string;
  installments?: number;
  currencyCode?: string;
}

export const InstallmentBadge = ({ 
  price, 
  className = "",
  installments = 4,
  currencyCode = "EUR"
}: InstallmentBadgeProps) => {
  const installmentAmount = price / installments;

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span>or</span>
        <span className="font-semibold text-foreground">{installments}x {formatPrice(installmentAmount, currencyCode)}</span>
        <span>interest-free with</span>
        {/* Klarna-style badge */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-klarna text-black text-xs font-bold">
          Klarna
        </span>
      </div>
    </div>
  );
};

/**
 * Compact version for tight spaces
 */
export const InstallmentBadgeCompact = ({ 
  price, 
  className = "",
  installments = 4,
  currencyCode = "EUR"
}: InstallmentBadgeProps) => {
  const installmentAmount = price / installments;

  return (
    <div className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
      <span>or {installments}x {formatPrice(installmentAmount, currencyCode)}</span>
      <span className="px-1 py-0.5 rounded bg-klarna text-black text-[10px] font-bold">
        Klarna
      </span>
    </div>
  );
};
