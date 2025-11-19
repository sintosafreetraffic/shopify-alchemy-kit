import { Play } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export const VideoSection = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  
  const videos = [
    {
      id: 1,
      src: "/videos/video_1.mp4",
      title: "See the difference",
      views: "2.3M"
    },
    {
      id: 2,
      src: "/videos/video_2.mp4",
      title: "Perfect support",
      views: "1.8M"
    },
    {
      id: 3,
      thumbnail: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=400&h=600&fit=crop",
      title: "Wake up refreshed",
      views: "3.1M"
    }
  ];

  return (
    <>
      <section className="py-8 px-4 bg-secondary/10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">See It In Action</h2>
            <p className="text-xl text-muted-foreground">
              Watch real customers experience the RiseByNight difference
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div 
                key={video.id} 
                className="relative group cursor-pointer overflow-hidden rounded-xl"
                onClick={() => video.src && setSelectedVideo(video.src)}
              >
                <div className="aspect-[9/16] relative">
                  {video.src ? (
                    <video 
                      src={video.src}
                      className="w-full h-full object-cover"
                      loop
                      muted
                      playsInline
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />
                  ) : (
                    <>
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 text-primary ml-1" />
                        </div>
                      </div>
                    </>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <p className="text-white font-semibold">{video.title}</p>
                    <p className="text-white/80 text-sm">{video.views} views</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              Join over 50,000+ happy customers who transformed their sleep
            </p>
          </div>
        </div>
      </section>

      <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
        <DialogContent className="max-w-2xl p-0 bg-black">
          {selectedVideo && (
            <video 
              src={selectedVideo}
              className="w-full aspect-[9/16] max-h-[80vh]"
              controls
              autoPlay
              playsInline
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
