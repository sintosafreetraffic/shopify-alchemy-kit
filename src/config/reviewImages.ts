// Static images to display alongside specific customer reviews
// Maps review titles to their product images (ensures uniqueness)

import reviewImage1 from "@/assets/reviews/review-image-1.webp";
import reviewImage2 from "@/assets/reviews/review-image-2.webp";
import reviewImage3 from "@/assets/reviews/review-image-3.webp";
import reviewImage4 from "@/assets/reviews/review-image-4.webp";
import reviewImage5 from "@/assets/reviews/review-image-5.webp";
import reviewImage6 from "@/assets/reviews/review-image-6.webp";

// Map review titles to their static review images
// Using titles ensures each image appears only once
export const reviewStaticImages: Record<string, string> = {
  "No more dead arm! Game changer": reviewImage1,
  "Finally have energy again": reviewImage2,
  "Great for arm numbness, took time to adjust": reviewImage3,
  "Back pain relief I didn't expect": reviewImage4,
  "Neck AND shoulder pain solved": reviewImage5,
  "Jaw pain GONE + better focus at work": reviewImage6,
};

export function getStaticReviewImage(reviewTitle: string | null): string | null {
  if (!reviewTitle) return null;
  return reviewStaticImages[reviewTitle] || null;
}
