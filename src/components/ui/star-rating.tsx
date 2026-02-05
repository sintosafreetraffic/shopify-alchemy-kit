import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating?: number;
  maxRating?: number;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  showEmpty?: boolean;
}

const sizeClasses = {
  xs: "w-3 h-3",
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

export function StarRating({
  rating = 5,
  maxRating = 5,
  size = "lg",
  className,
  showEmpty = false,
}: StarRatingProps) {
  return (
    <div className={cn("flex", className)}>
      {Array.from({ length: maxRating }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClasses[size],
            i < rating
              ? "fill-[hsl(var(--star))] text-[hsl(var(--star))]"
              : showEmpty
                ? "fill-muted text-muted"
                : "fill-[hsl(var(--star))] text-[hsl(var(--star))]"
          )}
        />
      ))}
    </div>
  );
}
