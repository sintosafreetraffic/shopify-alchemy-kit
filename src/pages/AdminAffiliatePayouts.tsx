import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { Shield, ArrowLeft, Loader2, DollarSign, Users, CheckCircle, Clock, Wallet, History } from "lucide-react";
import { format } from "date-fns";
import { AdminNav } from "@/components/AdminNav";

interface AffiliateWithPayout {
  id: string;
  user_id: string;
  referral_code: string;
  tier: string | null;
  pending_payout_amount: number | null;
  payout_threshold: number | null;
  total_commissions: number | null;
  monthly_sales_count: number | null;
  monthly_revenue_generated: number | null;
  last_payout_at: string | null;
  status: string | null;
}

interface RecentPayout {
  id: string;
  affiliate_id: string;
  amount: number;
  currency: string;
  processed_at: string;
  processed_by_user_id: string | null;
  method: string;
  note: string | null;
  referral_code?: string;
}

const tierConfig: Record<string, { icon: string; color: string }> = {
  bronze: { icon: "🥉", color: "text-amber-700" },
  silver: { icon: "🥈", color: "text-slate-600" },
  gold: { icon: "🥇", color: "text-yellow-700" },
  platinum: { icon: "💎", color: "text-slate-700" },
  diamond: { icon: "👑", color: "text-cyan-700" },
};

