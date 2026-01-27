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
import pillowMaleMask from "@/assets/ergonomic-pillow-male-mask.webp";
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
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
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
    { url: pillowMaleMask, alt: "Rise By Night pillow - male model sleeping with silk sleep mask", type: "image" },
  ];

  // Get only image URLs (excluding videos) for the modal navigation
  const imageOnlyUrls = images.filter(img => img.type === "image").map(img => img.url);

  // Mobile order - same product images as desktop, reordered
  const mobileImages = [
    images[0], // pillowHeroNew
    images[1], // pillowDeeperSleep
    images[2], // pillowTrusted
    images[3], // pillowCoverMask
    images[4], // pillowMaleModel
    images[5], // pillowBundleNew
    images[6], // pillowMaleMask
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

  // Track carousel position
  useEffect(() => {
    if (!api) return;

    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  return (
    <>
      {/* Mobile Carousel */}
      <div className="md:hidden -mx-4">
        <Carousel className="w-full" setApi={setApi}>
          <CarouselContent className="-ml-0">
            {mobileImages.map((item, index) => (
              <CarouselItem key={index} className="pl-0">
                <div 
                  className="overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity"
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
                      className="w-full h-auto object-cover"
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "low"}
                      decoding="async"
                      width="800"
                      height="800"
                    />
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
        
        {/* Carousel Thumbnail Indicators */}
        <div className="flex justify-center gap-2 mt-3 px-4">
          {mobileImages.map((item, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`relative w-12 h-12 rounded-lg overflow-hidden transition-all ${
                current === index 
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

      {/* Desktop Static Gallery */}
      <div className="hidden md:block">
        {/* First large image */}
        <div className="overflow-hidden rounded-xl relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => images[0]?.type === "image" && openImageModal(images[0].url, false)}>
          <img
            src={images[0]?.url}
            alt={images[0]?.alt}
            className="w-full h-full object-cover rounded-xl"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width="1200"
            height="900"
          />
        </div>

        {/* Two images side by side */}
        <div className="grid grid-cols-2 gap-0">
          <div className="overflow-hidden rounded-xl aspect-square cursor-pointer hover:opacity-90 transition-opacity">
            {images[1]?.type === "video" ? (
              <VideoPoster
                videoSrc={images[1].url}
                alt={images[1].alt}
                posterSrc={(images[1] as any).poster || pillowHeroNew}
                width={600}
                height={600}
                onPlayClick={() => handleVideoClick(images[1].url)}
                className="rounded-xl"
              />
            ) : (
              <img
                src={images[1]?.url}
                alt={images[1]?.alt}
                className="w-full h-full object-cover rounded-xl"
                loading="lazy"
                decoding="async"
                width="600"
                height="600"
                onClick={() => openImageModal(images[1].url, false)}
              />
            )}
          </div>
          <div className="overflow-hidden rounded-xl aspect-square cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
            if (images[2]?.type === "image") {
              openImageModal(images[2]?.url, false);
            }
          }}>
            <img
              src={images[2]?.url}
              alt={images[2]?.alt}
              className="w-full h-full object-cover rounded-xl"
              loading="lazy"
              decoding="async"
              width="600"
              height="600"
            />
          </div>
        </div>

        {/* Second large image */}
        <div className="overflow-hidden rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
          if (images[3]?.type === "image") {
            openImageModal(images[3]?.url, false);
          }
        }}>
          <img
            src={images[3]?.url}
            alt={images[3]?.alt}
            className="w-full h-full object-cover rounded-xl"
            loading="lazy"
            decoding="async"
            width="1200"
            height="900"
          />
        </div>

        {/* Last two images side by side */}
        <div className="grid grid-cols-2 gap-0">
          <div className="overflow-hidden rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
            if (images[4]?.type === "image") {
              openImageModal(images[4]?.url, false);
            }
          }}>
            <img
              src={images[4]?.url}
              alt={images[4]?.alt}
              className="w-full h-full object-cover rounded-xl"
              loading="lazy"
              decoding="async"
              width="600"
              height="600"
            />
          </div>
          <div className="overflow-hidden rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
            if (images[5]?.type === "image") {
              openImageModal(images[5]?.url, false);
            }
          }}>
            <img
              src={images[5]?.url}
              alt={images[5]?.alt}
              className="w-full h-full object-cover rounded-xl"
              loading="lazy"
              decoding="async"
              width="600"
              height="600"
            />
          </div>
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
