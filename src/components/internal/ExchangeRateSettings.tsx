/**
 * Exchange Rate Settings Component
 * Allows admins to configure the USD to EUR exchange rate used for ROAS calculations
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, Save, RotateCcw, Loader2, ExternalLink } from "lucide-react";

const DEFAULT_RATE = 0.92;
const APP_SETTINGS_KEY = "usd_to_eur_rate";

export function ExchangeRateSettings() {
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalRate, setOriginalRate] = useState(DEFAULT_RATE);

  useEffect(() => {
    fetchRate();
  }, []);

  const fetchRate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", APP_SETTINGS_KEY)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching exchange rate:", error);
        return;
      }

      if (data?.value && typeof data.value === "object" && !Array.isArray(data.value)) {
        const values = data.value as Record<string, unknown>;
        const loadedRate = typeof values.rate === "number" ? values.rate : DEFAULT_RATE;
        setRate(loadedRate);
        setOriginalRate(loadedRate);
      }
    } catch (err) {
      console.error("Error fetching exchange rate:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setRate(numValue);
    setHasChanges(numValue !== originalRate);
  };

  const handleSave = async () => {
    if (rate <= 0 || rate > 2) {
      toast.error("Exchange rate must be between 0.01 and 2.00");
      return;
    }

    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("app_settings")
        .select("key")
        .eq("key", APP_SETTINGS_KEY)
        .single();

      const valueToSave = { rate, updated_at: new Date().toISOString() };

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({
            value: valueToSave,
            updated_at: new Date().toISOString(),
          })
          .eq("key", APP_SETTINGS_KEY);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert([{
            key: APP_SETTINGS_KEY,
            value: valueToSave,
          }]);
        if (error) throw error;
      }

      setOriginalRate(rate);
      setHasChanges(false);
      toast.success("Exchange rate saved. Refresh ads data to see updated ROAS.");
    } catch (err) {
      console.error("Error saving exchange rate:", err);
      toast.error("Failed to save exchange rate");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setRate(DEFAULT_RATE);
    setHasChanges(DEFAULT_RATE !== originalRate);
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading exchange rate...</span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">USD → EUR Exchange Rate</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        Used to convert Pinterest ad spend (USD) to EUR for accurate ROAS calculation.
        Check the current rate at{" "}
        <a 
          href="https://www.google.com/finance/quote/USD-EUR" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline inline-flex items-center gap-1"
        >
          Google Finance <ExternalLink className="w-3 h-3" />
        </a>
      </p>

      <div className="flex items-end gap-4 mb-4">
        <div className="space-y-2 flex-1 max-w-xs">
          <Label htmlFor="exchange_rate">Rate (1 USD = X EUR)</Label>
          <Input
            id="exchange_rate"
            type="number"
            min={0.01}
            max={2}
            step={0.01}
            value={rate}
            onChange={(e) => handleChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Current: 1 USD = {rate.toFixed(4)} EUR
          </p>
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
            Save
          </Button>
          <Button
            onClick={handleReset}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </Card>
  );
}
