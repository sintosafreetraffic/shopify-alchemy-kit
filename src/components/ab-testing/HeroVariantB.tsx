/**
 * Hero Section - Variant B (Price Test: Pillow Only at €59.99)
 *
 * Uses a SEPARATE Shopify product for the €59.99 pillow-only offer.
 * - NO sleep mask included
 * - Simplified "Included" section (pillow cover only)
 * - Supports pillowFocus prop for neck/back pain variants
 */

import { Button } from "@/components/ui/button";
import {
  Check,
  Shield,
  Truck,
  Loader2,
  Star,
  ImageIcon,
  ChevronDown,
  Heart,
  Package,
  ShieldCheck,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";
import { PaymentIcons } from "@/components/PaymentIcons";
import { PolicyAccordion } from "@/components/PolicyAccordion";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useState, useEffect, useRef, Suspense, lazy } from "react";
import { addDays, format } from "date-fns";
import { useCartStore } from "@/stores/cartStore";
import { useABErgonomicPillow } from "@/hooks/useABProduct";
import { toast } from "sonner";
import { trackPageVisit } from "@/lib/pinterest";
import { trackViewContent as trackMetaViewContent } from "@/lib/meta-pixel";
import { trackViewedProduct } from "@/lib/klaviyo";
import { useHeaderHeight } from "@/hooks/useHeaderHeight";
import { formatPrice } from "@/lib/formatPrice";
import { trackATCClick } from "@/hooks/usePDPIntentTracking";
import { getCurrencyForCountry } from "@/lib/countryCode";
import { getCompareAtFromRatio } from "@/lib/compareAtPriceRatios";
import { getBuyerCountrySync } from "@/lib/buyerContext";
import { COUNTRY_NAMES } from "@/lib/countryCode";

import { mobileHeroConfig } from "@/config/mobileHeroConfig";
import { useValentinesOffer } from "@/hooks/useValentinesOffer";
import { ValentinesHeroSection } from "@/components/ValentinesHeroSection";
import testimonialAvatar from "@/assets/testimonial-new-updated.webp";
import pillowCoverImage from "@/assets/pillow-cover-included.webp";
import moonIcon from "@/assets/moon-icon-blue.png";
import { PillowFocus, getPillowContent } from "@/config/pillowFocusContent";
import { LiveViewerBadge } from "@/components/LiveViewerBadge";

import { RecentPurchasesBadge } from "@/components/RecentPurchasesBadge";

import { InstallmentBadgeCompact } from "@/components/InstallmentBadge";
// Lazy load the image carousel to reduce initial bundle
const ProductImageCarousel = lazy(() =>
  import("@/components/ProductImageCarousel").then((mod) => ({ default: mod.ProductImageCarousel })),
);
const MiniReviewsCarousel = lazy(() =>
  import("@/components/MiniReviewsCarousel").then((mod) => ({ default: mod.MiniReviewsCarousel })),
);

// Calculate delivery date (5 days from now)
const getDeliveryDate = () => {
  const deliveryDate = addDays(new Date(), 5);
  return format(deliveryDate, "MMM d");
};

// Carousel loading fallback - matches exact dimensions to prevent CLS
// Mobile: full-width square image | Desktop: 1200x900 aspect ratio (4:3)
const CarouselFallback = () => (
  <>
    {/* Mobile fallback - square aspect ratio */}
    <div className="md:hidden w-full aspect-square bg-muted/30 flex items-center justify-center">
      <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
    </div>
    {/* Desktop fallback - 4:3 aspect ratio matching actual images */}
    <div className="hidden md:flex w-full aspect-[4/3] bg-muted/30 rounded-xl items-center justify-center">
      <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
    </div>
  </>
);

interface HeroVariantBProps {
  pillowFocus?: PillowFocus;
}

