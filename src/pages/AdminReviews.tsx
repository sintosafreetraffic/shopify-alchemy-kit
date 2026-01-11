import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import {
  ArrowLeft,
  Loader2,
  Star,
  Check,
  X,
  MessageSquare,
  Eye,
  Image,
  Video,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { AdminNav } from "@/components/AdminNav";

interface ReviewMedia {
  id: string;
  review_id: string;
  media_type: string;
  storage_path: string;
}

interface ProductReview {
  id: string;
  product_handle: string;
  variant_title: string | null;
  customer_name: string;
  customer_email: string;
  rating: number;
  title: string | null;
  body: string;
  is_verified_purchase: boolean;
  status: "pending" | "approved" | "rejected";
  admin_reply: string | null;
  admin_notes: string | null;
  helpful_count: number;
  created_at: string;
  reviewed_at: string | null;
  review_media?: ReviewMedia[];
}

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  rejected: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

function getMediaUrl(storagePath: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/review-media/${storagePath}`;
}

const AdminReviews = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("pending");

  // Modal states
  const [selectedReview, setSelectedReview] = useState<ProductReview | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [adminReply, setAdminReply] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [isSavingReply, setIsSavingReply] = useState(false);

  useEffect(() => {
    checkAdminAndLoad();
  }, []);

  // Realtime subscription for new reviews
  useEffect(() => {
    const channel = supabase
      .channel("admin-reviews")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "product_reviews",
        },
        () => {
          loadReviews();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      await loadReviews();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/");
    }
  };

  const loadReviews = async () => {
    setIsLoading(true);
    try {
      // Admin can see all reviews regardless of status
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch media for all reviews
      const reviewIds = data?.map((r) => r.id) || [];
      let mediaData: ReviewMedia[] = [];

      if (reviewIds.length > 0) {
        const { data: media, error: mediaError } = await supabase
          .from("review_media")
          .select("*")
          .in("review_id", reviewIds);

        if (!mediaError) {
          mediaData = media || [];
        }
      }

      // Attach media to reviews
      const reviewsWithMedia = data?.map((review) => ({
        ...review,
        review_media: mediaData.filter((m) => m.review_id === review.id),
      })) as ProductReview[];

      setReviews(reviewsWithMedia || []);
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: "approved" | "rejected") => {
    setUpdatingId(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("product_reviews")
        .update({
          status: newStatus,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
        })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Review ${newStatus}`);

      setReviews((prev) =>
        prev.map((review) =>
          review.id === id
            ? { ...review, status: newStatus, reviewed_at: new Date().toISOString() }
            : review
        )
      );
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveReply = async () => {
    if (!selectedReview) return;
    
    setIsSavingReply(true);
    try {
      const { error } = await supabase
        .from("product_reviews")
        .update({
          admin_reply: adminReply || null,
          admin_notes: adminNotes || null,
        })
        .eq("id", selectedReview.id);

      if (error) throw error;

      toast.success("Reply saved successfully");
      
      setReviews((prev) =>
        prev.map((review) =>
          review.id === selectedReview.id
            ? { ...review, admin_reply: adminReply || null, admin_notes: adminNotes || null }
            : review
        )
      );
      
      setShowReplyModal(false);
      setSelectedReview(null);
    } catch (error) {
      console.error("Error saving reply:", error);
      toast.error("Failed to save reply");
    } finally {
      setIsSavingReply(false);
    }
  };

  const openReplyModal = (review: ProductReview) => {
    setSelectedReview(review);
    setAdminReply(review.admin_reply || "");
    setAdminNotes(review.admin_notes || "");
    setShowReplyModal(true);
  };

  const openPreview = (review: ProductReview) => {
    setSelectedReview(review);
    setShowPreview(true);
  };

  const filteredReviews = reviews.filter((review) =>
    filterStatus === "all" ? true : review.status === filterStatus
  );

  const pendingCount = reviews.filter((r) => r.status === "pending").length;

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
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground">
              Review Moderation
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {pendingCount} pending
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground text-sm">
              Approve, reject, and reply to customer reviews
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadReviews}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 mb-6">
          {["pending", "approved", "rejected", "all"].map((status) => (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterStatus(status)}
              className="capitalize"
            >
              {status}
              {status === "pending" && pendingCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          ))}
          <span className="text-sm text-muted-foreground ml-4">
            {filteredReviews.length} review(s)
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {filterStatus === "pending"
                ? "No reviews pending approval"
                : "No reviews found"}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>Media</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id} className="group">
                    <TableCell className="text-sm text-muted-foreground">
                      {format(parseISO(review.created_at), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="font-medium">{review.customer_name}</span>
                        <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {review.customer_email}
                        </p>
                        {review.is_verified_purchase && (
                          <Badge
                            variant="outline"
                            className="mt-1 text-xs bg-green-50 text-green-700 border-green-200"
                          >
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{review.product_handle}</span>
                      {review.variant_title && (
                        <p className="text-xs text-muted-foreground">
                          {review.variant_title}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? "fill-yellow-500 text-yellow-500"
                                : "fill-muted text-muted"
                            }`}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {review.title && (
                          <p className="font-medium text-sm">{review.title}</p>
                        )}
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {review.body}
                        </p>
                        {review.admin_reply && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Has reply
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {review.review_media && review.review_media.length > 0 ? (
                        <div className="flex items-center gap-1">
                          {review.review_media.map((media) => (
                            <Badge
                              key={media.id}
                              variant="secondary"
                              className="text-xs"
                            >
                              {media.media_type === "video" ? (
                                <Video className="h-3 w-3" />
                              ) : (
                                <Image className="h-3 w-3" />
                              )}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusStyles[review.status] || ""}>
                        {review.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {updatingId === review.id ? (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => openPreview(review)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => openReplyModal(review)}
                            title="Reply"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          {review.status !== "approved" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-emerald-600 hover:bg-emerald-500/10 h-8"
                              onClick={() => updateStatus(review.id, "approved")}
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                          )}
                          {review.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-slate-600 hover:bg-slate-500/10 h-8"
                              onClick={() => updateStatus(review.id, "rejected")}
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

      {/* Preview Modal */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedReview && (
            <>
              <DialogHeader>
                <DialogTitle>Review Preview</DialogTitle>
                <DialogDescription>
                  By {selectedReview.customer_name} on{" "}
                  {format(parseISO(selectedReview.created_at), "MMM d, yyyy")}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Media */}
                {selectedReview.review_media && selectedReview.review_media.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReview.review_media.map((media) => (
                      <div key={media.id} className="rounded-lg overflow-hidden border">
                        {media.media_type === "video" ? (
                          <video
                            src={getMediaUrl(media.storage_path)}
                            controls
                            className="w-full aspect-video object-cover"
                          />
                        ) : (
                          <img
                            src={getMediaUrl(media.storage_path)}
                            alt="Review media"
                            className="w-full aspect-square object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`h-5 w-5 ${
                          i < selectedReview.rating
                            ? "fill-yellow-500 text-yellow-500"
                            : "fill-muted text-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <Badge className={statusStyles[selectedReview.status]}>
                    {selectedReview.status}
                  </Badge>
                </div>

                {/* Title & Body */}
                {selectedReview.title && (
                  <h4 className="font-semibold">{selectedReview.title}</h4>
                )}
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedReview.body}
                </p>

                {/* Customer Info */}
                <div className="pt-4 border-t text-sm">
                  <p>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {selectedReview.customer_email}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Product:</span>{" "}
                    {selectedReview.product_handle}
                  </p>
                  {selectedReview.variant_title && (
                    <p>
                      <span className="text-muted-foreground">Variant:</span>{" "}
                      {selectedReview.variant_title}
                    </p>
                  )}
                  <p>
                    <span className="text-muted-foreground">Verified:</span>{" "}
                    {selectedReview.is_verified_purchase ? "Yes" : "No"}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Reply Modal */}
      <Dialog open={showReplyModal} onOpenChange={setShowReplyModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Reply to Review</DialogTitle>
            <DialogDescription>
              Your reply will be visible on the published review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Public Reply (visible to customers)
              </label>
              <Textarea
                placeholder="Thank you for your feedback..."
                value={adminReply}
                onChange={(e) => setAdminReply(e.target.value)}
                className="min-h-[100px]"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Internal Notes (not visible)
              </label>
              <Textarea
                placeholder="Notes for internal reference..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReplyModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveReply} disabled={isSavingReply}>
              {isSavingReply ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Reply"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminReviews;
