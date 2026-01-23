import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProductReview, ReviewStats } from "@/types/reviews";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export type ReviewSortOption = "newest" | "highest" | "lowest" | "helpful";

export function useProductReviews(
  productHandle: string,
  limit = 20,
  sortBy: ReviewSortOption = "newest",
  ratingFilter: number | null = null
) {
  return useQuery({
    queryKey: ["product-reviews", productHandle, limit, sortBy, ratingFilter],
    queryFn: async (): Promise<ProductReview[]> => {
      let query = supabase
        .from("product_reviews")
        .select("*")
        .eq("product_handle", productHandle)
        .eq("status", "approved");

      // Apply rating filter
      if (ratingFilter !== null) {
        query = query.eq("rating", ratingFilter);
      }

      // Apply sorting
      switch (sortBy) {
        case "highest":
          query = query.order("rating", { ascending: false }).order("created_at", { ascending: false });
          break;
        case "lowest":
          query = query.order("rating", { ascending: true }).order("created_at", { ascending: false });
          break;
        case "helpful":
          query = query.order("helpful_count", { ascending: false }).order("created_at", { ascending: false });
          break;
        case "newest":
        default:
          query = query.order("created_at", { ascending: false });
          break;
      }

      const { data: reviews, error } = await query.limit(limit);

      if (error) throw error;

      // Fetch media for each review
      const reviewIds = reviews?.map((r) => r.id) || [];

      if (reviewIds.length === 0) return [];

      const { data: mediaData, error: mediaError } = await supabase
        .from("review_media")
        .select("*")
        .in("review_id", reviewIds);

      if (mediaError) throw mediaError;

      // Attach media to reviews
      const reviewsWithMedia = reviews?.map((review) => ({
        ...review,
        review_media: mediaData?.filter((m) => m.review_id === review.id) || [],
      })) as ProductReview[];

      // Deduplicate by customer name - keep only the first (most recent based on sort) review per customer
      const seenCustomers = new Set<string>();
      const uniqueReviews = reviewsWithMedia.filter((review) => {
        const customerKey = review.customer_name.toLowerCase().trim();
        if (seenCustomers.has(customerKey)) {
          return false;
        }
        seenCustomers.add(customerKey);
        return true;
      });

      return uniqueReviews;
    },
  });
}

export function useReviewStats(productHandle: string) {
  return useQuery({
    queryKey: ["review-stats", productHandle],
    queryFn: async (): Promise<ReviewStats> => {
      const { data: reviews, error } = await supabase
        .from("product_reviews")
        .select("rating")
        .eq("product_handle", productHandle)
        .eq("status", "approved");

      if (error) throw error;

      const totalReviews = reviews?.length || 0;

      if (totalReviews === 0) {
        return {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        };
      }

      const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = Math.round((sum / totalReviews) * 10) / 10;

      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      reviews.forEach((r) => {
        ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
      });

      return { totalReviews, averageRating, ratingDistribution };
    },
  });
}

export function getMediaUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/review-media/${storagePath}`;
}
