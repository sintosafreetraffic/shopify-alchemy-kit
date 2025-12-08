import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, XCircle, Shield, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { AdminNav } from "@/components/AdminNav";

interface FlaggedCommission {
  id: string;
  affiliate_id: string;
  amount: number;
  order_amount: number | null;
  level: number;
  fraud_flag: boolean;
  fraud_reason: string | null;
  customer_email: string | null;
  customer_ip: string | null;
  status: string | null;
  created_at: string | null;
  order_id: string;
  affiliate?: {
    referral_code: string;
    user_id: string;
  };
}

interface Affiliate {
  id: string;
  referral_code: string;
}

export default function AdminAffiliateFraud() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [commissions, setCommissions] = useState<FlaggedCommission[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [affiliateEmails, setAffiliateEmails] = useState<Record<string, string>>({});
  
  // Filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedAffiliate, setSelectedAffiliate] = useState<string>("all");
  const [selectedReason, setSelectedReason] = useState<string>("all");

  // Summary stats
  const [totalFlagged, setTotalFlagged] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin, dateFrom, dateTo, selectedAffiliate, selectedReason]);

  async function checkAdminAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Please sign in to access this page");
      navigate("/auth");
      return;
    }

    // Check if user has admin role using the has_role function
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

  async function loadData() {
    setLoading(true);

    // Load affiliates for filter dropdown
    const { data: affData } = await supabase
      .from("affiliates")
      .select("id, referral_code, user_id");

    if (affData) {
      setAffiliates(affData);
      
      // Note: Getting emails via admin API won't work from client-side
      // We'll show referral_code as primary identifier
      setAffiliateEmails({});
    }

    // Build query for flagged commissions
    let query = supabase
      .from("commissions")
      .select(`
        id, affiliate_id, amount, order_amount, level, fraud_flag, fraud_reason,
        customer_email, customer_ip, status, created_at, order_id
      `)
      .or("fraud_flag.eq.true,status.eq.flagged")
      .order("created_at", { ascending: false });

    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", dateTo + "T23:59:59");
    }
    if (selectedAffiliate !== "all") {
      query = query.eq("affiliate_id", selectedAffiliate);
    }
    if (selectedReason !== "all") {
      query = query.eq("fraud_reason", selectedReason);
    }

    const { data: commData, error } = await query;

    if (error) {
      console.error("Error loading commissions:", error);
      toast.error("Error loading data");
    } else {
      // Enrich with affiliate data
      const enriched = (commData || []).map((c) => ({
        ...c,
        affiliate: affData?.find((a) => a.id === c.affiliate_id),
      }));
      setCommissions(enriched);
      setTotalFlagged(enriched.length);
      setTotalAmount(enriched.reduce((sum, c) => sum + Number(c.amount || 0), 0));
    }

    setLoading(false);
  }

  /**
   * Mark a flagged commission as legitimate
   * Updates commission status and recalculates affiliate totals atomically
   */
  async function markAsLegit(commission: FlaggedCommission) {
    setActionLoading(commission.id);

    try {
      // Step 1: Update the commission record
      const { error: commissionError } = await supabase
        .from("commissions")
        .update({
          fraud_flag: false,
          fraud_reason: null,
          status: "pending",
        })
        .eq("id", commission.id);

      if (commissionError) {
        throw new Error(`Failed to update commission: ${commissionError.message}`);
      }

      // Step 2: Recalculate affiliate totals based on all valid commissions
      await recalculateAffiliateTotals(commission.affiliate_id);

      toast.success("Commission marked as legitimate");
      
      // Optimistically remove from list
      setCommissions(prev => prev.filter(c => c.id !== commission.id));
      setTotalFlagged(prev => prev - 1);
      setTotalAmount(prev => prev - Number(commission.amount || 0));
      
    } catch (error) {
      console.error("Error marking as legit:", error);
      toast.error(error instanceof Error ? error.message : "Error updating commission");
      // Refetch to ensure UI is in sync
      loadData();
    } finally {
      setActionLoading(null);
    }
  }

  /**
   * Confirm a commission as fraudulent
   * Updates commission status to rejected
   */
  async function confirmFraud(commission: FlaggedCommission) {
    setActionLoading(commission.id);

    try {
      const { error } = await supabase
        .from("commissions")
        .update({
          fraud_flag: true,
          status: "rejected",
        })
        .eq("id", commission.id);

      if (error) {
        throw new Error(`Failed to update commission: ${error.message}`);
      }

      toast.success("Commission confirmed as fraud");
      
      // Update UI to show new status
      setCommissions(prev => prev.map(c => 
        c.id === commission.id 
          ? { ...c, fraud_flag: true, status: "rejected" }
          : c
      ));
      
    } catch (error) {
      console.error("Error confirming fraud:", error);
      toast.error(error instanceof Error ? error.message : "Error updating commission");
      loadData();
    } finally {
      setActionLoading(null);
    }
  }

  /**
   * Recalculate all affiliate totals based on current valid commissions
   * This ensures consistency after fraud status changes
   */
  async function recalculateAffiliateTotals(affiliateId: string) {
    // Get all valid commissions for this affiliate
    const { data: validCommissions, error: fetchError } = await supabase
      .from("commissions")
      .select("amount, order_amount, level")
      .eq("affiliate_id", affiliateId)
      .eq("fraud_flag", false)
      .in("status", ["pending", "approved"]);

    if (fetchError) {
      console.error("Error fetching commissions for recalculation:", fetchError);
      return;
    }

    // Calculate totals
    const level1Commissions = validCommissions?.filter(c => c.level === 1) || [];
    const allCommissions = validCommissions || [];

    const totalCommissions = allCommissions.reduce((sum, c) => sum + Number(c.amount || 0), 0);
    const totalReferrals = level1Commissions.length;
    
    // For monthly metrics, we'd need date filtering - for now update the ones we can
    // The CRON job will recalculate monthly metrics accurately
    
    const { error: updateError } = await supabase
      .from("affiliates")
      .update({
        total_commissions: totalCommissions,
        total_referrals: totalReferrals,
        // Note: monthly_sales_count and monthly_revenue_generated are recalculated by CRON
      })
      .eq("id", affiliateId);

    if (updateError) {
      console.error("Error updating affiliate totals:", updateError);
    }
  }

  const fraudReasons = [
    "self_referral_email",
    "self_referral_ip",
    "repeated_purchase_same_identity",
    "suspicious_activity",
  ];

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

  // Access denied (shouldn't reach here due to redirect, but safety fallback)
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
              <Shield className="h-6 w-6 text-destructive" />
              Fraud Review Panel
            </h1>
            <p className="text-muted-foreground">Review and resolve flagged commissions</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Flagged Commissions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{totalFlagged}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Flagged Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">${totalAmount.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Date From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Date To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Affiliate</label>
                <Select value={selectedAffiliate} onValueChange={setSelectedAffiliate}>
                  <SelectTrigger>
                    <SelectValue placeholder="All affiliates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All affiliates</SelectItem>
                    {affiliates.map((aff) => (
                      <SelectItem key={aff.id} value={aff.id}>
                        {aff.referral_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-muted-foreground mb-1 block">Fraud Reason</label>
                <Select value={selectedReason} onValueChange={setSelectedReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="All reasons" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All reasons</SelectItem>
                    {fraudReasons.map((reason) => (
                      <SelectItem key={reason} value={reason}>
                        {reason.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commissions Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Affiliate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Fraud Reason</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {commissions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                        No flagged commissions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    commissions.map((commission) => (
                      <TableRow key={commission.id}>
                        <TableCell>
                          <div className="font-medium">{commission.affiliate?.referral_code || "—"}</div>
                        </TableCell>
                        <TableCell className="font-medium">${Number(commission.amount).toFixed(2)}</TableCell>
                        <TableCell>${Number(commission.order_amount || 0).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={commission.level === 1 ? "default" : "secondary"}>
                            L{commission.level}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive" className="text-xs">
                            {commission.fraud_reason?.replace(/_/g, " ") || "flagged"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{commission.customer_email || "—"}</TableCell>
                        <TableCell className="text-sm font-mono">{commission.customer_ip || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {commission.created_at
                            ? format(new Date(commission.created_at), "MMM d, yyyy HH:mm")
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              commission.status === "rejected"
                                ? "destructive"
                                : commission.status === "pending"
                                ? "secondary"
                                : "outline"
                            }
                          >
                            {commission.status || "unknown"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => markAsLegit(commission)}
                              disabled={actionLoading === commission.id || commission.status === "rejected"}
                            >
                              {actionLoading === commission.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Legit
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => confirmFraud(commission)}
                              disabled={actionLoading === commission.id || commission.status === "rejected"}
                            >
                              {actionLoading === commission.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Fraud
                                </>
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
