export interface ReviewMedia {
  id: string;
  review_id: string;
  media_type: 'photo' | 'video';
  storage_path: string;
  file_size_bytes: number | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface ProductReview {
  id: string;
  product_handle: string;
  variant_title: string | null;
  customer_name: string;
  customer_email: string;
  rating: number;
  title: string | null;
  body: string;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  admin_reply: string | null;
  admin_notes: string | null;
  helpful_count: number;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_media?: ReviewMedia[];
}

export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}
