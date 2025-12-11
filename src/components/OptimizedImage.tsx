// Performance: Optimized image component with lazy loading, responsive srcset, and explicit dimensions
import { memo, ImgHTMLAttributes } from "react";

interface ResponsiveSource {
  src: string;
  width: number;
}

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading' | 'srcSet' | 'sizes'> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  /** Set to true for LCP/hero images to disable lazy loading */
  priority?: boolean;
  className?: string;
  /** Responsive image sources for srcset - array of {src, width} */
  responsiveSources?: ResponsiveSource[];
  /** Sizes attribute for responsive images (e.g., "(max-width: 768px) 100vw, 50vw") */
  sizes?: string;
}

/**
 * Optimized image component that:
 * - Uses lazy loading by default (disabled for priority/LCP images)
 * - Supports responsive srcset for serving appropriately sized images
 * - Includes explicit width/height to reduce layout shift
 * - Uses async decoding for non-blocking rendering
 */
const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = "",
  responsiveSources,
  sizes,
  ...props
}: OptimizedImageProps) {
  // Build srcset string from responsive sources
  const srcSet = responsiveSources?.length
    ? responsiveSources.map(s => `${s.src} ${s.width}w`).join(', ')
    : undefined;

  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding={priority ? "sync" : "async"}
      className={className}
      srcSet={srcSet}
      sizes={sizes}
      {...props}
    />
  );
});

export default OptimizedImage;
