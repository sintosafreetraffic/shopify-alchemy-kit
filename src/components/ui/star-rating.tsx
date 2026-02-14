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
      {Array.from({ length: maxRating }).map((_, i) => {
        const fill = Math.min(1, Math.max(0, rating - i)); // 0 to 1 for this star
        const isFull = fill >= 1;
        const isPartial = fill > 0 && fill < 1;
        const isEmpty = fill <= 0;
        const clipId = `star-clip-${i}-${Math.random().toString(36).slice(2, 7)}`;

        if (isPartial) {
          const starPath = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";
          return (
            <svg
              key={i}
              className={cn(sizeClasses[size])}
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <clipPath id={clipId}>
                  <rect x="0" y="0" width={24 * fill} height="24" />
                </clipPath>
              </defs>
              {/* Empty background */}
              <path
                d={starPath}
                fill={showEmpty ? "hsl(var(--muted))" : "none"}
                stroke={showEmpty ? "hsl(var(--muted))" : "hsl(var(--star))"}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Filled portion clipped */}
              <path
                d={starPath}
                fill="hsl(var(--star))"
                stroke="hsl(var(--star))"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                clipPath={`url(#${clipId})`}
              />
            </svg>
          );
        }

        return (
          <Star
            key={i}
            className={cn(
              sizeClasses[size],
              isFull
                ? "fill-[hsl(var(--star))] text-[hsl(var(--star))]"
                : showEmpty
                  ? "fill-muted text-muted"
                  : "fill-[hsl(var(--star))] text-[hsl(var(--star))]"
            )}
          />
        );
      })}
    </div>
  );
}
