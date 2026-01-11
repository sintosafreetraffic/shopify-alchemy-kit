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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      {/* Left: Compact Rating Summary */}
      <div className="flex items-center gap-4">
        {/* Average Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.round(averageRating)
                    ? "fill-yellow-500 text-yellow-500"
                    : "fill-muted text-muted"
                }`}
              />
            ))}
          </div>
          <span className="text-lg font-semibold">{averageRating || "–"}</span>
          <span className="text-sm text-muted-foreground">
            ({totalReviews.toLocaleString()})
          </span>
        </div>

        {/* Rating Distribution - Compact */}
        <div className="hidden md:flex items-center gap-1">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[rating as keyof typeof ratingDistribution];
            const isActive = ratingFilter === rating;
            const isDisabled = count === 0;
            
            return (
              <button
                key={rating}
                onClick={() => !isDisabled && handleRatingClick(rating)}
                disabled={isDisabled}
                className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs transition-colors ${
                  isActive
                    ? "bg-primary/10 ring-1 ring-primary"
                    : isDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-muted cursor-pointer"
                }`}
              >
                <span>{rating}</span>
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                <span className="text-muted-foreground">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: Mobile Rating Filter + Filter Badge + Write a Review Button */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mobile Rating Filter */}
        <div className="flex md:hidden items-center gap-0.5">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[rating as keyof typeof ratingDistribution];
            const isActive = ratingFilter === rating;
            const isDisabled = count === 0;
            
            return (
              <button
                key={rating}
                onClick={() => !isDisabled && handleRatingClick(rating)}
                disabled={isDisabled}
                className={`flex items-center justify-center w-7 h-7 rounded text-xs transition-colors ${
                  isActive
                    ? "bg-primary/10 ring-1 ring-primary"
                    : isDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-muted cursor-pointer"
                }`}
              >
                <span>{rating}</span>
                <Star className="w-2.5 h-2.5 fill-yellow-500 text-yellow-500" />
              </button>
            );
          })}
        </div>
        
        {ratingFilter !== null && (
          <Badge
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-secondary/80 text-xs"
            onClick={() => onRatingFilterChange(null)}
          >
            {ratingFilter}★
            <X className="w-3 h-3" />
          </Badge>
        )}
        <Button onClick={onWriteReview} size="sm" className="gap-1.5">
          <Edit3 className="w-3.5 h-3.5" />
          Write a Review
        </Button>
      </div>
    </div>
  );
};
