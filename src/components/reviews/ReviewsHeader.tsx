import { Star, Edit3, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReviewSortDropdown } from "./ReviewSortDropdown";
import type { ReviewStats } from "@/types/reviews";
import type { ReviewSortOption } from "@/hooks/useProductReviews";

interface ReviewsHeaderProps {
  stats: ReviewStats;
  onWriteReview: () => void;
  isLoading?: boolean;
  ratingFilter: number | null;
  onRatingFilterChange: (rating: number | null) => void;
  sortBy: ReviewSortOption;
  onSortChange: (sort: ReviewSortOption) => void;
}

export const ReviewsHeader = ({
  stats,
  onWriteReview,
  isLoading,
  ratingFilter,
  onRatingFilterChange,
  sortBy,
  onSortChange,
}: ReviewsHeaderProps) => {
  const { totalReviews, averageRating, ratingDistribution } = stats;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 mb-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-10 w-36 bg-muted rounded" />
      </div>
    );
  }

  const handleRatingClick = (rating: number) => {
    if (ratingFilter === rating) {
      onRatingFilterChange(null);
    } else {
      onRatingFilterChange(rating);
    }
  };

  return (
    <div className="flex flex-col gap-4 mb-6">
      {/* Row 1: Rating + Star Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Average Rating */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.round(averageRating)
                    ? "fill-[hsl(var(--star))] text-[hsl(var(--star))]"
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

        {/* Star Filter Buttons */}
        <div className="flex items-center gap-1">
          {[5, 4, 3, 2, 1].map((rating) => {
            const count = ratingDistribution[rating as keyof typeof ratingDistribution];
            const isActive = ratingFilter === rating;
            const isDisabled = count === 0;
            
            return (
              <button
                key={rating}
                onClick={() => !isDisabled && handleRatingClick(rating)}
                disabled={isDisabled}
                className={`flex items-center justify-center gap-0.5 px-2 py-1 rounded text-xs transition-colors ${
                  isActive
                    ? "bg-primary/10 ring-1 ring-primary"
                    : isDisabled
                    ? "opacity-40 cursor-not-allowed"
                    : "hover:bg-muted cursor-pointer"
                }`}
              >
                <span>{rating}</span>
                <Star className="w-3 h-3 fill-[hsl(var(--star))] text-[hsl(var(--star))]" />
              </button>
            );
          })}
        </div>

        {/* Active Filter Badge */}
        {ratingFilter !== null && (
          <Badge
            variant="secondary"
            className="gap-1 cursor-pointer hover:bg-secondary/80 text-xs"
            onClick={() => onRatingFilterChange(null)}
          >
            {ratingFilter}★ only
            <X className="w-3 h-3" />
          </Badge>
        )}
      </div>

      {/* Row 2: Write Review + Sort Dropdown */}
      <div className="flex items-center gap-3">
        <Button onClick={onWriteReview} size="sm" className="gap-1.5">
          <Edit3 className="w-3.5 h-3.5" />
          Write a Review
        </Button>
        <ReviewSortDropdown value={sortBy} onChange={onSortChange} />
      </div>
    </div>
  );
};
