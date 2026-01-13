/**
 * ABProductWrapper
 * 
 * Wraps product pages to handle A/B variant routing.
 * Renders either Variant A (control) or Variant B (urgency) based on cookie.
 * 
 * This component ensures no flicker by determining variant synchronously
 * before any content renders.
 */

import { ReactNode, useMemo } from 'react';
import { useProductABVariant } from '@/hooks/useABVariant';

interface ABProductWrapperProps {
  /** Product handle for tracking */
  productHandle: string;
  /** Variant A content (control - current page) */
  variantA: ReactNode;
  /** Variant B content (urgency-enhanced page) */
  variantB: ReactNode;
}

export function ABProductWrapper({ 
  productHandle, 
  variantA, 
  variantB 
}: ABProductWrapperProps) {
  const { variant, isReady } = useProductABVariant(productHandle);

  // Select content based on variant
  // This is synchronous - no loading state needed
  const content = useMemo(() => {
    return variant === 'B' ? variantB : variantA;
  }, [variant, variantA, variantB]);

  // We don't show a loading state because variant is determined synchronously
  // from cookie/localStorage before first render
  return <>{content}</>;
}

/**
 * Higher-order component for A/B testing product pages
 */
export function withABTesting<P extends object>(
  VariantAComponent: React.ComponentType<P>,
  VariantBComponent: React.ComponentType<P>,
  productHandle: string
) {
  return function ABTestedProduct(props: P) {
    return (
      <ABProductWrapper
        productHandle={productHandle}
        variantA={<VariantAComponent {...props} />}
        variantB={<VariantBComponent {...props} />}
      />
    );
  };
}
