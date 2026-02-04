import { Star, CheckCircle, ThumbsUp, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMediaUrl } from "@/hooks/useProductReviews";
import { getStaticReviewImage } from "@/config/reviewImages";
import type { ProductReview } from "@/types/reviews";
import { formatDistanceToNow } from "date-fns";

interface ReviewCardProps {
  review: ProductReview;
  sessionId: string;
  hasVoted?: boolean;
  onVoteSuccess?: (reviewId: string) => void;
}

export const ReviewCard = ({
  review,
  sessionId,
  hasVoted: initialHasVoted = false,
  onVoteSuccess,
}: ReviewCardProps) => {
  const [helpfulCount, setHelpfulCount] = useState(review.helpful_count);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [showVideo, setShowVideo] = useState(false);

  const primaryMedia = review.review_media?.[0];
  const hasDbMedia = !!primaryMedia;
  const isVideo = primaryMedia?.media_type === "video";
  
  // Get static image if no database media exists (uses review title for uniqueness)
  const staticImage = getStaticReviewImage(review.title);
  const hasMedia = hasDbMedia || !!staticImage;

  const handleHelpfulClick = async () => {
    if (hasVoted || !sessionId) return;

    try {
      const { error } = await supabase.from("review_helpful_votes").insert({
        review_id: review.id,
        session_id: sessionId,
      });

      if (error) {
        if (error.code === "23505") {
          // Already voted (unique constraint)
          setHasVoted(true);
          return;
        }
        throw error;
      }

      setHelpfulCount((prev) => prev + 1);
      setHasVoted(true);
      onVoteSuccess?.(review.id);
    } catch (err) {
      console.error("Error voting helpful:", err);
    }
  };

  const formattedDate = formatDistanceToNow(new Date(review.created_at), {
    addSuffix: true,
  });

  return (
    <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 rounded-xl overflow-hidden break-inside-avoid mb-4">
      {/* Media Section */}
      {hasMedia && (
        <div className="relative">
          {hasDbMedia ? (
            // Database media (uploaded by customer)
            isVideo ? (
              showVideo ? (
                <video
                  src={getMediaUrl(primaryMedia.storage_path)}
                  controls
                  autoPlay
                  className="w-full aspect-video object-cover"
                />
              ) : (
                <div
                  className="relative cursor-pointer group"
                  onClick={() => setShowVideo(true)}
                >
                  <div className="w-full aspect-video bg-muted flex items-center justify-center">
                    <Play className="w-12 h-12 text-primary group-hover:scale-110 transition-transform" />
                  </div>
                </div>
              )
            ) : (
              <img
                src={getMediaUrl(primaryMedia.storage_path)}
                alt={`Review by ${review.customer_name}`}
                className="w-full object-cover"
                loading="lazy"
              />
            )
          ) : staticImage ? (
            // Static product image
            <img
              src={staticImage}
              alt={`Product photo by ${review.customer_name}`}
              className="w-full object-cover max-h-80"
              loading="lazy"
            />
          ) : null}
        </div>
      )}

      {/* Content Section */}
      <div className="p-4">
        {/* Header: Name + Verified + Date */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {review.customer_name}
              </span>
              {review.is_verified_purchase && (
                <Badge
                  variant="secondary"
                  className="text-xs flex items-center gap-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                >
                  <CheckCircle className="w-3 h-3" />
                  Verified Buyer
                </Badge>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          </div>
        </div>

        {/* Star Rating */}
        <div className="flex mb-2">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i < review.rating
                  ? "fill-yellow-500 text-yellow-500"
                  : "fill-muted text-muted"
              }`}
            />
          ))}
        </div>

        {/* Title */}
        {review.title && (
          <h4 className="font-medium text-sm mb-1">{review.title}</h4>
        )}

        {/* Body */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {review.body}
        </p>

        {/* Variant Tag */}
        {review.variant_title && (
          <Badge variant="outline" className="mt-3 text-xs">
            {review.variant_title}
          </Badge>
        )}

        {/* Admin Reply */}
        {review.admin_reply && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg border-l-2 border-primary">
            <p className="text-xs font-medium text-primary mb-1">
              Rise By Night Response
            </p>
            <p className="text-xs text-muted-foreground">{review.admin_reply}</p>
          </div>
        )}

        {/* Helpful Button */}
        <div className="mt-3 pt-3 border-t flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className={`text-xs gap-1 ${hasVoted ? "text-primary" : "text-muted-foreground"}`}
            onClick={handleHelpfulClick}
            disabled={hasVoted}
          >
            <ThumbsUp className={`w-3 h-3 ${hasVoted ? "fill-primary" : ""}`} />
            Helpful ({helpfulCount})
          </Button>
        </div>
      </div>
    </div>
  );
};
