// Performance: Optimized image component with lazy loading and explicit dimensions
import { memo, ImgHTMLAttributes } from "react";

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'loading'> {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  /** Set to true for LCP/hero images to disable lazy loading */
  priority?: boolean;
  className?: string;
}

/**
 * Optimized image component that:
 * - Uses lazy loading by default (disabled for priority/LCP images)
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
  ...props
}: OptimizedImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      className={className}
      {...props}
    />
  );
});

export default OptimizedImage;
