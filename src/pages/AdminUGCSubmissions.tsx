import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ArrowLeft, ExternalLink, Loader2, ImageIcon, Check, X } from "lucide-react";
import { AdminNav } from "@/components/AdminNav";

interface UGCSubmission {
  id: string;
  affiliate_id: string;
  content_url: string;
  content_type: string;
  description: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  admin_notes: string | null;
  affiliates?: {
    referral_code: string;
    user_id: string;
  };
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const contentTypeLabels: Record<string, string> = {
  instagram_post: "Instagram Post",
  instagram_reel: "Instagram Reel",
  tiktok: "TikTok",
  youtube: "YouTube",
  blog: "Blog Post",
  review: "Review",
  other: "Other",
};

const AdminUGCSubmissions = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  const checkAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin");

      if (!roles || roles.length === 0) {
        toast.error("Access denied. Admin privileges required.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadSubmissions();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/");
    }
  };

  const loadSubmissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("partner_ugc_submissions")
        .select(`
          id,
          affiliate_id,
          content_url,
          content_type,
          description,
          status,
          created_at,
          reviewed_at,
          admin_notes,
          affiliates (
            referral_code,
            user_id
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error("Error loading UGC submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    setUpdatingId(id);
    try {
      const { error } = await supabase
        .from("partner_ugc_submissions")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // TODO: Future - Add reward distribution logic here for approved content
      // e.g., supabase.functions.invoke('ugc-reward', { body: { submission_id: id } })

      toast.success(`Submission ${newStatus}`);

      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === id
            ? { ...sub, status: newStatus, reviewed_at: new Date().toISOString() }
            : sub
        )
      );
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredSubmissions = submissions.filter((sub) =>
    filterStatus === "all" ? true : sub.status === filterStatus
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">UGC Submissions</h1>
            <p className="text-muted-foreground text-sm">
              Review partner content submissions
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 mb-6">
          {["all", "pending", "approved", "rejected"].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="capitalize"
            >
              {status}
            </Button>
          ))}
          <span className="text-sm text-muted-foreground ml-4">
            {filteredSubmissions.length} submission(s)
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No submissions found</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((sub) => (
                  <TableRow key={sub.id} className="group">
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(sub.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">
                          {sub.affiliates?.referral_code || "Unknown"}
                        </span>
                        <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {sub.affiliate_id.slice(0, 8)}...
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs">
                        {contentTypeLabels[sub.content_type] || sub.content_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <a
                          href={sub.content_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          View content
                          <ExternalLink className="h-3 w-3" />
                        </a>
                        {sub.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {sub.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusStyles[sub.status] || ""}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {updatingId === sub.id ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          {sub.status !== "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 hover:bg-emerald-500/10 h-8"
                              onClick={() => updateStatus(sub.id, "approved")}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          {sub.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-slate-600 hover:bg-slate-500/10 h-8"
                              onClick={() => updateStatus(sub.id, "rejected")}
                            >
                              <X className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUGCSubmissions;
