import { NavLink } from "react-router-dom";
import { Shield, Wallet, BookOpen, AlertTriangle, Package, MessageSquareText, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminNavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const adminNavItems: AdminNavItem[] = [
  {
    label: "Reviews",
    path: "/admin/reviews",
    icon: <MessageSquareText className="h-4 w-4" />,
  },
  {
    label: "Fraud",
    path: "/admin/affiliate-fraud",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
  {
    label: "Payouts",
    path: "/admin/affiliate-payouts",
    icon: <Wallet className="h-4 w-4" />,
  },
  {
    label: "Campaigns",
    path: "/admin/affiliate-campaigns",
    icon: <Megaphone className="h-4 w-4" />,
  },
  {
    label: "Resources",
    path: "/admin/affiliate-resources",
    icon: <BookOpen className="h-4 w-4" />,
  },
  {
    label: "Shipments",
    path: "/admin/shipment-tracking",
    icon: <Package className="h-4 w-4" />,
  },
];

export function AdminNav() {
  return (
    <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg">
      <div className="flex items-center gap-1.5 px-2 text-sm text-muted-foreground">
        <Shield className="h-4 w-4" />
        <span className="hidden sm:inline">Admin:</span>
      </div>
      {adminNavItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )
          }
        >
          {item.icon}
          <span className="hidden sm:inline">{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
