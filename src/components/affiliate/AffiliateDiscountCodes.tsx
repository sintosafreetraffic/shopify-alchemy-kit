/**
 * AffiliateDiscountCodes Component
 * 
 * Allows affiliates to create, manage, and track their discount codes.
 * Discount codes are the #1 affiliate conversion driver (40-60% of sales).
 * 
 * Features:
 * - Create codes with custom names (synced to Shopify)
 * - Deactivate/reactivate codes (synced to Shopify)
 * - View usage analytics
 * - Guardrails: max 5 active codes, optional expiry
 * 
 * IMPORTANT: All codes are synced to Shopify to ensure they work at checkout.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Copy, Check, Tag, Plus, Loader2, TrendingUp, AlertCircle, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DiscountCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  usage_count: number;
  max_uses: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

interface AffiliateDiscountCodesProps {
  affiliateId: string;
}

const MAX_ACTIVE_CODES = 5;

export function AffiliateDiscountCodes({ affiliateId }: AffiliateDiscountCodesProps) {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  // Analytics summary
  const totalUsage = codes.reduce((sum, c) => sum + c.usage_count, 0);
  const activeCount = codes.filter((c) => c.is_active).length;
  const canCreateMore = activeCount < MAX_ACTIVE_CODES;

  useEffect(() => {
    loadCodes();
  }, [affiliateId]);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("affiliate_discount_codes")
        .select("*")
        .eq("affiliate_id", affiliateId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error("Error loading discount codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast({ title: "Copied!", description: "Discount code copied to clipboard" });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const toggleCodeStatus = async (codeId: string, code: string, currentActive: boolean) => {
    // Check if activating would exceed limit
    if (!currentActive && activeCount >= MAX_ACTIVE_CODES) {
      toast({
        title: "Limit reached",
        description: `You can have at most ${MAX_ACTIVE_CODES} active codes. Deactivate one first.`,
        variant: "destructive",
      });
      return;
    }

    setToggling(codeId);
    try {
      // Use edge function to sync with Shopify
      const { data, error } = await supabase.functions.invoke('affiliate-discount-sync', {
        body: {
          action: currentActive ? 'deactivate' : 'activate',
          code: code,
          codeId: codeId,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: currentActive ? "Deactivated" : "Activated",
        description: currentActive
          ? "Code is now inactive and won't work at checkout"
          : "Code is now active and ready for customers",
      });
      loadCodes();
    } catch (error: any) {
      console.error("Error toggling code:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update code status",
        variant: "destructive",
      });
    } finally {
      setToggling(null);
    }
  };

  const createCode = async () => {
    if (!newCode.trim()) return;

    // Check limit before creating
    if (activeCount >= MAX_ACTIVE_CODES) {
      toast({
        title: "Limit reached",
        description: `You can have at most ${MAX_ACTIVE_CODES} active codes.`,
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      // Format code: uppercase, alphanumeric only
      const formattedCode = newCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

      if (formattedCode.length < 4) {
        toast({
          title: "Code too short",
          description: "Discount code must be at least 4 characters",
          variant: "destructive",
        });
        return;
      }

      if (formattedCode.length > 20) {
        toast({
          title: "Code too long",
          description: "Discount code must be 20 characters or less",
          variant: "destructive",
        });
        return;
      }

      // Use edge function to create in Shopify first, then DB
      const { data, error } = await supabase.functions.invoke('affiliate-discount-sync', {
        body: {
          action: 'create',
          code: formattedCode,
          discountValue: 10, // Default 10% discount
          affiliateId: affiliateId,
        },
      });

      if (error) throw error;
      
      if (data?.error) {
        // Handle specific errors
        if (data.error.includes('already exists')) {
          toast({
            title: "Code unavailable",
            description: data.error,
            variant: "destructive",
          });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      toast({ 
        title: "Success!", 
        description: `Code "${formattedCode}" created and synced to Shopify`,
      });
      setNewCode("");
      setIsDialogOpen(false);
      loadCodes();
    } catch (error: any) {
      console.error("Error creating code:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create discount code",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-medium">
              <Tag className="h-5 w-5 text-muted-foreground" />
              Discount Codes
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Share codes for tracked discounts • {activeCount}/{MAX_ACTIVE_CODES} active
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" disabled={!canCreateMore}>
                        <Plus className="h-4 w-4 mr-1" />
                        Create
                      </Button>
                    </DialogTrigger>
                  </span>
                </TooltipTrigger>
                {!canCreateMore && (
                  <TooltipContent>
                    <p>Deactivate a code to create a new one</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Discount Code</DialogTitle>
                <DialogDescription>
                  Your customers will use this code at checkout for 10% off
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Code Name</Label>
                  <Input
                    placeholder="e.g., SLEEPWELL or your name"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="uppercase font-mono"
                    maxLength={20}
                  />
                  <p className="text-xs text-muted-foreground">
                    4-20 characters, letters and numbers only
                  </p>
                </div>
                <Button
                  onClick={createCode}
                  className="w-full"
                  disabled={creating || !newCode.trim() || newCode.trim().length < 4}
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Discount Code
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Quick Analytics */}
        {codes.length > 0 && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>
                <span className="font-semibold text-foreground">{totalUsage}</span> total uses
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {codes.length === 0 ? (
          <div className="text-center py-6">
            <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No discount codes yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Discount codes drive 40-60% of affiliate sales
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map((code) => {
              const isExpired = code.ends_at && new Date(code.ends_at) < new Date();
              const isMaxed = code.max_uses && code.usage_count >= code.max_uses;

              return (
                <div
                  key={code.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    code.is_active && !isExpired && !isMaxed
                      ? "bg-card"
                      : "bg-muted/30 opacity-75"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-semibold text-lg truncate">
                          {code.code}
                        </span>
                        {code.is_active && !isExpired && !isMaxed ? (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-700 shrink-0"
                          >
                            Active
                          </Badge>
                        ) : isExpired ? (
                          <Badge variant="secondary" className="shrink-0">
                            Expired
                          </Badge>
                        ) : isMaxed ? (
                          <Badge variant="secondary" className="shrink-0">
                            Max Uses
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="shrink-0">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {code.discount_value}% off • {code.usage_count} uses
                        {code.max_uses ? ` / ${code.max_uses} max` : ""}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {/* Toggle active status */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center">
                            <Switch
                              checked={code.is_active}
                              onCheckedChange={() => toggleCodeStatus(code.id, code.code, code.is_active)}
                              disabled={toggling === code.id || isExpired || isMaxed}
                              aria-label={code.is_active ? "Deactivate code" : "Activate code"}
                            />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{code.is_active ? "Deactivate" : "Activate"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Copy button */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyCode(code.code)}
                      disabled={!code.is_active}
                    >
                      {copiedCode === code.code ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Guardrail warning */}
        {activeCount >= MAX_ACTIVE_CODES - 1 && activeCount < MAX_ACTIVE_CODES && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>You have {MAX_ACTIVE_CODES - activeCount} code slot remaining</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
