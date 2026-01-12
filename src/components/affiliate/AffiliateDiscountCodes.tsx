import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, Tag, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DiscountCode {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  usage_count: number;
  max_uses: number | null;
  created_at: string;
}

interface AffiliateDiscountCodesProps {
  affiliateId: string;
}

export function AffiliateDiscountCodes({ affiliateId }: AffiliateDiscountCodesProps) {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [newCode, setNewCode] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

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

  const createCode = async () => {
    if (!newCode.trim()) return;
    
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

      const { error } = await supabase
        .from("affiliate_discount_codes")
        .insert({
          affiliate_id: affiliateId,
          code: formattedCode,
          discount_type: "percentage",
          discount_value: 10, // Default 10% discount
          is_active: true,
        });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Code exists",
            description: "This discount code is already in use",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({ title: "Success!", description: "Discount code created" });
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
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <Tag className="h-5 w-5 text-muted-foreground" />
            Your Discount Codes
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                Create Code
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Discount Code</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Code Name</Label>
                  <Input
                    placeholder="e.g., SLEEPWELL or your name"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your customers will use this code at checkout for 10% off
                  </p>
                </div>
                <Button 
                  onClick={createCode} 
                  className="w-full"
                  disabled={creating || !newCode.trim()}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Create Discount Code
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground">
          Share these codes with your audience for tracked discounts
        </p>
      </CardHeader>
      <CardContent>
        {codes.length === 0 ? (
          <div className="text-center py-6">
            <Tag className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">
              No discount codes yet. Create your first one!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Discount codes are the #1 conversion driver - 40-60% of affiliate sales use them
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {codes.map((code) => (
              <div
                key={code.id}
                className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-lg">
                        {code.code}
                      </span>
                      {code.is_active ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {code.discount_value}% off • Used {code.usage_count} times
                      {code.max_uses ? ` / ${code.max_uses} max` : ""}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyCode(code.code)}
                >
                  {copiedCode === code.code ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
