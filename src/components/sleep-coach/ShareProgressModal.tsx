// Performance: Chart component is lazy-loaded to reduce initial bundle size
import { useState, useRef, useMemo, useEffect, useCallback, Suspense, lazy } from "react";
import { SleepLog } from "@/hooks/useSleepApi";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Share2, Loader2, Moon, Link2, Sparkles, Check, BarChart3 } from "lucide-react";
import { format, subDays, subMonths, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { trackSleepProgressShared } from "@/lib/klaviyo";

// Lazy load the chart component
const ShareProgressChart = lazy(() => import("./ShareProgressChart"));

type ShareRange = "7d" | "30d" | "90d" | "12m";
type ShareMetric = "both" | "quality" | "pain";

interface ShareProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: SleepLog[];
  initialRange?: ShareRange;
}

export const ShareProgressModal = ({ isOpen, onClose, logs, initialRange = "30d" }: ShareProgressModalProps) => {
  const [range, setRange] = useState<ShareRange>(initialRange);
  const [metric, setMetric] = useState<ShareMetric>("both");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCelebrating, setIsCelebrating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // Reset range when initialRange changes (modal opens with new range)
  useEffect(() => {
    setRange(initialRange);
  }, [initialRange]);

  // Auto-clear celebration after timeout
  useEffect(() => {
    if (!isCelebrating) return;
    const t = setTimeout(() => setIsCelebrating(false), 1800);
    return () => clearTimeout(t);
  }, [isCelebrating]);

  const filteredData = useMemo(() => {
    const today = new Date();
    let startDate: Date;

    switch (range) {
      case "7d":
        startDate = subDays(today, 7);
        break;
      case "30d":
        startDate = subDays(today, 30);
        break;
      case "90d":
        startDate = subDays(today, 90);
        break;
      case "12m":
        startDate = subMonths(today, 12);
        break;
      default:
        startDate = subDays(today, 30);
    }

    const filtered = logs.filter((log) => {
      const logDate = startOfDay(parseISO(log.date));
      return isWithinInterval(logDate, { start: startOfDay(startDate), end: endOfDay(today) });
    });

    return filtered
      .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
      .map((log) => ({
        date: format(parseISO(log.date), "MMM d"),
        quality: log.sleep_quality,
        pain: log.pain_level_morning,
      }));
  }, [logs, range]);

  const dateRangeLabel = useMemo(() => {
    if (filteredData.length === 0) return "";
    const first = filteredData[0].date;
    const last = filteredData[filteredData.length - 1].date;
    return `${first} – ${last}`;
  }, [filteredData]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return { avgQuality: 0, avgPain: 0 };
    const avgQuality = filteredData.reduce((sum, d) => sum + d.quality, 0) / filteredData.length;
    const avgPain = filteredData.reduce((sum, d) => sum + d.pain, 0) / filteredData.length;
    return { avgQuality, avgPain };
  }, [filteredData]);

  const handleDownload = useCallback(async () => {
    if (!previewRef.current) return;

    setIsGenerating(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#0f172a", // Dark background
      });

      const link = document.createElement("a");
      link.download = `risebynight-sleep-progress-${format(new Date(), "yyyy-MM-dd")}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Image downloaded!");
      setIsCelebrating(true);
      trackSleepProgressShared({ method: "download", range, metric });
    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  }, [range, metric]);

  const handleShare = useCallback(async () => {
    if (!previewRef.current) return;

    if (!navigator.share) {
      handleDownload();
      return;
    }

    setIsGenerating(true);
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#0f172a",
      });

      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], "sleep-progress.png", { type: "image/png" });

      await navigator.share({
        title: "My Sleep Progress",
        text: "Check out my sleep progress with Rise By Night Sleep Coach!",
        files: [file],
      });

      toast.success("Shared successfully!");
      setIsCelebrating(true);
      trackSleepProgressShared({ method: "native_share", range, metric });
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("Error sharing:", error);
        handleDownload();
      }
    } finally {
      setIsGenerating(false);
    }
  }, [handleDownload, range, metric]);

  const handleCopyLink = useCallback(async () => {
    const shareUrl = `${window.location.origin}/sleep-coach?progressRange=${range}`;
    
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link copied to clipboard!");
        setIsCelebrating(true);
        trackSleepProgressShared({ method: "copy_link", range, metric });
      } catch (error) {
        console.error("Failed to copy:", error);
        toast.error("Unable to copy link. Please try again.");
      }
    } else {
      toast.error("Copy is not supported in this browser.");
    }
  }, [range, metric]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to close
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Enter to download
      if (e.key === "Enter" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleDownload();
        return;
      }

      // Cmd/Ctrl + S to download
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleDownload();
        return;
      }

      // Cmd/Ctrl + C to copy link
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        e.preventDefault();
        handleCopyLink();
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, handleDownload, handleCopyLink]);

  const rangeOptions = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "90d", label: "Last 90 days" },
    { value: "12m", label: "Last 12 months" },
  ];

  const metricOptions = [
    { value: "both", label: "Sleep Quality vs Pain (recommended)" },
    { value: "quality", label: "Sleep Quality only" },
    { value: "pain", label: "Pain Level only" },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Your Sleep Progress
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Time Range</Label>
              <Select value={range} onValueChange={(v) => setRange(v as ShareRange)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {rangeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">What to show</Label>
              <Select value={metric} onValueChange={(v) => setMetric(v as ShareMetric)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {metricOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preview */}
          <div className="border border-border/50 rounded-xl overflow-hidden shadow-lg relative">
            {/* Celebration overlay */}
            <div
              className={cn(
                "absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm transition-all duration-300 pointer-events-none",
                isCelebrating ? "opacity-100" : "opacity-0"
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
                <Check className="h-6 w-6 text-green-400" />
                <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
              </div>
              <p className="text-white/90 font-medium text-sm">Nice! Ready to share 🌙</p>
            </div>
            
            <div
              ref={previewRef}
              className="bg-gradient-to-br from-slate-900 to-slate-800 p-6"
              style={{ aspectRatio: "4 / 5" }}
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <Moon className="h-5 w-5 text-amber-400" />
                <span className="text-white/90 font-semibold text-sm">Rise By Night</span>
              </div>
              
              <h2 className="text-white text-xl font-bold mb-1">My Sleep Progress</h2>
              <p className="text-white/60 text-xs mb-4">With Rise By Night Sleep Coach</p>

              {/* Stats */}
              <div className="flex gap-4 mb-4">
                {(metric === "both" || metric === "quality") && (
                  <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {stats.avgQuality.toFixed(1)}
                    </div>
                    <div className="text-white/60 text-xs">Avg Quality</div>
                  </div>
                )}
                {(metric === "both" || metric === "pain") && (
                  <div className="bg-white/10 rounded-lg px-4 py-2 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {stats.avgPain.toFixed(1)}
                    </div>
                    <div className="text-white/60 text-xs">Avg Pain</div>
                  </div>
                )}
              </div>

              {/* Chart */}
              <div className="bg-white/5 rounded-lg p-3">
                {filteredData.length === 0 ? (
                  <div className="h-[180px] flex items-center justify-center text-white/50 text-sm text-center px-4">
                    No sleep data in this period yet. Log a few nights to generate your shareable progress card.
                  </div>
                ) : (
                  <div className="h-[180px]">
                    <Suspense fallback={
                      <div className="h-full flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-white/30 animate-pulse" />
                      </div>
                    }>
                      <ShareProgressChart data={filteredData} metric={metric} />
                    </Suspense>
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex justify-center gap-4 mt-3">
                {(metric === "both" || metric === "quality") && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-blue-400 rounded" />
                    <span className="text-white/70 text-xs">Sleep Quality</span>
                  </div>
                )}
                {(metric === "both" || metric === "pain") && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-red-400 rounded" />
                    <span className="text-white/70 text-xs">Pain Level</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-white/10 text-center">
                <p className="text-white/40 text-xs">Range: {dateRangeLabel}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              className="flex-1 min-w-[140px]"
              onClick={handleDownload}
              disabled={isGenerating || filteredData.length === 0}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download Image
            </Button>
            {typeof navigator !== "undefined" && navigator.share && (
              <Button
                variant="outline"
                onClick={handleShare}
                disabled={isGenerating || filteredData.length === 0}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="gap-2"
            >
              <Link2 className="h-4 w-4" />
              <span className="hidden sm:inline">Copy link</span>
            </Button>
          </div>

          {/* Keyboard shortcuts hint */}
          <p className="text-xs text-muted-foreground text-center">
            Shortcuts: Enter / ⌘S / Ctrl+S to download, ⌘C / Ctrl+C to copy link, Esc to close
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
