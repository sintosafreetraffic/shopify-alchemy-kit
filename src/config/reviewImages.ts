// Static images to display alongside specific customer reviews
// Maps customer names to their product images

import reviewImage1 from "@/assets/reviews/review-image-1.webp";
import reviewImage2 from "@/assets/reviews/review-image-2.webp";
import reviewImage3 from "@/assets/reviews/review-image-3.webp";
import reviewImage4 from "@/assets/reviews/review-image-4.webp";
import reviewImage5 from "@/assets/reviews/review-image-5.webp";
import reviewImage6 from "@/assets/reviews/review-image-6.webp";

// Map customer names to their static review images
// These will be displayed if the review doesn't already have media from the database
export const reviewStaticImages: Record<string, string> = {
  "Marcus Chen": reviewImage1,
  "Brian O'Connor": reviewImage2,
  "Robert James": reviewImage3,
  "Sarah Miller": reviewImage4,
  "Emily Davis": reviewImage5,
  "Jennifer Smith": reviewImage6,
};

export function getStaticReviewImage(customerName: string): string | null {
  return reviewStaticImages[customerName] || null;
}
