import { useState, useEffect } from "react";
import { ReviewCard } from "./ReviewCard";
import { ReviewsHeader } from "./ReviewsHeader";
import { ReviewSortDropdown } from "./ReviewSortDropdown";
import { ReviewsSchemaOrg } from "./ReviewsSchemaOrg";
import { useProductReviews, useReviewStats, type ReviewSortOption } from "@/hooks/useProductReviews";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ReviewsWallProps {
  productHandle: string;
  productName?: string;
  productImage?: string;
  onWriteReview: () => void;
}

// Generate or retrieve session ID for helpful votes
function getSessionId(): string {
  const key = "review_session_id";
  let sessionId = localStorage.getItem(key);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem(key, sessionId);
  }
  return sessionId;
}

export const ReviewsWall = ({
  productHandle,
  productName,
  productImage,
  onWriteReview,
}: ReviewsWallProps) => {
  const [limit, setLimit] = useState(12);
  const [sortBy, setSortBy] = useState<ReviewSortOption>("newest");
  const [sessionId, setSessionId] = useState("");
  const [votedReviewIds, setVotedReviewIds] = useState<Set<string>>(new Set());

  const { data: reviews, isLoading: reviewsLoading } = useProductReviews(
    productHandle,
    limit,
    sortBy
  );
  const { data: stats, isLoading: statsLoading } = useReviewStats(productHandle);

  useEffect(() => {
    const sid = getSessionId();
    setSessionId(sid);

    // Fetch which reviews this session has already voted on
    const fetchVotes = async () => {
      const { data } = await supabase
        .from("review_helpful_votes")
        .select("review_id")
        .eq("session_id", sid);

      if (data) {
        setVotedReviewIds(new Set(data.map((v) => v.review_id)));
      }
    };
    fetchVotes();
  }, []);

  const hasMoreReviews = reviews?.length === limit;

  const handleLoadMore = () => {
    setLimit((prev) => prev + 12);
  };

  const handleVoteSuccess = (reviewId: string) => {
    setVotedReviewIds((prev) => new Set([...prev, reviewId]));
  };

  const defaultStats = {
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <section id="reviews-wall" className="py-8 md:py-12 bg-background">
      {/* SEO Schema */}
      <ReviewsSchemaOrg
        productName={productName || productHandle}
        productUrl={currentUrl}
        productImage={productImage}
        stats={stats || defaultStats}
      />

      <div className="container mx-auto px-4 max-w-7xl">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">
          Customer Reviews
        </h2>
        <p className="text-center text-muted-foreground mb-8">
          Real experiences from our customers
        </p>

        <ReviewsHeader
          stats={stats || defaultStats}
          onWriteReview={onWriteReview}
          isLoading={statsLoading}
        />

        {/* Sort Dropdown */}
        <div className="flex justify-end mb-4">
          <ReviewSortDropdown value={sortBy} onChange={setSortBy} />
        </div>

        {reviewsLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : reviews && reviews.length > 0 ? (
          <>
            {/* Masonry Grid */}
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  sessionId={sessionId}
                  hasVoted={votedReviewIds.has(review.id)}
                  onVoteSuccess={handleVoteSuccess}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMoreReviews && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" onClick={handleLoadMore}>
                  Show More Reviews
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No reviews yet. Be the first to share your experience!
            </p>
            <Button onClick={onWriteReview}>Write a Review</Button>
          </div>
        )}
      </div>
    </section>
  );
};
