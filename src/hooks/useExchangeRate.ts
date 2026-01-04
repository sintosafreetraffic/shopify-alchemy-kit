/**
 * Hook to fetch the USD to EUR exchange rate from app_settings
 */

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_RATE = 0.92;
const APP_SETTINGS_KEY = "usd_to_eur_rate";

export function useExchangeRate() {
  const [rate, setRate] = useState(DEFAULT_RATE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRate = async () => {
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
        }
      } catch (err) {
        console.error("Error fetching exchange rate:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRate();
  }, []);

  return { rate, loading, defaultRate: DEFAULT_RATE };
}
