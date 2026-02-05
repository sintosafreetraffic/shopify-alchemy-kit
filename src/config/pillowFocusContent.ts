/**
 * Pillow Focus Content Configuration
 * 
 * Defines content variants for different pain-focus landing pages.
 * Both variants point to the same Shopify product but with different messaging.
 */

export type PillowFocus = 'neck' | 'back';

export interface PillowFocusContent {
  focus: PillowFocus;
  route: string;
  seo: {
    title: string;
    description: string;
  };
  hero: {
    title: string;
    subtitle: string;
    primaryBenefit: string;
  };
  benefits: {
    headline: string;
    items: string[];
  };
}

export const PILLOW_FOCUS_CONTENT: Record<PillowFocus, PillowFocusContent> = {
  neck: {
    focus: 'neck',
    route: '/products/ergonomic-pillow',
    seo: {
      title: 'Rise By Night™ Neck Pain Relief Pillow | Ergonomic Memory Foam',
      description: 'Doctor-recommended contour memory foam pillow for neck and shoulder pain relief. Specifically designed for side sleepers. 100-day trial, free shipping.',
    },
    hero: {
      title: 'Rise By Night™ Ergonomic Pillow — Neck Pain Relief for Side Sleepers',
      subtitle: 'Specifically designed for side sleepers',
      primaryBenefit: 'Wake up without neck pain',
    },
    benefits: {
      headline: 'End Neck Pain For Good',
      items: [
        'Cervical contour cradles your neck',
        'Eliminates morning stiffness',
        'Proper spinal alignment all night',
        'Reduces tension headaches',
      ],
    },
  },
  back: {
    focus: 'back',
    route: '/products/back-pain-pillow',
    seo: {
      title: 'Rise By Night™ Back Pain Relief Pillow | Ergonomic Memory Foam',
      description: 'Ergonomic contour pillow that supports proper spinal alignment to relieve back pain. Wake up refreshed, not stiff. 100-day trial, free shipping.',
    },
    hero: {
      title: 'Rise By Night™ Back Pain Relief Pillow',
      subtitle: 'Specifically designed for side sleepers',
      primaryBenefit: 'Wake up without back pain',
    },
    benefits: {
      headline: 'End Back Pain For Good',
      items: [
        'Promotes neutral spine alignment',
        'Reduces lower back strain',
        'Supports natural sleeping posture',
        'Accelerates overnight recovery',
      ],
    },
  },
};

/**
 * Get content configuration for a given focus
 */
export function getPillowContent(focus: PillowFocus): PillowFocusContent {
  return PILLOW_FOCUS_CONTENT[focus];
}

/**
 * Get the default focus (used when no preference is stored)
 */
export function getDefaultFocus(): PillowFocus {
  return 'neck';
}
