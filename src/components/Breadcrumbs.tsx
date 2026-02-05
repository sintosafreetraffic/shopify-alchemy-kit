import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

// Route to display name mapping
const routeLabels: Record<string, string> = {
  "products": "Products",
  "ergonomic-pillow": "Neck Pain Relief Pillow",
  "back-pain-pillow": "Back Pain Relief Pillow",
  "knee-pillow": "Knee Pillow",
  "sleep-mask": "Sleep Mask",
  "sleep-bundle": "Complete Sleep Bundle",
  "benefits": "Benefits",
  "reviews": "Reviews",
  "faq": "FAQ",
  "guarantee": "100-Day Guarantee",
  "shipping": "Shipping",
  "return-policy": "Return Policy",
  "privacy-policy": "Privacy Policy",
  "terms": "Terms & Conditions",
  "about": "About Us",
  "track": "Track Order",
  "sleep-quiz": "Sleep Assessment",
  "collective": "Sleep Collective",
  "sleep-guides": "Sleep Guides",
};

interface BreadcrumbsProps {
  className?: string;
  /** Override the current page label */
  currentPageLabel?: string;
}

export const Breadcrumbs = ({ className, currentPageLabel }: BreadcrumbsProps) => {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Don't show breadcrumbs on homepage
  if (pathSegments.length === 0) return null;

  // Build breadcrumb items
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = "/" + pathSegments.slice(0, index + 1).join("/");
    const isLast = index === pathSegments.length - 1;
    const label = isLast && currentPageLabel 
      ? currentPageLabel 
      : routeLabels[segment] || segment.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    return { path, label, isLast };
  });

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="items-center">
        {/* Home */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="gap-1 text-muted-foreground hover:text-foreground">
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.map(({ path, label, isLast }) => (
          <React.Fragment key={path}>
            {/* Separator must be a sibling <li> in the <ol>, not nested inside another <li> */}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {isLast ? (
                <BreadcrumbPage className="max-w-[200px] truncate">
                  {label}
                </BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={path} className="max-w-[150px] truncate">
                    {label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
