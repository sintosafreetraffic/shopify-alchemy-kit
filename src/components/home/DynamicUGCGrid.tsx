/**
 * Dynamic UGC Grid Component
 * 
 * Displays approved partner UGC submissions dynamically from the database
 * Falls back to static testimonials when no approved UGC is available
 * 
 * This addresses the audit finding: "Static UGC grid signals low activity → hurts trust"
 */

import { useState, useEffect } from "react";
import { User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ApprovedUGC {
  id: string;
  content_url: string;
  content_type: string;
  description: string | null;
  created_at: string;
  affiliates: {
    referral_code: string;
  };
}

// Fallback static testimonials (used when no approved UGC)
const staticTestimonials = [
  {
    id: "1",
    name: "Sarah M.",
    label: "Desk Worker",
    testimonial: "Finally wake up without that familiar neck tension. My mornings feel lighter now.",
    hashtag: "#SleepAligned",
  },
  {
    id: "2",
    name: "Marcus L.",
    label: "Side Sleeper",
    testimonial: "Switching positions used to wake me up. Now I sleep through the night.",
    hashtag: "#CalmNights",
  },
  {
    id: "3",
    name: "Emma R.",
    label: "Stressed Sleeper",
    testimonial: "The quality of my rest has genuinely improved. I feel more present during the day.",
    hashtag: "#MyRiseByNight",
  },
  {
    id: "4",
    name: "James K.",
    label: "Athlete",
    testimonial: "Recovery starts with sleep. This pillow supports my training routine.",
    hashtag: "#SleepAligned",
  },
  {
    id: "5",
    name: "Lisa T.",
    label: "Remote Worker",
    testimonial: "No more waking up stiff. My posture has improved both day and night.",
    hashtag: "#CalmNights",
  },
  {
    id: "6",
    name: "David P.",
    label: "Parent",
    testimonial: "The little sleep I get now actually feels restorative. That matters.",
    hashtag: "#MyRiseByNight",
  },
];

// Soft Scandinavian color palette
const avatarColors = [
  "from-slate-100 to-slate-50",
  "from-stone-100 to-stone-50",
  "from-zinc-100 to-zinc-50",
  "from-neutral-100 to-neutral-50",
  "from-gray-100 to-gray-50",
  "from-slate-50 to-gray-50",
  "from-stone-50 to-neutral-50",
  "from-zinc-50 to-slate-50",
];

function getContentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    instagram_post: "Instagram",
    instagram_reel: "Instagram Reel",
    tiktok: "TikTok",
    youtube: "YouTube",
    blog: "Blog",
    review: "Review",
    other: "Content Creator",
  };
  return labels[type] || "Creator";
}

export function DynamicUGCGrid() {
  const [approvedUGC, setApprovedUGC] = useState<ApprovedUGC[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApprovedUGC();
  }, []);

  const loadApprovedUGC = async () => {
    try {
      const { data, error } = await supabase
        .from("partner_ugc_submissions")
        .select(`
          id,
          content_url,
          content_type,
          description,
          created_at,
          affiliates (
            referral_code
          )
        `)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) throw error;
      setApprovedUGC((data as unknown as ApprovedUGC[]) || []);
    } catch (error) {
      console.error("Error loading UGC:", error);
    } finally {
      setLoading(false);
    }
  };

  // Determine what to show: approved UGC, static testimonials, or a mix
  const hasApprovedUGC = approvedUGC.length > 0;
  const displayItems = hasApprovedUGC
    ? approvedUGC.map((ugc, index) => ({
        id: ugc.id,
        name: `Partner #${ugc.affiliates?.referral_code?.slice(-4) || index + 1}`,
        label: getContentTypeLabel(ugc.content_type),
        testimonial: ugc.description || "Loving my Rise By Night pillow! 🌙",
        hashtag: "#MyRiseByNight",
        isLive: true,
        contentUrl: ugc.content_url,
      }))
    : staticTestimonials.map((t) => ({ ...t, isLive: false, contentUrl: undefined }));

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-light tracking-tight mb-4">
            Loved by Real Sleepers
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {hasApprovedUGC
              ? "Content from our partner community — real stories from real people."
              : "Real stories from real sleepers who transformed their nights."}
          </p>
          {hasApprovedUGC && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live Partner Content
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {displayItems.map((item, index) => {
            const colorClass = avatarColors[index % avatarColors.length];
            return (
              <div
                key={item.id}
                className="group relative bg-card rounded-2xl p-6 border border-border/50 hover:border-border hover:shadow-lg transition-all duration-300"
              >
                {/* Live indicator for approved UGC */}
                {item.isLive && (
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Live
                    </span>
                  </div>
                )}

                {/* Avatar */}
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-11 h-11 md:w-12 md:h-12 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center ring-2 ring-background shadow-sm`}
                  >
                    <User className="h-5 w-5 text-muted-foreground/60" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                </div>

                {/* Testimonial */}
                <p className="text-sm text-foreground/80 leading-relaxed mb-4">
                  "{item.testimonial}"
                </p>

                {/* Hashtag */}
                <span className="text-xs text-primary/70 font-medium">{item.hashtag}</span>

                {/* Link to content if available */}
                {item.contentUrl && (
                  <a
                    href={item.contentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute inset-0 z-10"
                    aria-label={`View ${item.name}'s content`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* CTA for partners */}
        {hasApprovedUGC && (
          <div className="text-center mt-10">
            <p className="text-sm text-muted-foreground">
              Want to be featured?{" "}
              <a href="/partner-program" className="text-primary underline hover:no-underline">
                Join our partner program
              </a>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
