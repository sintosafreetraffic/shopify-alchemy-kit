import { Star, Edit3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { ReviewStats } from "@/types/reviews";

interface ReviewsHeaderProps {
  stats: ReviewStats;
  onWriteReview: () => void;
  isLoading?: boolean;
  ratingFilter: number | null;
  onRatingFilterChange: (rating: number | null) => void;
}

export const ReviewsHeader = ({
  stats,
  onWriteReview,
  isLoading,
  ratingFilter,
  onRatingFilterChange,
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

  const handleRatingClick = (rating: number) => {
    if (ratingFilter === rating) {
      onRatingFilterChange(null); // Clear filter if clicking same rating
    } else {
      onRatingFilterChange(rating);
    }
  };

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

        {/* Rating Distribution - Clickable */}
        <div className="hidden md:block space-y-1 min-w-[200px]">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[rating as keyof typeof ratingDistribution];
            const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
            const isActive = ratingFilter === rating;
            const isDisabled = count === 0;
            
            return (
              <button
                key={rating}
                onClick={() => !isDisabled && handleRatingClick(rating)}
                disabled={isDisabled}
                className={`flex items-center gap-2 w-full rounded px-1 py-0.5 transition-colors ${
                  isActive
                    ? "bg-primary/10 ring-1 ring-primary"
                    : isDisabled
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-muted cursor-pointer"
                }`}
              >
                <span className="text-xs w-3">{rating}</span>
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                <Progress value={percentage} className="h-2 flex-1" />
                <span className="text-xs text-muted-foreground w-8">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Filter Badge + Write a Review Button */}
      <div className="flex items-center gap-3">
        {ratingFilter !== null && (
          <Badge
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-secondary/80"
            onClick={() => onRatingFilterChange(null)}
          >
            {ratingFilter} Star Reviews
            <X className="w-3 h-3" />
          </Badge>
        )}
        <Button onClick={onWriteReview} className="gap-2">
          <Edit3 className="w-4 h-4" />
          Write a Review
        </Button>
      </div>
    </div>
  );
};
