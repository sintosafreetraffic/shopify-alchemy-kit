import { useEffect, useRef, useState, useMemo } from "react";

export function useInView<T extends HTMLElement = HTMLElement>(
  options?: IntersectionObserverInit
) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  // Memoize options to prevent unnecessary re-renders
  const memoizedOptions = useMemo(() => ({
    root: null,
    threshold: 0.2,
    ...options,
  }), [options?.root, options?.threshold, options?.rootMargin]);

  useEffect(() => {
    if (!ref.current) return;
    const element = ref.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      memoizedOptions
    );

    observer.observe(element);
    return () => observer.unobserve(element);
  }, [memoizedOptions]);

  return { ref, isInView };
}
