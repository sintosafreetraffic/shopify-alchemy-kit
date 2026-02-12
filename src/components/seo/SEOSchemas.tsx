import { useEffect } from "react";

const BASE_URL = "https://risebynight.com";

interface ProductSchemaProps {
  name: string;
  description: string;
  url: string;
  image?: string;
  sku?: string;
  price: string;
  currency?: string;
  availability?: "InStock" | "OutOfStock" | "PreOrder";
  ratingValue?: number;
  reviewCount?: number;
}

/**
 * Enhanced Product structured data for rich snippets.
 * Includes brand, offers, and aggregate rating.
 */
export const ProductSchema = ({
  name,
  description,
  url,
  image,
  sku,
  price,
  currency = "USD",
  availability = "InStock",
  ratingValue,
  reviewCount,
}: ProductSchemaProps) => {
  useEffect(() => {
    const schema: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Product",
      name,
      description,
      url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
      brand: {
        "@type": "Brand",
        name: "RiseByNight",
      },
      offers: {
        "@type": "Offer",
        price,
        priceCurrency: currency,
        availability: `https://schema.org/${availability}`,
        seller: {
          "@type": "Organization",
          name: "RiseByNight",
        },
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      },
    };

    if (image) {
      schema.image = image.startsWith("http") ? image : `${BASE_URL}${image}`;
    }

    if (sku) {
      schema.sku = sku;
    }

    if (ratingValue && reviewCount) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: ratingValue.toString(),
        bestRating: "5",
        worstRating: "1",
        reviewCount: reviewCount.toString(),
      };
    }

    // Remove existing schema if present
    const existingScript = document.querySelector('script[data-schema="product"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new schema
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-schema", "product");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [name, description, url, image, sku, price, currency, availability, ratingValue, reviewCount]);

  return null;
};

/**
 * Organization structured data for brand recognition.
 */
export const OrganizationSchema = () => {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "RiseByNight",
      url: BASE_URL,
      logo: `${BASE_URL}/images/risebynight-logo-email.png`,
      description:
        "RiseByNight creates ergonomic sleep products designed by chiropractors to improve sleep quality and reduce pain.",
      sameAs: [
        "https://www.instagram.com/risebynight",
        "https://www.tiktok.com/@risebynight",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        email: "hello@risebynight.com",
        contactType: "customer service",
        availableLanguage: ["English"],
      },
    };

    // Remove existing schema if present
    const existingScript = document.querySelector('script[data-schema="organization"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new schema
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-schema", "organization");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
};

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  items: FAQItem[];
}

/**
 * FAQPage structured data for rich snippets in search results.
 */
export const FAQSchema = ({ items }: FAQSchemaProps) => {
  useEffect(() => {
    if (items.length === 0) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    };

    // Remove existing schema if present
    const existingScript = document.querySelector('script[data-schema="faq"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new schema
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-schema", "faq");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [items]);

  return null;
};

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbSchemaProps {
  items: BreadcrumbItem[];
}

/**
 * BreadcrumbList structured data for navigation context.
 */
export const BreadcrumbSchema = ({ items }: BreadcrumbSchemaProps) => {
  useEffect(() => {
    if (items.length === 0) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
      })),
    };

    // Remove existing schema if present
    const existingScript = document.querySelector('script[data-schema="breadcrumb"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new schema
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-schema", "breadcrumb");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [items]);

  return null;
};

/**
 * WebSite structured data with SearchAction for sitelinks search box.
 */
export const WebsiteSchema = () => {
  useEffect(() => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "RiseByNight",
      url: BASE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: `${BASE_URL}/products?q={search_term_string}`,
        },
        "query-input": "required name=search_term_string",
      },
    };

    // Remove existing schema if present
    const existingScript = document.querySelector('script[data-schema="website"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new schema
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-schema", "website");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
};
