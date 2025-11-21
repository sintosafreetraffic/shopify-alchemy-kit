import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

export const SleepMaskVideoSection = () => {
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  
  const videos = [
    {
      id: 1,
      src: "/videos/video_1.mp4",
      title: "Complete darkness",
      views: "2.1M"
    },
    {
      id: 2,
      src: "/videos/video_2.mp4",
      title: "Perfect fit demo",
      views: "1.7M"
    },
    {
      id: 3,
      src: "/videos/video_3.mp4",
      title: "Wake up refreshed",
      views: "2.5M"
    },
    {
      id: 4,
      src: "/videos/video_4.mp4",
      title: "Real customer reviews",
      views: "1.9M"
    },
    {
      id: 5,
      src: "/videos/video_5.mp4",
      title: "Travel essential",
      views: "1.4M"
    }
  ];

  return (
    <>
      <section className="py-6 md:py-8 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-6 md:mb-12">
            <h2 className="text-2xl md:text-4xl font-bold mb-2 md:mb-4">See It In Action</h2>
            <p className="text-base md:text-xl text-muted-foreground">
              Watch real customers experience the RiseByNight difference
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
                    <div className="aspect-[9/16] relative">
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
                      />
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
