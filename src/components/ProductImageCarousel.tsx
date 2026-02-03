// Performance: All images use WebP format for better compression
// Product demo video uses image-first poster with click-to-play
import { useState, useEffect, useRef } from "react";
// All images are already WebP format for optimal performance
import pillowHeroNew from "@/assets/ergonomic-pillow-hero.webp";
import pillowBundleNew from "@/assets/pillow-male-mask-new.webp";
import pillowDeeperSleep from "@/assets/pillow-deeper-sleep.webp";
import pillowMaleModel from "@/assets/ergonomic-pillow-male-model.png";
import pillowCoverMask from "@/assets/ergonomic-pillow-cover-mask.webp";
import pillowTrusted from "@/assets/ergonomic-pillow-trusted.webp";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ImageModal } from "./ImageModal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Play } from "lucide-react";
import { useInView } from "@/hooks/useInView";

// Video poster component with click-to-play behavior
interface VideoPosterProps {
  videoSrc: string;
  alt: string;
  posterSrc: string;
  width: number;
  height: number;
  onPlayClick: () => void;
  className?: string;
}

const VideoPoster = ({ posterSrc, alt, width, height, onPlayClick, className = "" }: VideoPosterProps) => {
  return (
    <div 
      className={`relative w-full h-full cursor-pointer group ${className}`}
      onClick={onPlayClick}
    >
      <img
        src={posterSrc}
        alt={alt}
        className="w-full h-full object-cover"
        loading="lazy"
        decoding="async"
        width={width}
        height={height}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
        <div className="w-16 h-16 rounded-full bg-black/60 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play className="w-8 h-8 text-white ml-1" fill="white" />
        </div>
      </div>
    </div>
  );
};