export default function AdminAffiliatePayouts() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [affiliates, setAffiliates] = useState<AffiliateWithPayout[]>([]);
  const [recentPayouts, setRecentPayouts] = useState<RecentPayout[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<AffiliateWithPayout | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadAffiliates();
      loadRecentPayouts();
    }
  }, [isAdmin]);

  async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to access this page");
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (error) {
      console.error("Error checking admin role:", error);
      toast.error("Error verifying admin access");
      navigate("/");
      return;
    }

    if (!data) {
      toast.error("Access denied: Admin privileges required");
      navigate("/");
      return;
    }

    setIsAdmin(true);
    setLoading(false);
  }

  async function loadAffiliates() {
    setLoading(true);
    const { data, error } = await supabase
      .from("affiliates")
      .select("id, user_id, referral_code, tier, pending_payout_amount, payout_threshold, total_commissions, monthly_sales_count, monthly_revenue_generated, last_payout_at, status")
      .eq("status", "active")
      .order("pending_payout_amount", { ascending: false });

    if (error) {
      console.error("Error loading affiliates:", error);
      toast.error("Error loading affiliate data");
    } else {
      setAffiliates(data || []);
    }
    setLoading(false);
  }

  async function loadRecentPayouts() {
    // Fetch recent payouts with affiliate info
    const { data: payouts, error } = await supabase
      .from("affiliate_payouts")
      .select("*")
      .order("processed_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading recent payouts:", error);
      return;
    }

    // Fetch affiliate referral codes
    if (payouts && payouts.length > 0) {
      const affiliateIds = [...new Set(payouts.map(p => p.affiliate_id))];
      const { data: affiliatesData } = await supabase
        .from("affiliates")
        .select("id, referral_code")
        .in("id", affiliateIds);

      const codeMap: Record<string, string> = {};
      affiliatesData?.forEach(a => {
        codeMap[a.id] = a.referral_code;
      });

      setRecentPayouts(payouts.map(p => ({
        ...p,
        referral_code: codeMap[p.affiliate_id] || "Unknown"
      })));
    } else {
      setRecentPayouts([]);
    }
  }

  function isReadyForPayout(affiliate: AffiliateWithPayout): boolean {
    const pending = affiliate.pending_payout_amount || 0;
    const threshold = affiliate.payout_threshold || 50;
    return pending >= threshold;
  }

  const readyAffiliates = affiliates.filter(isReadyForPayout);
  const belowThresholdAffiliates = affiliates.filter((a) => !isReadyForPayout(a));

  const totalPendingReady = readyAffiliates.reduce(
    (sum, a) => sum + (a.pending_payout_amount || 0),
    0
  );

  function openPayoutConfirmation(affiliate: AffiliateWithPayout) {
    setSelectedAffiliate(affiliate);
    setConfirmDialogOpen(true);
  }

  async function processManualPayout() {
    if (!selectedAffiliate) return;
    
    setConfirmDialogOpen(false);
    setProcessingId(selectedAffiliate.id);

    try {
      // Call the edge function to process payout atomically
      const { data, error } = await supabase.functions.invoke('affiliate-api', {
        body: { 
          action: 'process-payout', 
          data: { affiliateId: selectedAffiliate.id } 
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to process payout');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast.success("Payout recorded successfully");

      // Optimistically update UI
      setAffiliates((prev) =>
        prev.map((a) =>
          a.id === selectedAffiliate.id
            ? { ...a, pending_payout_amount: 0, last_payout_at: new Date().toISOString() }
            : a
        )
      );

      // Reload recent payouts
      loadRecentPayouts();
    } catch (error) {
      console.error("Error processing payout:", error);
      toast.error(error instanceof Error ? error.message : "Error processing payout");
      loadAffiliates();
    } finally {
      setProcessingId(null);
      setSelectedAffiliate(null);
    }
  }

  function renderAffiliateRow(affiliate: AffiliateWithPayout, showPayoutButton: boolean) {
    const tier = affiliate.tier || "bronze";
    const tierInfo = tierConfig[tier] || tierConfig.bronze;

    return (
      <TableRow key={affiliate.id}>
        <TableCell>
          <div className="font-medium">{affiliate.referral_code}</div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <span>{tierInfo.icon}</span>
            <span className={`capitalize ${tierInfo.color}`}>{tier}</span>
          </div>
        </TableCell>
        <TableCell className="font-semibold text-green-600">
          ${(affiliate.pending_payout_amount || 0).toFixed(2)}
        </TableCell>
        <TableCell>${(affiliate.payout_threshold || 50).toFixed(2)}</TableCell>
        <TableCell>${(affiliate.total_commissions || 0).toFixed(2)}</TableCell>
        <TableCell>{affiliate.monthly_sales_count || 0}</TableCell>
        <TableCell>${(affiliate.monthly_revenue_generated || 0).toFixed(2)}</TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {affiliate.last_payout_at
            ? format(new Date(affiliate.last_payout_at), "MMM d, yyyy")
            : "Never"}
        </TableCell>
        <TableCell className="text-right">
          {showPayoutButton && (
            <Button
              size="sm"
              onClick={() => openPayoutConfirmation(affiliate)}
              disabled={processingId === affiliate.id}
            >
              {processingId === affiliate.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Processing...
                </>
              ) : (
                "Mark payout processed"
              )}
            </Button>
          )}
        </TableCell>
      </TableRow>
    );
  }

  // Loading state
  if (isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Access denied fallback
  if (isAdmin === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              You do not have permission to access this page. Admin privileges are required.
            </p>
            <Button onClick={() => navigate("/")}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Admin Navigation */}
        <AdminNav />

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-6 w-6 text-primary" />
              Payout Processing
            </h1>
            <p className="text-muted-foreground">Manage and process affiliate payouts</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="h-4 w-4" />
                Affiliates Ready for Payout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{readyAffiliates.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Total Pending Payout (Ready)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">${totalPendingReady.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Ready for Payout Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Ready for Payout
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : readyAffiliates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No affiliates ready for payout
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>30d Sales</TableHead>
                    <TableHead>30d Revenue</TableHead>
                    <TableHead>Last Payout</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readyAffiliates.map((affiliate) => renderAffiliateRow(affiliate, true))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Below Threshold Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5 text-muted-foreground" />
              Below Threshold
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : belowThresholdAffiliates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No affiliates below threshold
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referral Code</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Pending</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Total Earnings</TableHead>
                    <TableHead>30d Sales</TableHead>
                    <TableHead>30d Revenue</TableHead>
                    <TableHead>Last Payout</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {belowThresholdAffiliates.map((affiliate) => renderAffiliateRow(affiliate, false))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Recent Payouts Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-muted-foreground" />
              Recent Payouts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recentPayouts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No payouts processed yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentPayouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="text-sm">
                        {format(new Date(payout.processed_at), "MMM d, yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">{payout.referral_code}</TableCell>
                      <TableCell className="font-semibold text-green-600">
                        ${payout.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{payout.currency}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {payout.method.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payout.note || "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payout Processing</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark all eligible commissions as paid and reset the pending payout for{" "}
              <strong>{selectedAffiliate?.referral_code}</strong>.
              <br /><br />
              <strong>Amount:</strong> ${(selectedAffiliate?.pending_payout_amount || 0).toFixed(2)}
              <br /><br />
              <span className="text-amber-600">
                Note: Actual money transfer must be done externally (PayPal/bank).
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={processManualPayout}>
              Confirm Payout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}