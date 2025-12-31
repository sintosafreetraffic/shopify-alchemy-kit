import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
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
import {
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
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
  onGenerateCreative?: (entity: EntityMetrics) => void;
}

const CATEGORY_OVERRIDES_STORAGE_KEY =
  "risebynight:campaign_category_overrides:v1";

function readCategoryOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CATEGORY_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, string>;
  } catch {
    return {};
  }
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
        // IMPORTANT: sticky works only within the SAME scroll container.
        // The table is wrapped in a single `overflow-auto` container below.
        "sticky top-0 z-20 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80",
        "text-xs font-medium cursor-pointer select-none transition-colors",
        "border-b border-border",
        "hover:bg-muted/50",
        className,
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

function CategoryCell({
  entityId,
  entityType,
  baseCategory,
  overrideCategory,
  onSaveOverride,
}: {
  entityId: string;
  entityType: EntityPerformanceTableProps["entityType"];
  baseCategory?: string;
  overrideCategory?: string;
  onSaveOverride: (entityId: string, category: string | null) => void;
}) {
  const effectiveCategory = overrideCategory ?? baseCategory;
  const isOther = (effectiveCategory ?? "").trim().toLowerCase() === "other";

  // Only editable for campaigns (as requested).
  const canEdit =
    entityType === "campaign" && (isOther || !effectiveCategory || !!overrideCategory);

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string>(
    overrideCategory ?? (!effectiveCategory || isOther ? "" : effectiveCategory),
  );

  useEffect(() => {
    if (!open) {
      setDraft(overrideCategory ?? (!effectiveCategory || isOther ? "" : effectiveCategory));
    }
  }, [open, overrideCategory, effectiveCategory, isOther]);

  const display = effectiveCategory;

  return (
    <div className="flex items-center gap-2">
      {display ? (
        <Badge
          variant={overrideCategory ? "secondary" : isOther ? "outline" : "secondary"}
          className={cn(
            "text-[10px]",
            isOther && "text-muted-foreground border-muted-foreground/30",
          )}
        >
          {overrideCategory ? overrideCategory : display}
        </Badge>
      ) : (
        <Badge
          variant="outline"
          className="text-[10px] text-muted-foreground border-muted-foreground/30"
        >
          Unknown
        </Badge>
      )}

      {canEdit && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label="Edit category"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-72">
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium">Set category</p>
                <p className="text-xs text-muted-foreground">
                  Replace “Other” with your own value.
                </p>
              </div>

              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. Expert/Authority"
              />

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const next = draft.trim();
                    onSaveOverride(entityId, next.length ? next : null);
                    setOpen(false);
                  }}
                >
                  <Check className="h-4 w-4" />
                  Save
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSaveOverride(entityId, null);
                    setOpen(false);
                  }}
                >
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

export function EntityPerformanceTable({
  entities,
  entityType,
  showCampaignRef = false,
  showPersona = true,
  title,
  onGenerateCreative,
}: EntityPerformanceTableProps) {
  const [sortColumn, setSortColumn] = useState<SortableColumn | null>("spend");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>(
    () => readCategoryOverrides(),
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        CATEGORY_OVERRIDES_STORAGE_KEY,
        JSON.stringify(categoryOverrides),
      );
    } catch {
      // ignore write failures (private mode, etc.)
    }
  }, [categoryOverrides]);

  const saveCategoryOverride = useCallback(
    (entityId: string, category: string | null) => {
      setCategoryOverrides((prev) => {
        const next = { ...prev };
        if (!category) {
          delete next[entityId];
          return next;
        }
        next[entityId] = category;
        return next;
      });
    },
    [],
  );

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
        case "creative_category": {
          const aCat = categoryOverrides[a.id] ?? a.creative_category;
          const bCat = categoryOverrides[b.id] ?? b.creative_category;
          aVal = aCat?.toLowerCase() || "zzz";
          bVal = bCat?.toLowerCase() || "zzz";
          break;
        }
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
  }, [entities, sortColumn, sortDirection, categoryOverrides]);

  const entityLabel =
    entityType === "campaign"
      ? "campaigns"
      : entityType === "ad_group"
        ? "ad groups"
        : "ads";

  const tableTitle =
    title ||
    `${entityType === "campaign" ? "Campaign" : entityType === "ad_group" ? "Ad Group" : "Ad"} Performance`;

  // Always show category column for campaigns, check for others
  const hasPersonas = showPersona && entities.some((e) => e.persona);
  const hasCategories = entityType === "campaign" || entities.some((e) => e.creative_category);
  const hasFormats = entities.some((e) => e.creative_format);

  return (
    <Card className="bg-card/30 border-border/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{tableTitle}</CardTitle>
          <Badge variant="outline" className="text-xs">
            {entities.length} {entityLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Single scroll container for sticky headers */}
        <div className="relative max-h-96 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <TableHeader>
              <TableRow className="bg-transparent hover:bg-transparent">
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
                {onGenerateCreative && (
                  <TableHead className="sticky top-0 z-20 bg-card/95 backdrop-blur text-xs font-medium border-b border-border w-10">
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>

            <TableBody>
              {sortedEntities.map((entity) => {
                const overrideCategory = categoryOverrides[entity.id];

                return (
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
                            <TooltipContent
                              side="top"
                              className="max-w-md bg-popover border border-border z-50"
                            >
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
                              <TooltipContent
                                side="top"
                                className="max-w-md bg-popover border border-border z-50"
                              >
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
                        <CategoryCell
                          entityId={entity.id}
                          entityType={entityType}
                          baseCategory={entity.creative_category}
                          overrideCategory={overrideCategory}
                          onSaveOverride={saveCategoryOverride}
                        />
                      </TableCell>
                    )}

                    {hasFormats && (
                      <TableCell className="text-xs">
                        {entity.creative_format ? (
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              entity.creative_format === "Video" &&
                                "border-purple-500/50 text-purple-500",
                              entity.creative_format === "Static" &&
                                "border-blue-500/50 text-blue-500",
                              entity.creative_format === "Carousel" &&
                                "border-orange-500/50 text-orange-500",
                              entity.creative_format === "GIF" &&
                                "border-green-500/50 text-green-500",
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
                          <Badge
                            variant="outline"
                            className="text-[10px] border-amber-500/50 text-amber-600"
                          >
                            {entity.persona}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}

                    <TableCell className="text-xs text-right">
                      €{entity.spend.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      €{entity.revenue.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      <span
                        className={cn(
                          entity.roas >= 2
                            ? "text-green-500 font-medium"
                            : entity.roas >= 1.54
                              ? "text-yellow-500"
                              : entity.roas > 0
                                ? "text-red-500"
                                : "text-muted-foreground",
                        )}
                      >
                        {entity.roas.toFixed(2)}x
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {entity.clicks.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {entity.ctr.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {entity.checkouts}
                    </TableCell>
                    <TableCell className="text-xs text-right">
                      {entity.checkouts > 0 ? `€${entity.cpa.toFixed(2)}` : "—"}
                    </TableCell>
                    {onGenerateCreative && (
                      <TableCell className="text-xs text-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => onGenerateCreative(entity)}
                              >
                                <Sparkles className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Generate creatives for this {entityType}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
