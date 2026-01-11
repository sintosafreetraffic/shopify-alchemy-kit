import { useEffect } from "react";
import type { ReviewStats } from "@/types/reviews";

interface ReviewsSchemaOrgProps {
  productName: string;
  productUrl: string;
  productImage?: string;
  stats: ReviewStats;
}

export const ReviewsSchemaOrg = ({
  productName,
  productUrl,
  productImage,
  stats,
}: ReviewsSchemaOrgProps) => {
  useEffect(() => {
    if (stats.totalReviews === 0) return;

    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: productName,
      url: productUrl,
      ...(productImage && { image: productImage }),
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: stats.averageRating.toString(),
        bestRating: "5",
        worstRating: "1",
        ratingCount: stats.totalReviews.toString(),
      },
    };

    // Remove existing schema if present
    const existingScript = document.querySelector(
      'script[data-schema="product-reviews"]'
    );
    if (existingScript) {
      existingScript.remove();
    }

    // Add new schema
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.setAttribute("data-schema", "product-reviews");
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [productName, productUrl, productImage, stats]);

  return null;
};