export const ProductImageCarousel = () => {
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [desktopApi, setDesktopApi] = useState<CarouselApi>();
  const [mobileCurrent, setMobileCurrent] = useState(0);
  const [desktopCurrent, setDesktopCurrent] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoSrc, setSelectedVideoSrc] = useState<string | null>(null);

  // Multiple views of the Rise By Night pillow (desktop order)
  const images = [
    { url: pillowHeroNew, alt: "Rise By Night ergonomic pillow main view", type: "image" },
    { url: pillowDeeperSleep, alt: "Rise By Night pillow - engineered for deeper sleep with reduced neck and shoulder pressure", type: "image" },
    { url: pillowTrusted, alt: "Rise By Night pillow - trusted by 100,000+ sleepers with customer reviews", type: "image" },
    { url: pillowCoverMask, alt: "Rise By Night pillow - removable cover and silk sleep mask", type: "image" },
    { url: pillowMaleModel, alt: "Rise By Night pillow - male model sleeping with ergonomic support", type: "image" },
    { url: pillowBundleNew, alt: "Rise By Night pillow bundle with mulberry silk sleep mask and extra pillow cover", type: "image" },
  ];

  // Get only image URLs (excluding videos) for the modal navigation
  const imageOnlyUrls = images.filter(img => img.type === "image").map(img => img.url);

  // Mobile order - same product images as desktop, excluding pillowMaleMask (image 7)
  const mobileImages = [
    images[0], // pillowHeroNew
    images[1], // pillowDeeperSleep
    images[2], // pillowTrusted
    images[3], // pillowCoverMask
    images[4], // pillowMaleModel
    images[5], // pillowBundleNew
  ];
  
  // Get only image URLs for mobile (excluding videos) for the modal navigation
  const mobileImageOnlyUrls = mobileImages.filter(img => img.type === "image").map(img => img.url);

  const openImageModal = (url: string, isMobile: boolean) => {
    const urlList = isMobile ? mobileImageOnlyUrls : imageOnlyUrls;
    const index = urlList.indexOf(url);
    if (index !== -1) {
      setExpandedImageIndex(index);
    }
  };

  const handleVideoClick = (videoSrc: string) => {
    setSelectedVideoSrc(videoSrc);
    setVideoModalOpen(true);
  };

  // Track mobile carousel position
  useEffect(() => {
    if (!mobileApi) return;

    setMobileCurrent(mobileApi.selectedScrollSnap());

    mobileApi.on("select", () => {
      setMobileCurrent(mobileApi.selectedScrollSnap());
    });
  }, [mobileApi]);

  // Track desktop carousel position
  useEffect(() => {
    if (!desktopApi) return;

    setDesktopCurrent(desktopApi.selectedScrollSnap());

    desktopApi.on("select", () => {
      setDesktopCurrent(desktopApi.selectedScrollSnap());
    });
  }, [desktopApi]);
  return (
    <>
      {/* Mobile Carousel - full width edge-to-edge with matching background */}
      <div className="md:hidden w-screen relative left-1/2 -translate-x-1/2">
        <Carousel className="w-full" setApi={setMobileApi}>
          <CarouselContent className="ml-0">
            {mobileImages.map((item, index) => (
              <CarouselItem key={index} className="pl-0">
                {/* Full-width container with background matching product images */}
                <div 
                  className="overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity aspect-square bg-[#f5f5f7]"
                  onClick={() => item.type === "image" && openImageModal(item.url, true)}
                >
                  {item.type === "video" ? (
                    <VideoPoster
                      videoSrc={item.url}
                      alt={item.alt}
                      posterSrc={(item as any).poster || pillowHeroNew}
                      width={800}
                      height={800}
                      onPlayClick={() => handleVideoClick(item.url)}
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.alt}
                      className="w-full h-full object-contain"
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "low"}
                      decoding="async"
                      width={800}
                      height={800}
                    />
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            variant="ghost"
            className="left-2 !bg-transparent hover:!bg-transparent !border-0 !shadow-none"
          />
          <CarouselNext
            variant="ghost"
            className="right-2 !bg-transparent hover:!bg-transparent !border-0 !shadow-none"
          />
        </Carousel>
        
        {/* Carousel Thumbnail Indicators - fixed height to prevent CLS */}
        <div className="flex justify-center gap-2 mt-3 px-4 h-14">
          {mobileImages.map((item, index) => (
            <button
              key={index}
              onClick={() => mobileApi?.scrollTo(index)}
              className={`relative w-12 h-12 rounded-lg overflow-hidden transition-all ${
                mobileCurrent === index 
                  ? 'ring-2 ring-primary ring-offset-1' 
                  : 'opacity-60 hover:opacity-100'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            >
              {item.type === "video" ? (
                <>
                  <img
                    src={(item as any).poster || pillowHeroNew}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={48}
                    height={48}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-4 h-4 border-l-[6px] border-l-white border-y-[4px] border-y-transparent ml-0.5" />
                  </div>
                </>
              ) : (
                <img
                  src={item.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={48}
                  height={48}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Carousel - aspect-[4/3] container prevents CLS */}
      <div className="hidden md:block">
        <Carousel className="w-full" setApi={setDesktopApi}>
          <CarouselContent className="-ml-0">
            {images.map((item, index) => (
              <CarouselItem key={index} className="pl-0">
                {/* Fixed aspect ratio container prevents CLS on image load */}
                <div 
                  className="overflow-hidden rounded-xl relative cursor-pointer hover:opacity-90 transition-opacity aspect-[4/3] bg-muted/10"
                  onClick={() => item.type === "image" && openImageModal(item.url, false)}
                >
                  {item.type === "video" ? (
                    <VideoPoster
                      videoSrc={item.url}
                      alt={item.alt}
                      posterSrc={(item as any).poster || pillowHeroNew}
                      width={1200}
                      height={900}
                      onPlayClick={() => handleVideoClick(item.url)}
                      className="rounded-xl"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.alt}
                      className="w-full h-full object-contain rounded-xl"
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "low"}
                      decoding="async"
                      width={1200}
                      height={900}
                    />
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            variant="ghost"
            className="left-4 md:left-4 !bg-transparent hover:!bg-transparent !border-0 !shadow-none"
          />
          <CarouselNext
            variant="ghost"
            className="right-4 md:right-4 !bg-transparent hover:!bg-transparent !border-0 !shadow-none"
          />
        </Carousel>
        
        {/* Desktop Thumbnail Indicators - fixed height to prevent CLS */}
        <div className="flex gap-2 mt-4 max-w-full overflow-x-auto scrollbar-hide justify-start lg:justify-center px-3 py-1 h-[72px]">
          {images.map((item, index) => (
            <button
              key={index}
              onClick={() => desktopApi?.scrollTo(index)}
              className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all ${
                desktopCurrent === index 
                  ? 'ring-2 ring-primary ring-offset-2' 
                  : 'opacity-60 hover:opacity-100'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            >
              {item.type === "video" ? (
                <>
                  <img
                    src={(item as any).poster || pillowHeroNew}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={64}
                    height={64}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-5 h-5 border-l-[8px] border-l-white border-y-[5px] border-y-transparent ml-0.5" />
                  </div>
                </>
              ) : (
                <img
                  src={item.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={64}
                  height={64}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      <ImageModal 
        imageUrl={expandedImageIndex !== null ? imageOnlyUrls[expandedImageIndex] : null} 
        onClose={() => setExpandedImageIndex(null)}
        images={imageOnlyUrls}
        currentIndex={expandedImageIndex ?? 0}
        onNavigate={setExpandedImageIndex}
      />

      {/* Video Modal */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="max-w-3xl p-0 bg-black">
          {selectedVideoSrc && (
            <video 
              src={selectedVideoSrc}
              className="w-full aspect-video"
              controls
              autoPlay
              playsInline
              muted
              preload="auto"
              width={1280}
              height={720}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
