/**
 * Mobile Hero Configuration
 * 
 * Feature flags for mobile conversion optimization.
 * Set MOBILE_CTA_FIRST to false to revert to previous layout.
 * 
 * Previous layout: Carousel → Social Proof → Title → Price → USPs → Included Items → CTA
 * New layout:      Carousel → Social Proof → Title → Price → CTA → USPs → Included Items
 */

 export const mobileHeroConfig = {
   /**
    * When true: CTA button appears immediately after price on mobile (above the fold)
    * When false: CTA button appears after USPs and included items (previous behavior)
    */
   MOBILE_CTA_FIRST: true,
  
  /**
   * When true: Simplifies mobile hero by hiding included items section on mobile
   * When false: Shows full included items section on mobile
   */
  SIMPLIFIED_MOBILE_HERO: false,
  
  /**
   * When true: Hides trust badges above CTA on mobile (moves them below)
   * When false: Shows trust badges in original position
   */
  MOBILE_TRUST_BADGES_BELOW_CTA: true,
};

export type MobileHeroConfig = typeof mobileHeroConfig;
