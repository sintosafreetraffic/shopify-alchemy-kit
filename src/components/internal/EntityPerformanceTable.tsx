import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { EntityMetrics } from "@/hooks/useAdsReporting";

type SortDirection = "asc" | "desc" | null;
type SortableColumn = 
  | "name" 
  | "creative_category" 
  | "creative_format" 
  | "persona"
  | "campaign_name"
  | "spend" 
  | "revenue" 
  | "roas" 
  | "clicks" 
  | "ctr" 
  | "checkouts" 
  | "cpa";

interface EntityPerformanceTableProps {
  entities: EntityMetrics[];
  entityType: "campaign" | "ad_group" | "ad";
  showCampaignRef?: boolean;
  showPersona?: boolean;
  title?: string;
}

function SortableHeader({
  children,
  column,
  currentSort,
  currentDirection,
  onSort,
  className,
}: {
  children: React.ReactNode;
  column: SortableColumn;
  currentSort: SortableColumn | null;
  currentDirection: SortDirection;
  onSort: (column: SortableColumn) => void;
  className?: string;
}) {
  const isActive = currentSort === column;
  
  return (
    <TableHead 
      className={cn(
        "text-xs font-medium cursor-pointer hover:bg-muted/50 select-none transition-colors",
        className
      )}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          currentDirection === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronsUpDown className="h-3 w-3 opacity-30" />
        )}
      </div>
    </TableHead>
  );
}

