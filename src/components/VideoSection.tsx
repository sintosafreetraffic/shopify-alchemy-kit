// Performance: Videos use preload="none" and intersection observer for deferred loading
// Mobile: Video section hidden entirely to prevent scroll glitches
import { Play, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useInView } from "@/hooks/useInView";
import { useIsTouchDevice } from "@/hooks/useIsTouchDevice";
import { cn } from "@/lib/utils";

interface VideoItem {
  id: number;
  src: string;
  poster: string;
  title: string;
  views: string;
}

interface VideoCardProps {
  video: VideoItem;
  onVideoClick: (src: string) => void;
}

const VideoCard = ({ video, onVideoClick }: VideoCardProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { ref: containerRef, isInView } = useInView<HTMLDivElement>({ threshold: 0.3 });
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const isTouch = useIsTouchDevice();

  // Pause and reset video when out of view
  useEffect(() => {
    if (!isInView && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsBuffering(false);
      setHasStarted(false);
    }
  }, [isInView]);

  const handleMouseEnter = () => {
    // Only use hover on non-touch devices
    if (!isTouch && isInView && videoRef.current) {
      videoRef.current.load();
      videoRef.current.play().catch(() => {
        // Ignore AbortError when video is removed from DOM during play
      });
    }
  };

  const handleMouseLeave = () => {
    // Only use hover on non-touch devices
    if (!isTouch && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsBuffering(false);
      setHasStarted(false);
    }
  };

  const handleClick = () => {
    // Always open modal on click - no preview behavior
    onVideoClick(video.src);
  };

  return (
    <div 
      ref={containerRef}
      className="relative group cursor-pointer overflow-hidden rounded-xl"
      onClick={handleClick}
    >
      <div 
        className="aspect-[9/16] relative bg-muted"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* On touch devices: always show static poster. On desktop: use video preview */}
        {isTouch ? (
          <img
            src={video.poster}
            alt={video.title}
            loading="lazy"
            decoding="async"
            width={360}
            height={640}
            className="w-full h-full object-cover"
          />
        ) : isInView ? (
          <>
            <video 
              ref={videoRef}
              src={video.src}
              poster={video.poster}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-300",
                hasStarted ? "opacity-100" : "opacity-0"
              )}
              loop
              muted
              playsInline
              preload="none"
              width={360}
              height={640}
              onLoadStart={() => setIsBuffering(true)}
              onWaiting={() => setIsBuffering(true)}
              onCanPlay={() => setIsBuffering(false)}
              onPlaying={() => {
                setIsBuffering(false);
                setHasStarted(true);
              }}
              onLoadedData={() => setIsBuffering(false)}
            />
            {/* Poster shown until video starts playing */}
            {!hasStarted && (
              <img
                src={video.poster}
                alt={video.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </>
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
          <div className="w-14 h-14 rounded-full bg-white/90 shadow-lg shadow-black/40 flex items-center justify-center group-hover:scale-105 transition-transform" aria-hidden="true">
            <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
          </div>
          <span className="sr-only">Play {video.title} video</span>
        </div>
        {/* Buffering spinner - only on desktop */}
        {!isTouch && isBuffering && (
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
  const [modalHasStarted, setModalHasStarted] = useState(false);
  const { ref: sectionRef, isInView: sectionInView } = useInView<HTMLElement>({ threshold: 0.1 });
  const isTouch = useIsTouchDevice();
  
  // Reset modal state when closing
  useEffect(() => {
    if (!selectedVideo) {
      setIsModalBuffering(false);
      setModalHasStarted(false);
    }
  }, [selectedVideo]);

  // Hide entire video section on mobile to prevent scroll glitches
  if (isTouch) {
    return null;
  }

  const videos: VideoItem[] = [
    {
      id: 1,
      src: "/videos/video_1.mp4",
      poster: "/videos/thumbnails/video_3_thumb.webp",
      title: "See the difference",
      views: "2.3M"
    },
    {
      id: 2,
      src: "/videos/video_2.mp4",
      poster: "/videos/thumbnails/video_2_thumb.webp",
      title: "Perfect support",
      views: "1.8M"
    },
    {
      id: 3,
      src: "/videos/video_3.mp4",
      poster: "/videos/thumbnails/video_3_wake.webp",
      title: "Wake up refreshed",
      views: "3.1M"
    },
    {
      id: 4,
      src: "/videos/video_4.mp4",
      poster: "/videos/thumbnails/video_4_thumb.webp",
      title: "Real customer results",
      views: "2.7M"
    },
    {
      id: 5,
      src: "/videos/video_5.mp4",
      poster: "/videos/thumbnails/video_5_thumb.webp",
      title: "Customer experience",
      views: "1.9M"
    }
  ];

  return (
    <>
      <section ref={sectionRef} className="py-4 md:py-6 lg:py-8 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-4 md:mb-6">
            <h2 className="text-lg md:text-2xl lg:text-3xl font-bold mb-1">See It In Action</h2>
            <p className="text-sm md:text-base text-muted-foreground">
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

          <div className="text-center mt-4 md:mt-6">
            <p className="text-xs md:text-sm text-muted-foreground">
              Join the many happy customers who transformed their sleep
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
                className={cn(
                  "w-full aspect-[9/16] max-h-[80vh] transition-opacity duration-300",
                  modalHasStarted ? "opacity-100" : "opacity-0"
                )}
                controls
                autoPlay
                playsInline
                preload="auto"
                width={720}
                height={1280}
                onLoadStart={() => setIsModalBuffering(true)}
                onWaiting={() => setIsModalBuffering(true)}
                onCanPlay={() => setIsModalBuffering(false)}
                onPlaying={() => {
                  setIsModalBuffering(false);
                  setModalHasStarted(true);
                }}
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
