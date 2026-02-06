import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

/**
 * Typography System
 * 
 * Consistent text components following brand design tokens.
 * Use these instead of raw heading/paragraph tags for consistency.
 * 
 * Scale:
 * - H1: 30px desktop, 24px mobile - Page/product titles
 * - H2: 24px desktop, 20px mobile - Section headings  
 * - H3: 18px desktop, 16px mobile - Subsections
 * - Body: 16px desktop, 14px mobile - Paragraphs
 * - Caption: 14px desktop, 12px mobile - Labels, badges
 */

interface TypographyProps {
  children: ReactNode;
  className?: string;
}

export function H1({ className, children }: TypographyProps) {
  return (
    <h1 className={cn(
      "text-2xl md:text-3xl font-semibold tracking-tight text-foreground",
      className
    )}>
      {children}
    </h1>
  );
}

export function H2({ className, children }: TypographyProps) {
  return (
    <h2 className={cn(
      "text-xl md:text-2xl font-semibold tracking-tight text-foreground",
      className
    )}>
      {children}
    </h2>
  );
}

export function H3({ className, children }: TypographyProps) {
  return (
    <h3 className={cn(
      "text-base md:text-lg font-medium text-foreground",
      className
    )}>
      {children}
    </h3>
  );
}

export function Body({ className, children }: TypographyProps) {
  return (
    <p className={cn(
      "text-sm md:text-base text-foreground leading-relaxed",
      className
    )}>
      {children}
    </p>
  );
}

export function BodyMuted({ className, children }: TypographyProps) {
  return (
    <p className={cn(
      "text-sm md:text-base text-muted-foreground leading-relaxed",
      className
    )}>
      {children}
    </p>
  );
}

export function Caption({ className, children }: TypographyProps) {
  return (
    <span className={cn(
      "text-xs md:text-sm text-muted-foreground",
      className
    )}>
      {children}
    </span>
  );
}

export function Label({ className, children }: TypographyProps) {
  return (
    <span className={cn(
      "text-xs font-medium uppercase tracking-wider text-muted-foreground",
      className
    )}>
      {children}
    </span>
  );
}
