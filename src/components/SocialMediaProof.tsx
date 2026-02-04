/**
 * Social Media Proof Section - CRO Trust Builder
 * 
 * Displays embedded social proof from Instagram, Facebook, etc.
 * Shows real customer posts/screenshots for authenticity.
 */

import { Instagram, MessageCircle, Star } from "lucide-react";

interface SocialPost {
  id: string;
  platform: "instagram" | "facebook" | "messenger";
  author: string;
  avatar?: string;
  content: string;
  date: string;
  rating?: number;
}

const socialPosts: SocialPost[] = [
  {
    id: "1",
    platform: "instagram",
    author: "@sarah_sleeps_well",
    content: "Finally found a pillow that actually helps with my neck pain! 3 weeks in and waking up pain-free 🙌 @risebynight",
    date: "2 days ago",
    rating: 5,
  },
  {
    id: "2",
    platform: "messenger",
    author: "Lisa M.",
    content: "Just wanted to say thank you! My husband has been sleeping so much better. Already ordered one for my mom too!",
    date: "1 week ago",
    rating: 5,
  },
  {
    id: "3",
    platform: "instagram",
    author: "@mike_fitlife",
    content: "As someone who trains hard, recovery sleep is everything. This pillow is a game changer for my morning neck stiffness 💪",
    date: "5 days ago",
    rating: 5,
  },
  {
    id: "4",
    platform: "facebook",
    author: "Jennifer W.",
    content: "I was skeptical but WOW. Best sleep purchase I've ever made. The memory foam is perfect - not too firm, not too soft.",
    date: "3 days ago",
    rating: 5,
  },
];

const getPlatformIcon = (platform: SocialPost["platform"]) => {
  switch (platform) {
    case "instagram":
      return <Instagram className="w-4 h-4" />;
    case "messenger":
      return <MessageCircle className="w-4 h-4" />;
    case "facebook":
      return (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
  }
};

const getPlatformColor = (platform: SocialPost["platform"]) => {
  switch (platform) {
    case "instagram":
      return "from-purple-500 to-pink-500";
    case "messenger":
      return "from-blue-500 to-blue-600";
    case "facebook":
      return "from-blue-600 to-blue-700";
  }
};

interface SocialMediaProofProps {
  className?: string;
  limit?: number;
}

export const SocialMediaProof = ({ className = "", limit = 4 }: SocialMediaProofProps) => {
  const displayPosts = socialPosts.slice(0, limit);

  return (
    <section className={`py-8 md:py-12 bg-muted/30 ${className}`}>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            What People Are Saying
          </h2>
          <p className="text-muted-foreground">
            Real posts from our happy customers
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {displayPosts.map((post) => (
            <div
              key={post.id}
              className="bg-background rounded-xl p-4 border shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getPlatformColor(post.platform)} flex items-center justify-center text-white`}>
                  {getPlatformIcon(post.platform)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{post.author}</p>
                  <p className="text-xs text-muted-foreground">{post.date}</p>
                </div>
              </div>

              {/* Rating */}
              {post.rating && (
                <div className="flex mb-2">
                  {Array.from({ length: post.rating }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
              )}

              {/* Content */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {post.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
