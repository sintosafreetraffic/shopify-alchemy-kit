/**
 * Installment Badge - CRO Price Objection Reducer
 * 
 * Shows payment installment options (Klarna, Afterpay style)
 * to reduce price objection for higher-ticket items.
 */

interface InstallmentBadgeProps {
  price: number;
  className?: string;
  installments?: number;
}

export const InstallmentBadge = ({ 
  price, 
  className = "",
  installments = 4
}: InstallmentBadgeProps) => {
  const installmentAmount = (price / installments).toFixed(2);

  return (
    <div className={`flex items-center gap-2 text-sm ${className}`}>
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <span>or</span>
        <span className="font-semibold text-foreground">{installments}x €{installmentAmount}</span>
        <span>interest-free with</span>
        {/* Klarna-style badge */}
        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#FFB3C7] text-black text-xs font-bold">
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
  installments = 4
}: InstallmentBadgeProps) => {
  const installmentAmount = (price / installments).toFixed(2);

  return (
    <div className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}>
      <span>or {installments}x €{installmentAmount}</span>
      <span className="px-1 py-0.5 rounded bg-[#FFB3C7] text-black text-[10px] font-bold">
        Klarna
      </span>
    </div>
  );
};