export const HeroVariantB = ({ pillowFocus = "neck" }: HeroVariantBProps) => {
  // Get content based on pillow focus (neck or back)
  const focusContent = getPillowContent(pillowFocus);
  const buyerCountry = getBuyerCountrySync() || 'US';
  const buyerCountryName = COUNTRY_NAMES[buyerCountry] || 'your country';
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const { addItem, setCartOpen } = useCartStore();
  const hasTrackedView = useRef(false);
  const headerHeight = useHeaderHeight();
  const buyerCurrency = getCurrencyForCountry(buyerCountry);
  const valentinesOffer = useValentinesOffer();

  // Use A/B-aware product hook - automatically selects correct product for Variant B
  const { product, config, isLoading: productsLoading } = useABErgonomicPillow();

  // Get the first variant (Variant B product only has one variant)
  const variant = product?.node.variants.edges[0]?.node;

  // Track product view once when product is loaded
  useEffect(() => {
    if (product && variant && !hasTrackedView.current) {
      hasTrackedView.current = true;
      trackPageVisit(product.node.id);

      // Track Meta Pixel ViewContent
      const price = parseFloat(variant.price.amount || "0");
      const currency = variant.price.currencyCode || buyerCurrency;
      trackMetaViewContent(product.node.id, product.node.title, price, currency);

      trackViewedProduct({
        id: product.node.id,
        title: product.node.title,
        price: price,
        sku: variant.id || "",
        imageUrl: product.node.images?.edges?.[0]?.node?.url || "",
      });
    }
  }, [product, variant]);

  const handleAddToCart = async (quantity: number = 1) => {
    if (!product || !variant) {
      toast.error("Product not available");
      return;
    }

    // Track A/B intent event - fire and forget (never blocks UI)
    trackATCClick();

    setIsCheckingOut(true);
    try {
      // VARIANT B: No free mask - just the pillow
      const cartItem = {
        product,
        variantId: variant.id,
        variantTitle: variant.title,
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity,
        selectedOptions: variant.selectedOptions || [],
      };

      addItem(cartItem);

      const message = quantity === 2 ? "Valentine's Couple's Set added!" : "Added to cart!";
      const description = quantity === 2 ? "2 pillows added to your cart." : "1 pillow added to your cart.";
      const toastId = toast.success(message, {
        description,
        duration: 1500,
        cancel: {
          label: "✕",
          onClick: () => {
            toast.dismiss(toastId);
          },
        },
      });
      setCartOpen(true);

      // Show "Added" state briefly
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2500);
    } catch (error) {
      console.error("Failed to add to cart:", error);
      toast.error("Failed to add to cart");
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleAddSingle = () => handleAddToCart(1);
  const handleAddCouple = () => handleAddToCart(2);

  // Get product price from the Pillow Only variant
  const productPrice = variant ? parseFloat(variant.price.amount) : 59.99;
  const shopifyCurrency = variant?.price.currencyCode || "USD";
  const currencyCode = shopifyCurrency === "USD" ? buyerCurrency : shopifyCurrency;

  // Dynamic compare-at price: use Shopify data, or ratio-based fallback for non-US markets
  const shopifyCompareAt = variant?.compareAtPrice?.amount ? parseFloat(variant.compareAtPrice.amount) : 0;
  const ratioCompareAt = getCompareAtFromRatio('risebynight-ergonomic-sleep-pillow-copy', variant?.price.amount);
  const compareAtPrice = shopifyCompareAt > 0 ? shopifyCompareAt : (ratioCompareAt ? parseFloat(ratioCompareAt) : productPrice * 2);
  return (
    <section className="pb-3 md:pb-6 bg-background overflow-x-hidden pt-2 md:pt-4">
      <div className="container mx-auto px-4 max-w-7xl overflow-x-hidden">
        {/* Mobile Layout: Carousel at top, then title */}
        <div className="md:hidden space-y-3 md:space-y-4 mb-0 md:mb-6">
          <Suspense fallback={<CarouselFallback />}>
            <ProductImageCarousel pillowFocus={pillowFocus} />
          </Suspense>
          <Suspense fallback={<div className="h-32 bg-muted/30 rounded-xl animate-pulse" />}>
            <MiniReviewsCarousel productHandle="ergonomic-pillow" pillowFocus={pillowFocus} autoPlayInterval={10000} buyerCountry={buyerCountry} />
          </Suspense>
          {/* Mobile Title Section - min heights prevent CLS */}
          <div className="space-y-0">
            {/* Enhanced Social Proof - min height prevents CLS */}
            <div className="min-h-[24px]">
              <div
                className="flex items-center gap-2 flex-wrap cursor-pointer hover:opacity-80 transition-opacity min-h-[20px]"
                onClick={() => {
                  const el = document.getElementById("reviews-wall");
                  if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 80;
                    window.scrollTo({ top: y, behavior: "smooth" });
                  }
                }}
              >
                <div className="flex" style={{ width: "100px", height: "20px" }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="w-5 h-5 fill-[hsl(var(--star))] text-[hsl(var(--star))]" />
                  ))}
                </div>
                <span className="text-sm font-normal">6,247 verified product reviews</span>
              </div>
            </div>

            {/* Mobile title - styled as heading but using p tag to avoid duplicate H1 */}
            <p className="text-base font-bold leading-tight tracking-tight mt-1" aria-label="Product title">
              {focusContent.hero.title}
            </p>

            <p className="text-sm text-muted-foreground mt-0.5">{focusContent.hero.subtitle}</p>

            {/* Mobile Price with Discount Badge - fixed height prevents CLS when price loads */}
            <div className="flex items-center gap-2 mt-1 flex-wrap h-[40px]">
              <p className="text-2xl font-bold text-primary">{formatPrice(productPrice, currencyCode)}</p>
              {compareAtPrice && compareAtPrice > productPrice && (
                <span className="text-sm text-muted-foreground line-through">{formatPrice(compareAtPrice, currencyCode)}</span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 text-pink-700 px-2 py-0.5 text-xs font-semibold">
                <Heart className="w-3 h-3 fill-pink-500 text-pink-500" />
                1+1
              </span>
            </div>

            {/* Mobile: Klarna + Social Proof + USPs - between price and Valentine's offer */}
            <div className="md:hidden mt-3">
              {/* Temporarily disabled: Klarna + Social Proof badges
              <InstallmentBadgeCompact price={productPrice} className="mb-2" />
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <LiveViewerBadge />
                <RecentPurchasesBadge variant="compact" />
              </div>
              */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-affirmative shrink-0" />
                  <p className="text-xs leading-tight text-amber-600 font-medium">
                    Only 3 left at this price!
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-affirmative shrink-0" />
                  <p className="text-xs leading-tight">
                    Free shipping in {buyerCountry === 'NL' ? 'the ' : ''}<span className="font-semibold">{buyerCountryName}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-affirmative shrink-0" />
                  <p className="text-xs leading-tight">
                    100 days money-back guarantee
                  </p>
                </div>
              </div>
            </div>

            {/* MOBILE CTA FIRST: Show Valentine's offer or standard CTA immediately after price */}
            {mobileHeroConfig.MOBILE_CTA_FIRST && (
              <div className="mt-5">
                {valentinesOffer.isActive ? (
                  // Valentine's offer section - shown above fold on mobile during promotions
                  <ValentinesHeroSection
                    onAddSingle={handleAddSingle}
                    onAddCouple={handleAddCouple}
                    isAdding={isCheckingOut}
                    currencyCode={currencyCode}
                    productPrice={productPrice}
                    compareAtPrice={compareAtPrice}
                  />
                ) : (
                  // Standard CTA when no promotion is active
                  <>
                    <Button
                      size="lg"
                      className="w-full text-lg py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation animate-attention-pulse bg-primary text-primary-foreground hover:bg-black hover:text-white relative overflow-hidden group"
                      onClick={() => handleAddToCart(1)}
                      disabled={isCheckingOut || !product}
                    >
                      {isCheckingOut ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : justAdded ? (
                        <>
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Added – View Cart
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5 mr-2" />
                          ADD TO CART
                        </>
                      )}
                    </Button>

                    {/* Mobile Payment Icons - compact */}
                    <div className="pt-2">
                      <PaymentIcons />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop Grid Layout */}
        <div className="grid md:grid-cols-2 gap-6 lg:gap-10 items-start">
          {/* Scrollable Product Images Column - Desktop Only */}
          <div className="hidden md:block relative order-2 md:order-1 space-y-4 overflow-hidden -mt-4">
            <Suspense fallback={<CarouselFallback />}>
              <ProductImageCarousel pillowFocus={pillowFocus} />
            </Suspense>
            <Suspense fallback={<div className="h-32 bg-muted/30 rounded-xl animate-pulse" />}>
              <MiniReviewsCarousel
                productHandle="ergonomic-pillow"
                pillowFocus={pillowFocus}
                autoPlayInterval={10000}
                buyerCountry={buyerCountry}
              />
            </Suspense>
          </div>

          {/* Sticky Product Details Column - flush with image top */}
          <div className="space-y-2 order-1 md:order-2 md:sticky md:top-0 self-start">
            {/* Breadcrumbs - Desktop Only */}
            <div className="hidden md:block mb-1">
              <Breadcrumbs
                currentPageLabel={pillowFocus === "back" ? "Back Pain Relief Pillow" : "Neck Pain Relief Pillow"}
              />
            </div>

            {/* Desktop Social Proof - no extra wrappers to avoid whitespace */}
            <div
              className="hidden md:flex items-center gap-3 flex-wrap cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => {
                const el = document.getElementById("reviews-wall");
                if (el) {
                  const y = el.getBoundingClientRect().top + window.scrollY - 80;
                  window.scrollTo({ top: y, behavior: "smooth" });
                }
              }}
            >
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="w-5 h-5 fill-[hsl(var(--star))] text-[hsl(var(--star))]" />
                ))}
              </div>
              <span className="text-base font-normal">6,247 verified product reviews</span>
            </div>

            <h1 className="hidden md:block text-lg md:text-xl lg:text-2xl font-bold leading-tight tracking-tight">
              {focusContent.hero.title}
            </h1>

            <p className="hidden md:block text-sm md:text-base text-muted-foreground mb-2">
              {focusContent.hero.subtitle}
            </p>

            {/* Price Display with Discount Badge - Desktop Only */}
            <div className="hidden md:flex items-center gap-3 mt-2 mb-2">
              <p className="text-xl md:text-2xl font-bold text-primary">{formatPrice(productPrice, currencyCode)}</p>
              {compareAtPrice && compareAtPrice > productPrice && (
                <span className="text-sm text-muted-foreground line-through">{formatPrice(compareAtPrice, currencyCode)}</span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-pink-100 text-pink-700 px-2.5 py-0.5 text-xs font-semibold">
                <Heart className="w-3 h-3 fill-pink-500 text-pink-500" />
                1+1
              </span>
            </div>

            {/* Temporarily disabled: Klarna + Social Proof badges (Desktop)
            <InstallmentBadgeCompact price={productPrice} className="hidden md:block mb-2" />
            <div className="hidden md:flex flex-wrap items-center gap-3 mb-2">
              <LiveViewerBadge />
              <RecentPurchasesBadge variant="compact" />
            </div>
            */}

            {/* USPs Section with Green Checkmarks - Desktop Only (mobile shows above Valentine's offer) */}
            <div className="hidden md:block space-y-2 mb-5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-affirmative shrink-0" />
                <p className="text-xs sm:text-sm lg:text-sm xl:text-base leading-tight text-amber-600 font-medium">
                  Only 3 left at this price!
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-affirmative shrink-0" />
                <p className="text-xs sm:text-sm lg:text-sm xl:text-base leading-tight">
                  Free shipping in {buyerCountry === 'NL' ? 'the ' : ''}<span className="font-semibold">{buyerCountryName}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-affirmative shrink-0" />
                <p className="text-xs sm:text-sm lg:text-sm xl:text-base leading-tight">
                  100 days money-back guarantee
                </p>
              </div>
            </div>

            {/* Valentine's Day 1+1 Offer Section - Desktop Only (mobile shows above fold) */}
            {valentinesOffer.isActive && (
              <div className="hidden md:block">
                <ValentinesHeroSection
                  onAddSingle={handleAddSingle}
                  onAddCouple={handleAddCouple}
                  isAdding={isCheckingOut}
                  currencyCode={currencyCode}
                  productPrice={productPrice}
                  compareAtPrice={compareAtPrice}
                />
              </div>
            )}

            {/* Included Items - Pillow Cover ONLY (no mask in Variant B) */}
            <div
              className={`rounded-xl py-3 px-3 sm:px-4 mb-4 border w-full max-w-full overflow-hidden ${valentinesOffer.isActive ? "hidden" : ""}`}
              style={{ backgroundColor: "rgba(59, 126, 237, 0.1)", borderColor: "rgba(59, 126, 237, 0.3)" }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: "#3b7eed" }}>
                Included with your pillow
              </p>
              <div className="flex items-center gap-3">
                {/* Pillow Cover */}
                <div className="flex items-center gap-2 flex-1">
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center overflow-hidden flex-shrink-0"
                    style={{ backgroundColor: "rgba(59, 126, 237, 0.15)" }}
                  >
                    <img src={pillowCoverImage} alt="Pillow cover" className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="text-xs font-medium" style={{ color: "#3b7eed" }}>
                      Breathable Pillow Cover
                    </p>
                    <p className="text-[10px]" style={{ color: "rgba(59, 126, 237, 0.8)" }}>
                      Premium quality, machine washable
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop CTA always shows, Mobile CTA only if MOBILE_CTA_FIRST is false */}
            {/* Standard Add to Cart - ONLY shown when Valentine's offer is NOT active */}
            <div
              className={`${mobileHeroConfig.MOBILE_CTA_FIRST ? "hidden md:block" : ""} ${valentinesOffer.isActive ? "hidden md:hidden" : ""}`}
            >
              <Button
                size="lg"
                className="w-full text-lg md:text-xl py-6 font-bold shadow-lg hover:shadow-xl transition-all touch-manipulation animate-attention-pulse bg-primary text-primary-foreground hover:bg-black hover:text-white"
                onClick={() => handleAddToCart(1)}
                disabled={isCheckingOut || !product}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : justAdded ? (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Added – View Cart
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    ADD TO CART
                  </>
                )}
              </Button>

              {/* Payment Icons */}
              <div className="pt-2">
                <PaymentIcons />
              </div>
            </div>

            {/* Trust Band - Compact horizontal strip */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-4 py-2 text-[8px] sm:text-[10px] text-muted-foreground flex-wrap max-w-full">
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-primary" />
                <span>100-Day Trial</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-primary" />
                <span>Chiropractor Recommended</span>
              </div>
              <div className="w-px h-3 bg-border" />
              <div className="flex items-center gap-1">
                <Check className="w-3 h-3 text-primary" />
                <span>98% Satisfaction</span>
              </div>
            </div>

            {/* Policy Accordion - Desktop Only (inside right column) */}
            <div className="hidden md:block">
              <PolicyAccordion />
            </div>
          </div>
        </div>
      </div>

      {/* Policy Accordion - Mobile Only (full width) */}
      <div className="md:hidden">
        <PolicyAccordion />
      </div>
    </section>
  );
};
