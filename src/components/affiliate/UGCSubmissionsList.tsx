import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, ExternalLink, ImageIcon } from "lucide-react";
import { format, parseISO } from "date-fns";

interface UGCSubmission {
  id: string;
  content_url: string;
  content_type: string;
  description: string | null;
  status: string;
  created_at: string;
}

interface UGCSubmissionsListProps {
  affiliateId: string;
  refreshTrigger?: number;
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected: "bg-slate-100 text-slate-600 border-slate-200",
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

export function UGCSubmissionsList({ affiliateId, refreshTrigger }: UGCSubmissionsListProps) {
  const [submissions, setSubmissions] = useState<UGCSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const { data, error: fetchError } = await supabase
          .from("partner_ugc_submissions")
          .select("id, content_url, content_type, description, status, created_at")
          .eq("affiliate_id", affiliateId)
          .order("created_at", { ascending: false });

        if (fetchError) throw fetchError;
        setSubmissions(data || []);
      } catch (err) {
        console.error("Error fetching UGC submissions:", err);
        setError("Unable to load submissions");
      } finally {
        setLoading(false);
      }
    };

    if (affiliateId) {
      fetchSubmissions();
    }
  }, [affiliateId, refreshTrigger]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading submissions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">{error}</p>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8">
        <ImageIcon className="h-8 w-8 mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-muted-foreground text-sm">
          No submissions yet. Share your first piece of content above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground/80">Your Submissions</h4>
      <div className="space-y-2">
        {submissions.map((submission) => (
          <div
            key={submission.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {contentTypeLabels[submission.content_type] || submission.content_type}
                  </span>
                  <a
                    href={submission.content_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:text-primary/80"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(submission.created_at), "MMM d, yyyy")}
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-xs font-normal ${statusStyles[submission.status] || ""}`}
            >
              {submission.status}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
