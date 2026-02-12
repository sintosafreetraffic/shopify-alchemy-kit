import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_URL = "https://risebynight.com";
const DEFAULT_TITLE = "RiseByNight™ - Ergonomic Sleep Pillow";
const DEFAULT_DESCRIPTION =
  "The #1 rated orthopedic pillow. Scientifically proven to reduce neck pain and improve sleep quality. 120-day money-back guarantee.";
const DEFAULT_IMAGE = `${BASE_URL}/images/pillow-main-new.png`;

interface SEOConfig {
  title: string;
  description: string;
  canonical?: string;
  ogType?: "website" | "product" | "article";
  ogImage?: string;
  noIndex?: boolean;
}

/**
 * Hook to manage dynamic SEO meta tags per route.
 * Updates document.title, meta description, canonical URL, and OG tags.
 */
export function useSEO(config: SEOConfig) {
  const location = useLocation();

  useEffect(() => {
    const {
      title,
      description,
      canonical,
      ogType = "website",
      ogImage = DEFAULT_IMAGE,
      noIndex = false,
    } = config;

    // Update document title
    document.title = title;

    // Helper to update or create meta tag
    const setMetaTag = (
      selector: string,
      attribute: string,
      value: string,
      createName?: string
    ) => {
      let element = document.querySelector(selector) as HTMLMetaElement | null;
      if (!element && createName) {
        element = document.createElement("meta");
        if (selector.includes("property=")) {
          element.setAttribute("property", createName);
        } else {
          element.setAttribute("name", createName);
        }
        document.head.appendChild(element);
      }
      if (element) {
        element.setAttribute(attribute, value);
      }
    };

    // Update meta description
    setMetaTag('meta[name="description"]', "content", description, "description");

    // Update Open Graph tags
    setMetaTag('meta[property="og:title"]', "content", title, "og:title");
    setMetaTag('meta[property="og:description"]', "content", description, "og:description");
    setMetaTag('meta[property="og:type"]', "content", ogType, "og:type");
    setMetaTag('meta[property="og:image"]', "content", ogImage, "og:image");
    setMetaTag(
      'meta[property="og:url"]',
      "content",
      canonical || `${BASE_URL}${location.pathname}`,
      "og:url"
    );

    // Update Twitter tags
    setMetaTag('meta[name="twitter:title"]', "content", title, "twitter:title");
    setMetaTag('meta[name="twitter:description"]', "content", description, "twitter:description");
    setMetaTag('meta[name="twitter:image"]', "content", ogImage, "twitter:image");

    // Update or create canonical link
    const canonicalUrl = canonical || `${BASE_URL}${location.pathname}`;
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", canonicalUrl);

    // Handle noindex
    let robotsMeta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    if (noIndex) {
      if (!robotsMeta) {
        robotsMeta = document.createElement("meta");
        robotsMeta.setAttribute("name", "robots");
        document.head.appendChild(robotsMeta);
      }
      robotsMeta.setAttribute("content", "noindex, nofollow");
    } else if (robotsMeta) {
      robotsMeta.remove();
    }

    // Cleanup - restore defaults on unmount
    return () => {
      document.title = DEFAULT_TITLE;
      setMetaTag('meta[name="description"]', "content", DEFAULT_DESCRIPTION);
      setMetaTag('meta[property="og:title"]', "content", DEFAULT_TITLE);
      setMetaTag('meta[property="og:description"]', "content", DEFAULT_DESCRIPTION);
      setMetaTag('meta[property="og:type"]', "content", "website");
    };
  }, [config, location.pathname]);
}