export function EntityPerformanceTable({
  entities,
  entityType,
  showCampaignRef = false,
  showPersona = true,
  title,
}: EntityPerformanceTableProps) {
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>("spend");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      // Toggle direction or clear
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const sortedEntities = useMemo(() => {
    if (!sortColumn || !sortDirection) return entities;

    return [...entities].sort((a, b) => {
      let aVal: string | number = 0;
      let bVal: string | number = 0;

      switch (sortColumn) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "creative_category":
          aVal = a.creative_category?.toLowerCase() || "zzz";
          bVal = b.creative_category?.toLowerCase() || "zzz";
          break;
        case "creative_format":
          aVal = a.creative_format?.toLowerCase() || "zzz";
          bVal = b.creative_format?.toLowerCase() || "zzz";
          break;
        case "persona":
          aVal = a.persona?.toLowerCase() || "zzz";
          bVal = b.persona?.toLowerCase() || "zzz";
          break;
        case "campaign_name":
          aVal = a.campaign_name?.toLowerCase() || "zzz";
          bVal = b.campaign_name?.toLowerCase() || "zzz";
          break;
        case "spend":
          aVal = a.spend;
          bVal = b.spend;
          break;
        case "revenue":
          aVal = a.revenue;
          bVal = b.revenue;
          break;
        case "roas":
          aVal = a.roas;
          bVal = b.roas;
          break;
        case "clicks":
          aVal = a.clicks;
          bVal = b.clicks;
          break;
        case "ctr":
          aVal = a.ctr;
          bVal = b.ctr;
          break;
        case "checkouts":
          aVal = a.checkouts;
          bVal = b.checkouts;
          break;
        case "cpa":
          aVal = a.checkouts > 0 ? a.cpa : 999999;
          bVal = b.checkouts > 0 ? b.cpa : 999999;
          break;
      }

      if (typeof aVal === "string" && typeof bVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortDirection === "asc" 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    });
  }, [entities, sortColumn, sortDirection]);

  const entityLabel = entityType === "campaign" 
    ? "campaigns" 
    : entityType === "ad_group" 
      ? "ad groups" 
      : "ads";

  const tableTitle = title || `${entityType === "campaign" ? "Campaign" : entityType === "ad_group" ? "Ad Group" : "Ad"} Performance`;

  // Check if we have any personas to display
  const hasPersonas = showPersona && entities.some(e => e.persona);
  const hasCategories = entities.some(e => e.creative_category);
  const hasFormats = entities.some(e => e.creative_format);

  return (
    <Card className="bg-card/30 border-border/30 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{tableTitle}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {entities.length} {entityLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-96 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <SortableHeader
                  column="name"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="min-w-[200px]"
                >
                  Name
                </SortableHeader>
                {showCampaignRef && (
                  <SortableHeader
                    column="campaign_name"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                    className="min-w-[120px]"
                  >
                    Campaign
                  </SortableHeader>
                )}
                {hasCategories && (
                  <SortableHeader
                    column="creative_category"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Category
                  </SortableHeader>
                )}
                {hasFormats && (
                  <SortableHeader
                    column="creative_format"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Format
                  </SortableHeader>
                )}
                {hasPersonas && (
                  <SortableHeader
                    column="persona"
                    currentSort={sortColumn}
                    currentDirection={sortDirection}
                    onSort={handleSort}
                  >
                    Persona
                  </SortableHeader>
                )}
                <SortableHeader
                  column="spend"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                >
                  Spend
                </SortableHeader>
                <SortableHeader
                  column="revenue"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                >
                  Revenue
                </SortableHeader>
                <SortableHeader
                  column="roas"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                >
                  ROAS
                </SortableHeader>
                <SortableHeader
                  column="clicks"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                >
                  Clicks
                </SortableHeader>
                <SortableHeader
                  column="ctr"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                >
                  CTR
                </SortableHeader>
                <SortableHeader
                  column="checkouts"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                >
                  Checkouts
                </SortableHeader>
                <SortableHeader
                  column="cpa"
                  currentSort={sortColumn}
                  currentDirection={sortDirection}
                  onSort={handleSort}
                  className="text-right"
                >
                  CPA
                </SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedEntities.map((entity) => (
                <TableRow key={entity.id} className="hover:bg-muted/20">
                  <TableCell className="text-xs font-medium">
                    <div className="flex flex-col gap-0.5">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate max-w-[200px] cursor-help block">
                              {entity.name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-md bg-popover border border-border z-50">
                            <p className="text-sm break-words">{entity.name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {entity.status && entity.status !== "ACTIVE" && (
                        <Badge variant="outline" className="text-[10px] w-fit">
                          {entity.status}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {showCampaignRef && (
                    <TableCell className="text-xs">
                      {entity.campaign_name ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate max-w-[120px] block text-muted-foreground cursor-help">
                                {entity.campaign_name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-md bg-popover border border-border z-50">
                              <p className="text-sm break-words">{entity.campaign_name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {hasCategories && (
                    <TableCell className="text-xs">
                      {entity.creative_category ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {entity.creative_category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {hasFormats && (
                    <TableCell className="text-xs">
                      {entity.creative_format ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            entity.creative_format === "Video" && "border-purple-500/50 text-purple-500",
                            entity.creative_format === "Static" && "border-blue-500/50 text-blue-500",
                            entity.creative_format === "Carousel" && "border-orange-500/50 text-orange-500",
                            entity.creative_format === "GIF" && "border-green-500/50 text-green-500"
                          )}
                        >
                          {entity.creative_format}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  {hasPersonas && (
                    <TableCell className="text-xs">
                      {entity.persona ? (
                        <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">
                          {entity.persona}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  )}
                  <TableCell className="text-xs text-right">€{entity.spend.toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-right">€{entity.revenue.toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-right">
                    <span
                      className={cn(
                        entity.roas >= 2 ? "text-green-500 font-medium" :
                        entity.roas >= 1.54 ? "text-yellow-500" :
                        entity.roas > 0 ? "text-red-500" : "text-muted-foreground"
                      )}
                    >
                      {entity.roas.toFixed(2)}x
                    </span>
                  </TableCell>
                  <TableCell className="text-xs text-right">{entity.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-xs text-right">{entity.ctr.toFixed(2)}%</TableCell>
                  <TableCell className="text-xs text-right">{entity.checkouts}</TableCell>
                  <TableCell className="text-xs text-right">
                    {entity.checkouts > 0 ? `€${entity.cpa.toFixed(2)}` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
