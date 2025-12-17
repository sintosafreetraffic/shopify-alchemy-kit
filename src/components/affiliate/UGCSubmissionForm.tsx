import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

interface UGCSubmissionFormProps {
  onSuccess?: () => void;
}

const contentTypes = [
  { value: "instagram_post", label: "Instagram Post" },
  { value: "instagram_reel", label: "Instagram Reel" },
  { value: "tiktok", label: "TikTok Video" },
  { value: "youtube", label: "YouTube Video" },
  { value: "blog", label: "Blog Post" },
  { value: "review", label: "Written Review" },
  { value: "other", label: "Other" },
];

export function UGCSubmissionForm({ onSuccess }: UGCSubmissionFormProps) {
  const [contentUrl, setContentUrl] = useState("");
  const [contentType, setContentType] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contentUrl.trim()) {
      toast.error("Please enter a content URL");
      return;
    }

    if (!contentType) {
      toast.error("Please select a content type");
      return;
    }

    const urlRegex = /^https?:\/\/.+/i;
    if (!urlRegex.test(contentUrl.trim())) {
      toast.error("Please enter a valid URL starting with http:// or https://");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("ugc-submit", {
        body: {
          content_url: contentUrl.trim(),
          content_type: contentType,
          description: description.trim() || undefined,
        },
      });

      if (error) throw error;

      toast.success("Content submitted successfully");
      setContentUrl("");
      setContentType("");
      setDescription("");
      onSuccess?.();
    } catch (error) {
      console.error("UGC submission error:", error);
      toast.error("Failed to submit content. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <Upload className="h-5 w-5 text-muted-foreground" />
          Submit Your Content
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Share content featuring Rise By Night products
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contentUrl" className="text-foreground/90">
              Content URL
            </Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="contentUrl"
                placeholder="https://instagram.com/p/..."
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                className="pl-10 bg-muted/30 border-border/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contentType" className="text-foreground/90">
              Content Type
            </Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger className="bg-muted/30 border-border/50">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-foreground/90">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              placeholder="Brief description of your content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-muted/30 border-border/50 min-h-[80px] resize-none"
              maxLength={1000}
            />
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Content"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