// Pre-configured SEO configs for common pages
export const SEO_CONFIGS = {
  home: {
    title: "RiseByNight™ - Ergonomic Sleep Pillow for Neck Pain Relief",
    description:
      "The #1 rated orthopedic pillow in the US. Scientifically proven to reduce neck pain and improve sleep quality. 120-day money-back guarantee.",
    ogType: "website" as const,
  },
  products: {
    title: "Sleep Products - RiseByNight™",
    description:
      "Ergonomic sleep solutions designed by chiropractors, loved by 100,000+ customers. Shop pillows, sleep masks, and bundles.",
    ogType: "website" as const,
  },
  ergonomicPillow: {
    title: "Ergonomic Cervical Pillow - RiseByNight™",
    description:
      "Doctor-recommended contour memory foam pillow for neck and shoulder pain relief. Rated 4.8★ by 1000+ verified customers. 120-day trial.",
    ogType: "product" as const,
  },
  kneePillow: {
    title: "Knee Pillow for Side Sleepers - RiseByNight™",
    description:
      "Orthopedic knee pillow for hip and spine alignment. Relieves sciatica, lower back pain, and leg discomfort. 120-day money-back guarantee.",
    ogType: "product" as const,
  },
  sleepMask: {
    title: "Silk Sleep Mask - 100% Mulberry Silk - RiseByNight™",
    description:
      "Pure mulberry silk sleep mask that blocks 100% of light. Gentle on skin, prevents creases. Perfect for travel and light sleepers.",
    ogType: "product" as const,
  },
  sleepBundle: {
    title: "Complete Sleep Bundle - RiseByNight™",
    description:
      "Everything you need for perfect sleep: ergonomic pillow, silk sleep mask, and bonus accessories. Save 25% vs buying separately.",
    ogType: "product" as const,
  },
  reviews: {
    title: "Customer Reviews - RiseByNight™",
    description:
      "Read 1000+ verified customer reviews. See why we're rated 4.8★ for neck pain relief and sleep quality improvement.",
    ogType: "website" as const,
  },
  faq: {
    title: "FAQ - Frequently Asked Questions - RiseByNight™",
    description:
      "Find answers about our pillows, shipping, returns, and 120-day trial. Get help with sizing, care instructions, and more.",
    ogType: "website" as const,
  },
  aboutUs: {
    title: "About Us - RiseByNight™",
    description:
      "Our mission is to transform lives through the power of quality sleep. Learn about the science and people behind RiseByNight.",
    ogType: "website" as const,
  },
  benefits: {
    title: "Sleep Benefits - The RiseByNight™ Difference",
    description:
      "Discover the science-backed benefits of ergonomic sleep. Reduce pain, improve recovery, and wake up energized.",
    ogType: "website" as const,
  },
  sleepGuides: {
    title: "Free Sleep Guides & Resources - RiseByNight™",
    description:
      "Download free PDF guides on sleep optimization, pain relief, and healthy sleep habits. Science-backed tips from sleep experts.",
    ogType: "website" as const,
  },
  sleepQuiz: {
    title: "Sleep Assessment Quiz - RiseByNight™",
    description:
      "Take our 2-minute science-backed sleep assessment. Discover your sleeper type and get personalized recommendations.",
    ogType: "website" as const,
  },
  guarantee: {
    title: "Our Guarantee - 120-Day Risk-Free Trial - RiseByNight™",
    description:
      "Try any RiseByNight product risk-free for 120 nights. Full refund if you're not satisfied. Free returns, no questions asked.",
    ogType: "website" as const,
  },
  shippingPolicy: {
    title: "Shipping Information - RiseByNight™",
    description:
      "Free shipping on all orders. Fast delivery to US, Canada, UK, and Europe. Track your order and estimated delivery times.",
    ogType: "website" as const,
  },
  returnPolicy: {
    title: "Return Policy - 120-Night Trial - RiseByNight™",
    description:
      "Hassle-free returns within 120 days. Full refund guarantee if you're not completely satisfied with your purchase.",
    ogType: "website" as const,
  },
  privacyPolicy: {
    title: "Privacy Policy - RiseByNight™",
    description:
      "Learn how RiseByNight collects, uses, and protects your personal information. Your privacy is our priority.",
    ogType: "website" as const,
  },
  termsConditions: {
    title: "Terms & Conditions - RiseByNight™",
    description:
      "Read the terms and conditions for using the RiseByNight website and purchasing our products.",
    ogType: "website" as const,
  },
  imprint: {
    title: "Imprint - RiseByNight™",
    description: "Legal information and company details for RiseByNight.",
    ogType: "website" as const,
  },
  trackOrder: {
    title: "Track Your Order - RiseByNight™",
    description:
      "Enter your order number and email to track your RiseByNight shipment. Get real-time delivery updates.",
    ogType: "website" as const,
  },
};
