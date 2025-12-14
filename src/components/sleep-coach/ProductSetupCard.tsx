/**
 * ProductSetupCard - Shows how to use owned products
 * 
 * Displays persona-specific tips for products the user owns.
 * No upselling - just helping users get value from what they have.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";
import { 
  getProductTipsForUser, 
  type PersonaCluster, 
  type ProductTip 
} from "@/types/coach-plan";

interface ProductSetupCardProps {
  productsOwned: string[];
  personaCluster: PersonaCluster;
}

export function ProductSetupCard({ productsOwned, personaCluster }: ProductSetupCardProps) {
  // Get persona-specific tips for owned products
  const productTips = getProductTipsForUser(productsOwned, personaCluster);
  
  // Don't render if no products owned
  if (productTips.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Package className="h-4 w-4" />
          Works Best With Your Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {productTips.map((tip, index) => (
            <ProductTipItem key={index} tip={tip} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProductTipItem({ tip }: { tip: ProductTip }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-1 rounded-full bg-primary/40" />
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{tip.product}</p>
        <p className="text-xs text-muted-foreground">{tip.personaCopy}</p>
        <p className="text-xs text-primary/80 italic">Tip: {tip.tip}</p>
      </div>
    </div>
  );
}
