// Product slug to display name mapping
export const PRODUCT_SLUG_TO_NAME: Record<string, string> = {
  ergonomic_sleep_pillow: 'Ergonomic Sleep Pillow',
  knee_alignment_pillow: 'Knee Pillow',
  side_sleep_bundle: 'Complete Sleep Bundle',
  sleep_mask: 'Sleep Mask',
};

// Product slug to image mapping - using Shopify CDN images
export const PRODUCT_SLUG_TO_IMAGE: Record<string, string> = {
  ergonomic_sleep_pillow: 'https://cdn.shopify.com/s/files/1/0796/1595/1068/files/pillow-hero-main.webp?v=1764490731',
  knee_alignment_pillow: '/images/knee-pillow-main-new.png',
  side_sleep_bundle: 'https://cdn.shopify.com/s/files/1/0796/1595/1068/files/complete-sleep-bundle.png?v=1764437243',
  sleep_mask: 'https://cdn.shopify.com/s/files/1/0796/1595/1068/files/eye-mask-gift-transparent-CP76Ahkm.webp?v=1764490860',
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
