import { Play } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export const KneePillowVideoSection = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  
  const videos = [
    {
      id: 1,
      src: "/videos/knee-video-1.mp4",
      title: "Perfect leg alignment",
      views: "1.9M"
    },
    {
      id: 2,
      src: "/videos/knee-video-2.mp4",
      title: "Hip support explained",
      views: "1.5M"
    },
    {
      id: 3,
      src: "/videos/knee-video-3.mp4",
      title: "Wake up pain-free",
      views: "2.3M"
    },
    {
      id: 4,
      src: "/videos/knee-video-4.mp4",
      title: "Real customer results",
      views: "1.8M"
    }
  ];

  return (
    <>
      <section className="py-6 md:py-8 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">See It In Action</h2>
            <p className="text-base md:text-xl text-muted-foreground">
              Watch real customers experience the Rise By Night difference
            </p>
          </div>

          <Carousel 
            className="w-full max-w-5xl mx-auto"
            opts={{
              align: "start",
              loop: true,
            }}
          >
            <CarouselContent className="-ml-2 md:-ml-4">
              {videos.map((video) => (
                <CarouselItem key={video.id} className="pl-2 md:pl-4 basis-full md:basis-1/3">
                  <div 
                    className="relative group cursor-pointer overflow-hidden rounded-xl"
                    onClick={() => video.src && setSelectedVideo(video.src)}
                  >
                    <div className="aspect-[9/16] relative bg-muted">
                      <video 
                        src={video.src}
                        className="w-full h-full object-cover"
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                        }}
                        onLoadedMetadata={(e) => {
                          // Ensure first frame is visible
                          e.currentTarget.currentTime = 0.1;
                        }}
                        onCanPlay={(e) => {
                          // Fallback to ensure first frame shows
                          if (e.currentTarget.currentTime === 0) {
                            e.currentTarget.currentTime = 0.1;
                          }
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-primary/10 group-hover:bg-transparent transition-colors">
                        <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Play className="w-8 h-8 text-white ml-1" fill="white" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white font-semibold">{video.title}</p>
                        <p className="text-white/80 text-sm">{video.views} views</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>

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
