// Design tokens: calm clinical recommendation style, no aggressive CTAs
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SleepProfile, SleepAssessment } from "@/hooks/useSleepApi";

interface ProductRecommendationCardProps {
  profile: SleepProfile;
  recommendations?: SleepAssessment['recommendations'];
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

export function ProductRecommendationCard({ profile, recommendations }: ProductRecommendationCardProps) {
  const ownedProducts = profile.products_owned || [];
  
  if ((!recommendations || recommendations.length === 0) && ownedProducts.length === 0) {
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
    backgroundColor: 'rgba(232, 213, 159, 0.2)',
    color: '#8B7B4D',
  });

  // Separate owned from recommended
  const ownedItems = ownedProducts.map(product => ({
    product,
    owned: true,
    priority: 'owned' as const,
  }));

  const recommendedItems = (recommendations || [])
    .filter(rec => !ownedProducts.some(owned => 
      owned.toLowerCase().includes(rec.product.toLowerCase()) ||
      rec.product.toLowerCase().includes(owned.toLowerCase())
    ))
    .map(rec => ({
      product: rec.product,
      owned: false,
      priority: rec.priority,
      reason: rec.reason,
    }));

  const allItems = [...ownedItems, ...recommendedItems];

  if (allItems.length === 0) {
    return null;
  }

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-4 pt-7 px-7">
        <CardTitle className="text-sm font-medium" style={{ color: '#2D2B29' }}>
          Product Profile
        </CardTitle>
        <p className="text-xs" style={{ color: '#A7A29C' }}>
          Products tailored to your sleep identity
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4 px-7 pb-7">
        {/* Owned Products Section */}
        {ownedItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
              Your products
            </p>
            {ownedItems.map((item, i) => (
              <div 
                key={i}
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
              >
                <div className="flex items-start gap-4">
                  {/* Product image placeholder */}
                  <div 
                    className="w-16 h-16 rounded-md flex-shrink-0 overflow-hidden"
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
                        className="font-normal border-0 text-xs shrink-0"
                        style={getOwnedStyle()}
                      >
                        Owned
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed mt-1" style={{ color: '#6F6A66' }}>
                      {PRODUCT_RATIONALE[item.product] || 'Part of your personalized sleep support system.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recommended Products Section */}
        {recommendedItems.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#A7A29C' }}>
              Recommended for your profile
            </p>
            {recommendedItems.map((item, i) => (
              <div 
                key={i}
                className="p-4 rounded-lg"
                style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
              >
                <div className="flex items-start gap-4">
                  {/* Product image placeholder */}
                  <div 
                    className="w-16 h-16 rounded-md flex-shrink-0 overflow-hidden"
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
                        className="font-normal border-0 text-xs shrink-0"
                        style={getPriorityStyle(item.priority)}
                      >
                        {item.priority === 'high' ? 'High priority' : 'Helpful'}
                      </Badge>
                    </div>
                    <p className="text-xs leading-relaxed mt-1" style={{ color: '#6F6A66' }}>
                      {PRODUCT_RATIONALE[item.product] || item.reason}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
