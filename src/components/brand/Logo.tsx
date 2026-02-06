import { cn } from "@/lib/utils";
import logoFull from "@/assets/risebynight-logo-official.png";
import logoIcon from "@/assets/moon-icon-blue.png";

/**
 * Unified Logo Component
 * 
 * Single source of truth for brand logo usage.
 * Uses the official logos currently in production:
 * - Full: risebynight-logo-official.png (horizontal with text)
 * - Icon: moon-icon-blue.png (moon mark only)
 */

export interface LogoProps {
  /** 
   * Variant determines which logo to show
   * - full: Horizontal logo with "Rise By Night" text (default)
   * - icon: Moon icon only
   */
  variant?: "full" | "icon";
  
  /** 
   * Size presets for common use cases
   * - sm: Header mobile (h-8 for full, w-8 for icon)
   * - md: Header desktop (h-12 for full, w-10 for icon)  
   * - lg: Hero/footer (h-16 for full, w-12 for icon)
   */
  size?: "sm" | "md" | "lg";
  
  /** Additional CSS classes */
  className?: string;
  
  /** Alt text override */
  alt?: string;
}

const sizeClasses = {
  full: {
    sm: "h-8 w-auto",
    md: "h-10 md:h-12 w-auto",
    lg: "h-14 md:h-16 w-auto",
  },
  icon: {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  },
};

export function Logo({ 
  variant = "full", 
  size = "md", 
  className,
  alt = "Rise By Night"
}: LogoProps) {
  const src = variant === "full" ? logoFull : logoIcon;
  const sizeClass = sizeClasses[variant][size];
  
  return (
    <img
      src={src}
      alt={alt}
      className={cn(
        "object-contain",
        sizeClass,
        className
      )}
      loading="eager"
      fetchPriority="high"
      decoding="sync"
    />
  );
}
