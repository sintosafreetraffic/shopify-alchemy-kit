/**
 * Tracking Threshold Settings Component
 * Allows admins to configure alert thresholds for tracking health monitoring
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Settings, Save, RotateCcw, Loader2 } from "lucide-react";

interface ThresholdValues {
  success_rate_min: number;
  dead_letters_max: number;
  error_rate_max: number;
}

const DEFAULT_THRESHOLDS: ThresholdValues = {
  success_rate_min: 90,
  dead_letters_max: 5,
  error_rate_max: 15,
};

export function TrackingThresholdSettings() {
  const [thresholds, setThresholds] = useState<ThresholdValues>(DEFAULT_THRESHOLDS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalThresholds, setOriginalThresholds] = useState<ThresholdValues>(DEFAULT_THRESHOLDS);

  useEffect(() => {
    fetchThresholds();
  }, []);

  const fetchThresholds = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "tracking_thresholds")
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching thresholds:", error);
        return;
      }

      if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
        const values = data.value as Record<string, unknown>;
        const loaded = {
          success_rate_min: typeof values.success_rate_min === "number" ? values.success_rate_min : DEFAULT_THRESHOLDS.success_rate_min,
          dead_letters_max: typeof values.dead_letters_max === "number" ? values.dead_letters_max : DEFAULT_THRESHOLDS.dead_letters_max,
          error_rate_max: typeof values.error_rate_max === "number" ? values.error_rate_max : DEFAULT_THRESHOLDS.error_rate_max,
        };
        setThresholds(loaded);
        setOriginalThresholds(loaded);
      }
    } catch (err) {
      console.error("Error fetching thresholds:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ThresholdValues, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updated = { ...thresholds, [field]: numValue };
    setThresholds(updated);
    setHasChanges(JSON.stringify(updated) !== JSON.stringify(originalThresholds));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // First check if the setting exists
      const { data: existing } = await supabase
        .from("app_settings")
        .select("key")
        .eq("key", "tracking_thresholds")
        .single();

      const valueToSave = {
        success_rate_min: thresholds.success_rate_min,
        dead_letters_max: thresholds.dead_letters_max,
        error_rate_max: thresholds.error_rate_max,
      };

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("app_settings")
          .update({
            value: valueToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("key", "tracking_thresholds");
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("app_settings")
          .insert([{
            key: "tracking_thresholds",
            value: valueToSave,
          }]);
        if (error) throw error;
      }

      setOriginalThresholds(thresholds);
      setHasChanges(false);
      toast.success("Thresholds saved successfully");
    } catch (err) {
      console.error("Error saving thresholds:", err);
      toast.error("Failed to save thresholds");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    setHasChanges(JSON.stringify(DEFAULT_THRESHOLDS) !== JSON.stringify(originalThresholds));
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading thresholds...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Alert Thresholds</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Configure when alerts are triggered for tracking health issues.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="success_rate_min">Min Success Rate (%)</Label>
          <Input
            id="success_rate_min"
            type="number"
            min={0}
            max={100}
            value={thresholds.success_rate_min}
            onChange={(e) => handleChange("success_rate_min", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Alert if below this rate
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="error_rate_max">Max Error Rate (%)</Label>
          <Input
            id="error_rate_max"
            type="number"
            min={0}
            max={100}
            value={thresholds.error_rate_max}
            onChange={(e) => handleChange("error_rate_max", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Alert if exceeds this rate
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dead_letters_max">Max Dead Letters</Label>
          <Input
            id="dead_letters_max"
            type="number"
            min={0}
            value={thresholds.dead_letters_max}
            onChange={(e) => handleChange("dead_letters_max", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Alert if more than this count
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          size="sm"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save Changes
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>
    </Card>
  );
}
