// Performance: Videos use preload="none" and intersection observer for deferred loading
import { Play, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useInView } from "@/hooks/useInView";

interface VideoCardProps {
  video: {
    id: number;
    src: string;
    poster: string;
    title: string;
    views: string;
  };
  onVideoClick: (src: string) => void;
}

const VideoCard = ({ video, onVideoClick }: VideoCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref: containerRef, isInView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  const [isBuffering, setIsBuffering] = useState(false);

  // Pause and reset video when out of view
  useEffect(() => {
    if (!isInView && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsBuffering(false);
    }
  }, [isInView]);

  const handleMouseEnter = () => {
    if (isInView && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play();
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsBuffering(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative group cursor-pointer overflow-hidden rounded-xl"
      onClick={() => onVideoClick(video.src)}
    >
      <div 
        className="aspect-[9/16] relative bg-muted"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {isInView ? (
          <video 
            ref={videoRef}
            src={video.src}
            poster={video.poster}
            className="w-full h-full object-cover"
            loop
            muted
            playsInline
            preload="none"
            width={360}
            height={640}
            onLoadStart={() => setIsBuffering(true)}
            onWaiting={() => setIsBuffering(true)}
            onCanPlay={() => setIsBuffering(false)}
            onPlaying={() => setIsBuffering(false)}
            onLoadedData={() => setIsBuffering(false)}
          />
        ) : (
          <img
            src={video.poster}
            alt={video.title}
            loading="lazy"
            decoding="async"
            width={360}
            height={640}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
          <div className="w-14 h-14 rounded-full bg-white/90 shadow-lg shadow-black/40 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
          </div>
        </div>
        {/* Buffering spinner */}
        {isBuffering && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white font-semibold">{video.title}</p>
          <p className="text-white/80 text-sm">{video.views} views</p>
        </div>
      </div>
    </div>
  );
};

const VideoSkeleton = () => (
  <div className="w-full max-w-5xl mx-auto grid gap-4 md:grid-cols-3">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex flex-col gap-3">
        <div className="aspect-[9/16] w-full rounded-xl bg-muted animate-pulse" />
      </div>
    ))}
  </div>
);

export const VideoSection = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [isModalBuffering, setIsModalBuffering] = useState(false);
  const { ref: sectionRef, isInView: sectionInView } = useInView<HTMLElement>({ threshold: 0.1 });
  
  const videos = [
    {
      id: 1,
      src: "/videos/video_1.mp4",
      poster: "/videos/thumbnails/video_1.webp",
      title: "See the difference",
      views: "2.3M"
    },
    {
      id: 2,
      src: "/videos/video_2.mp4",
      poster: "/videos/thumbnails/video_2.webp",
      title: "Perfect support",
      views: "1.8M"
    },
    {
      id: 3,
      src: "/videos/video_3.mp4",
      poster: "/videos/thumbnails/video_3.webp",
      title: "Wake up refreshed",
      views: "3.1M"
    },
    {
      id: 4,
      src: "/videos/video_4.mp4",
      poster: "/videos/thumbnails/video_4.webp",
      title: "Real customer results",
      views: "2.7M"
    },
    {
      id: 5,
      src: "/videos/video_5.mp4",
      poster: "/videos/thumbnails/video_5.webp",
      title: "Customer experience",
      views: "1.9M"
    }
  ];

  return (
    <>
      <section ref={sectionRef} className="py-6 md:py-8 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">See It In Action</h2>
            <p className="text-base md:text-xl text-muted-foreground">
              Watch real customers experience the Rise By Night difference
            </p>
          </div>

          {sectionInView ? (
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
                    <VideoCard video={video} onVideoClick={setSelectedVideo} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          ) : (
            <VideoSkeleton />
          )}

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
            <div className="relative">
              <video 
                src={selectedVideo}
                className="w-full aspect-[9/16] max-h-[80vh]"
                controls
                autoPlay
                playsInline
                preload="auto"
                width={720}
                height={1280}
                onLoadStart={() => setIsModalBuffering(true)}
                onWaiting={() => setIsModalBuffering(true)}
                onCanPlay={() => setIsModalBuffering(false)}
                onPlaying={() => setIsModalBuffering(false)}
                onLoadedData={() => setIsModalBuffering(false)}
              />
              {isModalBuffering && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="h-10 w-10 animate-spin text-white" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
