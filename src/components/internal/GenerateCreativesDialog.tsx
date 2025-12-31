import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wand2, Image, Video, Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { EntityMetrics } from "@/hooks/useAdsReporting";

interface GenerateCreativesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entities: EntityMetrics[];
  entityType: "campaign" | "ad_group" | "ad";
  timeframe: string;
  accountSummary?: {
    spend: number;
    revenue: number;
    roas: number;
  };
  mode: "single" | "all";
  selectedEntity?: EntityMetrics;
}

export function GenerateCreativesDialog({
  open,
  onOpenChange,
  entities,
  entityType,
  timeframe,
  accountSummary,
  mode,
  selectedEntity,
}: GenerateCreativesDialogProps) {
  const [maxImages, setMaxImages] = useState(6);
  const [maxVideos, setMaxVideos] = useState(3);
  const [sendToWebhook, setSendToWebhook] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const entitiesToProcess = mode === "single" && selectedEntity 
    ? [selectedEntity] 
    : entities;

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);

    try {
      // Transform entities to the format expected by the edge function
      const formattedEntities = entitiesToProcess.map((e) => ({
        level: entityType,
        id: e.id,
        name: e.name,
        status: e.status || "ACTIVE",
        spend_eur: e.spend,
        revenue_eur: e.revenue,
        roas: e.roas,
        impressions: e.impressions,
        clicks: e.clicks,
        ctr: e.ctr,
        checkouts: e.checkouts,
        cpa_eur: e.cpa,
        format: e.creative_format?.toLowerCase() as "static" | "video" | null,
        category: e.creative_category,
        frequency_7d: undefined, // Not available in EntityMetrics
        product: e.product_focus || "Ergo Pillow",
      }));

      const payload = {
        entities: formattedEntities,
        timeframe: timeframe,
        max_images: maxImages,
        max_videos: maxVideos,
        send_to_webhook: sendToWebhook,
        placements_enabled: ["feed", "pin", "story"],
        products: ["Ergo Pillow"],
        account_summary: accountSummary ? {
          spend_eur: accountSummary.spend,
          revenue_eur: accountSummary.revenue,
          roas: accountSummary.roas,
          timeframe: timeframe,
        } : undefined,
      };

      console.log("Generating creative briefs with payload:", payload);

      const { data, error } = await supabase.functions.invoke("generate-creative-briefs", {
        body: payload,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setResult(data);

      // Show success toast
      const winnersCount = data?.selected_winners?.length || 0;
      const testBriefsCount = data?.test_briefs?.length || 0;
      const webhookSuccess = data?.webhook_result?.success;

      if (sendToWebhook && webhookSuccess) {
        toast.success(`Generated ${winnersCount} winner briefs, ${testBriefsCount} test briefs. Sent to Higgsfield!`);
      } else if (sendToWebhook && !webhookSuccess) {
        toast.warning(`Generated briefs but webhook failed: ${data?.webhook_result?.error}`);
      } else {
        toast.success(`Generated ${winnersCount} winner briefs, ${testBriefsCount} test briefs`);
      }

    } catch (err) {
      console.error("Failed to generate creative briefs:", err);
      toast.error(err instanceof Error ? err.message : "Failed to generate briefs");
    } finally {
      setGenerating(false);
    }
  };

  const resetDialog = () => {
    setResult(null);
    setMaxImages(6);
    setMaxVideos(3);
    setSendToWebhook(true);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) resetDialog(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Generate Creative Briefs
          </DialogTitle>
          <DialogDescription>
            {mode === "single" && selectedEntity ? (
              <>Generate Higgsfield prompts based on <strong>{selectedEntity.name}</strong></>
            ) : (
              <>Generate Higgsfield prompts for {entitiesToProcess.length} {entityType}s</>
            )}
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <>
            <div className="space-y-6 py-4">
              {/* Entity summary */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  {entitiesToProcess.length} {entityType}{entitiesToProcess.length !== 1 ? "s" : ""}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {timeframe.replace("last_", "Last ").replace("d", " days")}
                </Badge>
                {accountSummary && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${accountSummary.roas >= 2 ? "text-green-500 border-green-500/50" : accountSummary.roas >= 1.54 ? "text-yellow-500 border-yellow-500/50" : "text-red-500 border-red-500/50"}`}
                  >
                    ROAS: {accountSummary.roas.toFixed(2)}x
                  </Badge>
                )}
              </div>

              {/* Max Images */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Image className="h-4 w-4 text-blue-500" />
                    Max Static Images
                  </Label>
                  <span className="text-sm font-medium">{maxImages}</span>
                </div>
                <Slider
                  value={[maxImages]}
                  onValueChange={([v]) => setMaxImages(v)}
                  min={0}
                  max={12}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Max Videos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-purple-500" />
                    Max Videos
                  </Label>
                  <span className="text-sm font-medium">{maxVideos}</span>
                </div>
                <Slider
                  value={[maxVideos]}
                  onValueChange={([v]) => setMaxVideos(v)}
                  min={0}
                  max={6}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Send to Webhook */}
              <div className="flex items-center justify-between">
                <Label htmlFor="send-webhook" className="flex items-center gap-2">
                  <Send className="h-4 w-4" />
                  Send to Higgsfield
                </Label>
                <Switch
                  id="send-webhook"
                  checked={sendToWebhook}
                  onCheckedChange={setSendToWebhook}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={generating || (maxImages === 0 && maxVideos === 0)}>
                {generating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Briefs
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            {/* Results view */}
            <div className="space-y-4 py-4 max-h-[400px] overflow-y-auto">
              {/* Summary */}
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                  {result.selected_winners?.length || 0} Winners
                </Badge>
                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30">
                  {result.test_briefs?.length || 0} Test Briefs
                </Badge>
                {result.webhook_result && (
                  <Badge className={result.webhook_result.success 
                    ? "bg-blue-500/10 text-blue-500 border-blue-500/30" 
                    : "bg-red-500/10 text-red-500 border-red-500/30"
                  }>
                    {result.webhook_result.success ? "Webhook ✓" : "Webhook ✗"}
                  </Badge>
                )}
              </div>

              {/* Winners */}
              {result.selected_winners?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Selected Winners</h4>
                  {result.selected_winners.map((winner: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate max-w-[200px]">{winner.entity_name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          Priority {winner.priority}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">{winner.why_this_wins}</p>
                      <div className="flex gap-1 flex-wrap">
                        {winner.creative_concepts?.map((c: any, j: number) => (
                          <Badge key={j} variant="secondary" className="text-[10px]">
                            {c.format}: {c.category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Test Briefs */}
              {result.test_briefs?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Test Briefs</h4>
                  {result.test_briefs.map((brief: any, i: number) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 text-xs space-y-1">
                      <p className="text-muted-foreground">{brief.hypothesis}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {brief.recommended_test_type}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {/* Generation Plan Notes */}
              {result.generation_plan?.notes && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs">
                  <p className="text-muted-foreground">{result.generation_plan.notes}</p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setResult(null)}>
                Generate More
              </Button>
              <Button onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
