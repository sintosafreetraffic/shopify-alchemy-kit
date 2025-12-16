// Product slug to display name mapping
export const PRODUCT_SLUG_TO_NAME: Record<string, string> = {
  ergonomic_sleep_pillow: 'Ergonomic Sleep Pillow',
  knee_alignment_pillow: 'Knee Pillow',
  side_sleep_bundle: 'Complete Sleep Bundle',
  sleep_mask: 'Sleep Mask',
};

// Product slug to image mapping
export const PRODUCT_SLUG_TO_IMAGE: Record<string, string> = {
  ergonomic_sleep_pillow: '/images/pillow-main-new.png',
  knee_alignment_pillow: '/images/knee-pillow-main-new.png',
  side_sleep_bundle: '/images/pillow-main-new.png',
  sleep_mask: '/images/pillow-main-new.png',
};

// Product slug to rationale mapping
export const PRODUCT_RATIONALE: Record<string, string> = {
  ergonomic_sleep_pillow: 'Designed to support the natural cervical curve, this pillow helps maintain neck-shoulder alignment throughout the night.',
  knee_alignment_pillow: 'Strategic knee positioning can help align the hips and pelvis, reducing lower back strain during side sleeping.',
  side_sleep_bundle: 'A comprehensive approach addressing multiple comfort areas can provide synergistic benefits for overall sleep quality.',
  sleep_mask: 'Complete darkness supports melatonin production and may enhance sleep depth, particularly for light-sensitive sleepers.',
};

// Convert product slug to display name
export function getProductDisplayName(slug: string): string {
  return PRODUCT_SLUG_TO_NAME[slug] || slug;
}

// Convert display name to product slug
export function getProductSlug(displayName: string): string | null {
  const entry = Object.entries(PRODUCT_SLUG_TO_NAME).find(
    ([, name]) => name.toLowerCase() === displayName.toLowerCase()
  );
  return entry ? entry[0] : null;
}

// Product ownership interface
export interface ProductOwnership {
  id: string;
  email: string;
  product_slug: string;
  acquired_at: string;
  shopify_order_id: string | null;
  synced_at: string;
}

// Format date for display
export function formatAcquiredDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    year: 'numeric' 
  });
}
