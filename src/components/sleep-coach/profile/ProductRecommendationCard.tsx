// Design tokens: calm clinical recommendation style, no aggressive CTAs
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SleepAssessment } from "@/hooks/useSleepApi";

interface ProductRecommendationCardProps {
  recommendations?: SleepAssessment['recommendations'];
}

const PRODUCT_RATIONALE: Record<string, string> = {
  'Ergonomic Sleep Pillow': 'Side sleepers often benefit from extra loft to support the neck-shoulder gap, helping maintain spinal alignment throughout the night.',
  'Knee Pillow': 'Positioning support between the knees can help align the hips and reduce lower back strain during side sleeping.',
  'Sleep Mask': 'Light-blocking may support deeper sleep cycles, particularly for those sensitive to ambient light.',
  'Complete Sleep Bundle': 'A comprehensive approach to sleep positioning can address multiple comfort areas simultaneously.',
};

export function ProductRecommendationCard({ recommendations }: ProductRecommendationCardProps) {
  if (!recommendations || recommendations.length === 0) {
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
      backgroundColor: 'rgba(167, 180, 194, 0.15)',
      color: '#6F6A66',
    };
  };

  return (
    <Card className="border-0 shadow-[0_1px_3px_rgba(0,0,0,0.03)]" style={{ backgroundColor: '#FAFAF8' }}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium" style={{ color: '#2D2B29' }}>
          Recommended for Your Profile
        </CardTitle>
        <p className="text-xs" style={{ color: '#A7A29C' }}>
          Based on your sleep assessment
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {recommendations.map((rec, i) => (
          <div 
            key={i}
            className="p-4 rounded-lg space-y-2"
            style={{ backgroundColor: 'rgba(247, 247, 246, 0.8)' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-sm font-medium" style={{ color: '#2D2B29' }}>
                {rec.product}
              </h4>
              <Badge 
                variant="outline"
                className="font-normal border-0 text-xs shrink-0"
                style={getPriorityStyle(rec.priority)}
              >
                {rec.priority === 'high' ? 'High priority' : 'Helpful'}
              </Badge>
            </div>

            {/* Rationale */}
            <p className="text-xs leading-relaxed" style={{ color: '#6F6A66' }}>
              {PRODUCT_RATIONALE[rec.product] || rec.reason}
            </p>

            {/* Subtle image placeholder */}
            <div 
              className="h-12 rounded-md mt-2"
              style={{ backgroundColor: 'rgba(167, 180, 194, 0.08)' }}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
