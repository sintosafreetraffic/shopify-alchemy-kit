// Design tokens: calm clinical recommendation style, no aggressive CTAs
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SleepProfile, SleepAssessment } from "@/hooks/useSleepApi";
import { ProductOwnership, PRODUCT_SLUG_TO_NAME, formatAcquiredDate } from "@/lib/productMapping";

interface ProductRecommendationCardProps {
  profile: SleepProfile;
  recommendations?: SleepAssessment['recommendations'];
  ownedProducts?: ProductOwnership[];
}

const PRODUCT_RATIONALE: Record<string, string> = {
  'Ergonomic Sleep Pillow': 'Designed to support the natural cervical curve, this pillow helps maintain neck-shoulder alignment throughout the night.',
  'Knee Pillow': 'Strategic knee positioning can help align the hips and pelvis, reducing lower back strain during side sleeping.',
  'Sleep Mask': 'Complete darkness supports melatonin production and may enhance sleep depth, particularly for light-sensitive sleepers.',
  'Complete Sleep Bundle': 'A comprehensive approach addressing multiple comfort areas can provide synergistic benefits for overall sleep quality.',
};

const PRODUCT_IMAGES: Record<string, string> = {
  'Ergonomic Sleep Pillow': '/images/pillow-main-new.png',
  'Knee Pillow': '/images/knee-pillow-main-new.png',
};

export function ProductRecommendationCard({ profile, recommendations, ownedProducts = [] }: ProductRecommendationCardProps) {
  // Get owned product slugs for filtering
  const ownedSlugs = new Set(ownedProducts.map(p => p.product_slug));
  const legacyOwned = profile.products_owned || [];
  
  // Combine owned sources
  const allOwnedNames = new Set([
    ...legacyOwned,
    ...ownedProducts.map(p => PRODUCT_SLUG_TO_NAME[p.product_slug] || p.product_slug),
  ]);
  
  if ((!recommendations || recommendations.length === 0) && allOwnedNames.size === 0) {
    return null;
  }

  const getPriorityStyle = (priority: string) => {
    if (priority === 'high') {
      return {
        backgroundColor: 'rgba(60, 131, 246, 0.1)',
        color: 'rgba(60, 131, 246, 0.85)',
      };
    }
    return {
      backgroundColor: 'rgba(167, 180, 194, 0.12)',
      color: '#6F6A66',
    };
  };

  const getOwnedStyle = () => ({
    backgroundColor: 'rgba(167, 180, 194, 0.15)',
    color: 'rgba(60, 131, 246, 0.85)',
  });

  // Build owned items with acquisition dates
  const ownedItems = Array.from(allOwnedNames).map(productName => {
    // Try to find acquisition date from ownership data
    const ownershipRecord = ownedProducts.find(p => 
      PRODUCT_SLUG_TO_NAME[p.product_slug] === productName ||
      p.product_slug === productName
    );
    
    return {
      product: productName,
      owned: true,
      priority: 'owned' as const,
      acquiredAt: ownershipRecord?.acquired_at,
    };
  });

  // Filter recommendations to exclude owned products
  const recommendedItems = (recommendations || [])
    .filter(rec => !allOwnedNames.has(rec.product))
    .filter(rec => {
      // Also check by slug
      const recLower = rec.product.toLowerCase().replace(/\s+/g, '_');
      return !ownedSlugs.has(recLower);
    })
    .map(rec => ({
      product: rec.product,
      owned: false,
      priority: rec.priority,
      reason: rec.reason,
    }));

  // Only show recommendations section
  if (recommendedItems.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-4 pt-7 px-7">
        <CardTitle className="text-sm font-medium" style={{ color: '#2D2B29' }}>
          Recommended for You
        </CardTitle>
        <p className="text-xs" style={{ color: '#A7A29C' }}>
          Products tailored to your sleep profile
        </p>
      </CardHeader>
      
      <CardContent className="space-y-3 px-7 pb-7">
        {recommendedItems.map((item, i) => (
          <div 
            key={i}
            className="p-4 rounded-lg"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            <div className="flex items-start gap-4">
              {/* Product image placeholder */}
              <div 
                className="w-14 h-14 rounded-md flex-shrink-0 overflow-hidden"
                style={{ backgroundColor: 'rgba(167, 180, 194, 0.08)' }}
              >
                {PRODUCT_IMAGES[item.product] && (
                  <img 
                    src={PRODUCT_IMAGES[item.product]} 
                    alt={item.product}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium" style={{ color: '#2D2B29' }}>
                    {item.product}
                  </h4>
                  <Badge 
                    variant="outline"
                    className="font-normal border-0 text-[10px] shrink-0 px-2 py-0.5"
                    style={getPriorityStyle(item.priority)}
                  >
                    {item.priority === 'high' ? 'High priority' : 'Helpful'}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed mt-1.5" style={{ color: '#6F6A66' }}>
                  {PRODUCT_RATIONALE[item.product] || item.reason}
                </p>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
