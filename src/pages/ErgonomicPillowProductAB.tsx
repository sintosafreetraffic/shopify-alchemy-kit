/**
 * Ergonomic Pillow Product Page - A/B Test Wrapper
 * 
 * This component wraps both variants and renders the appropriate one
 * based on the user's A/B test assignment.
 */

import { ABProductWrapper } from '@/components/ab-testing/ABProductWrapper';
import ErgonomicPillowProduct from './ErgonomicPillowProduct';
import ErgonomicPillowProductVariantB from './ErgonomicPillowProductVariantB';

const ErgonomicPillowProductAB = () => {
  return (
    <ABProductWrapper
      productHandle="ergonomic-pillow"
      variantA={<ErgonomicPillowProduct />}
      variantB={<ErgonomicPillowProductVariantB />}
    />
  );
};

export default ErgonomicPillowProductAB;
