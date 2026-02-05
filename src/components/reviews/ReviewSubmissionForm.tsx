import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Star, Upload, X, Loader2, CheckCircle, Image, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const reviewSchema = z.object({
  customer_name: z.string().min(2, "Name must be at least 2 characters"),
  customer_email: z.string().email("Please enter a valid email"),
  rating: z.number().min(1, "Please select a rating").max(5),
  title: z.string().optional(),
  body: z.string().min(10, "Review must be at least 10 characters"),
  honeypot: z.string().max(0), // Spam prevention - must be empty
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewSubmissionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productHandle: string;
  variantTitle?: string;
}

export const ReviewSubmissionForm = ({
  open,
  onOpenChange,
  productHandle,
  variantTitle,
}: ReviewSubmissionFormProps) => {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      rating: 0,
      title: "",
      body: "",
      honeypot: "",
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate files
    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Max size is 50MB.`);
        return false;
      }
      if (![...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].includes(file.type)) {
        toast.error(`${file.name} is not a supported format.`);
        return false;
      }
      return true;
    });

    // Limit to 3 files
    const newFiles = [...mediaFiles, ...validFiles].slice(0, 3);
    setMediaFiles(newFiles);

    // Create previews
    const newPreviews = newFiles.map((file) => URL.createObjectURL(file));
    setMediaPreviews(newPreviews);
  };

  const removeMedia = (index: number) => {
    const newFiles = mediaFiles.filter((_, i) => i !== index);
    const newPreviews = mediaPreviews.filter((_, i) => i !== index);
    
    // Revoke old URL
    URL.revokeObjectURL(mediaPreviews[index]);
    
    setMediaFiles(newFiles);
    setMediaPreviews(newPreviews);
  };

  const uploadMedia = async (reviewId: string): Promise<void> => {
    for (const file of mediaFiles) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${reviewId}/${crypto.randomUUID()}.${fileExt}`;
      const mediaType = file.type.startsWith("video/") ? "video" : "photo";

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("review-media")
        .upload(fileName, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        continue;
      }

      // Create media record
      await supabase.from("review_media").insert({
        review_id: reviewId,
        media_type: mediaType,
        storage_path: fileName,
        file_size_bytes: file.size,
      });
    }
  };

  const onSubmit = async (data: ReviewFormData) => {
    // Honeypot check
    if (data.honeypot) {
      toast.error("Submission failed. Please try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert review
      const { data: review, error } = await supabase
        .from("product_reviews")
        .insert({
          product_handle: productHandle,
          variant_title: variantTitle || null,
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          rating: data.rating,
          title: data.title || null,
          body: data.body,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;

      // Upload media if any
      if (mediaFiles.length > 0 && review) {
        await uploadMedia(review.id);
      }

      setIsSuccess(true);
    } catch (error) {
      console.error("Review submission error:", error);
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Cleanup
      mediaPreviews.forEach((url) => URL.revokeObjectURL(url));
      setMediaFiles([]);
      setMediaPreviews([]);
      setSelectedRating(0);
      setIsSuccess(false);
      form.reset();
      onOpenChange(false);
    }
  };

  const isVideo = (file: File) => file.type.startsWith("video/");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {isSuccess ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
            <p className="text-muted-foreground mb-6">
              Your review has been submitted and is pending approval. We'll notify you once it's published.
            </p>
            <Button onClick={handleClose}>Close</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Write a Review</DialogTitle>
              <DialogDescription>
                Share your experience with this product
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* Honeypot field - hidden from users */}
                <input
                  type="text"
                  {...form.register("honeypot")}
                  className="hidden"
                  tabIndex={-1}
                  autoComplete="off"
                />

                {/* Star Rating */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Rating *</label>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => {
                          setSelectedRating(star);
                          form.setValue("rating", star);
                        }}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= (hoverRating || selectedRating)
                              ? "fill-[hsl(var(--star))] text-[hsl(var(--star))]"
                              : "fill-muted text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {form.formState.errors.rating && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.rating.message}
                    </p>
                  )}
                </div>

                {/* Name */}
                <FormField
                  control={form.control}
                  name="customer_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Your name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email */}
                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email *</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Review Title</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Sum up your experience"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Body */}
                <FormField
                  control={form.control}
                  name="body"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Review *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell us about your experience with this product..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Media Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Add Photos or Videos (optional)
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Up to 3 files. Max 50MB each.
                  </p>

                  {/* Preview Grid */}
                  {mediaPreviews.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {mediaPreviews.map((preview, index) => (
                        <div
                          key={index}
                          className="relative w-20 h-20 rounded-lg overflow-hidden border"
                        >
                          {isVideo(mediaFiles[index]) ? (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Video className="w-8 h-8 text-muted-foreground" />
                            </div>
                          ) : (
                            <img
                              src={preview}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => removeMedia(index)}
                            className="absolute top-1 right-1 p-0.5 bg-destructive text-destructive-foreground rounded-full"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload Button */}
                  {mediaFiles.length < 3 && (
                    <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload
                      </span>
                      <input
                        type="file"
                        accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(",")}
                        onChange={handleFileSelect}
                        className="hidden"
                        multiple
                      />
                    </label>
                  )}
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Review"
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Your review will be visible after approval by our team.
                </p>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
