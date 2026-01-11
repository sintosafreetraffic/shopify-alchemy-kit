import { Star, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ReviewStats } from "@/types/reviews";

interface ReviewsHeaderProps {
  stats: ReviewStats;
  onWriteReview: () => void;
  isLoading?: boolean;
}

export const ReviewsHeader = ({
  stats,
  onWriteReview,
  isLoading,
}: ReviewsHeaderProps) => {
  const { totalReviews, averageRating, ratingDistribution } = stats;

  if (isLoading) {
    return (
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-10 w-36 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
      {/* Left: Rating Summary */}
      <div className="flex items-center gap-6">
        {/* Average Rating */}
        <div className="text-center">
          <div className="flex items-center gap-1 mb-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-5 h-5 ${
                  i < Math.round(averageRating)
                    ? "fill-yellow-500 text-yellow-500"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
          <p className="text-2xl font-bold">{averageRating || "–"}</p>
          <p className="text-sm text-muted-foreground">
            {totalReviews.toLocaleString()} Reviews
          </p>
        </div>

        {/* Rating Distribution */}
        <div className="hidden md:block space-y-1 min-w-[200px]">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[rating as keyof typeof ratingDistribution];
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            
            return (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-xs w-3">{rating}</span>
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                <Progress value={percentage} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground w-8">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Write a Review Button */}
      <Button onClick={onWriteReview} className="gap-2">
        <Edit3 className="w-4 h-4" />
        Write a Review
      </Button>
    </div>
  );
};
