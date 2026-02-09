// Performance: All images use WebP format for better compression
// Product demo video uses image-first poster with click-to-play
import { useState, useEffect, useRef } from "react";
// All images are already WebP format for optimal performance
import pillowHeroNew from "@/assets/ergonomic-pillow-hero.webp";
import pillowHeroNeckPain from "@/assets/pillow-hero-neck-pain.webp";
import pillowHeroBackPain from "@/assets/pillow-hero-back-pain.webp";
import backPainHero1 from "@/assets/back-pain-hero-1.webp";
import pillowBundleNew from "@/assets/pillow-male-mask-new.webp";
import pillowBeforeAfterSpine from "@/assets/neck-alignment-side-sleepers.webp";
import noNumbnessBeforeAfterSpine from "@/assets/no-numbness-before-after-spine.webp";
import pillowDeeperSleep from "@/assets/pillow-deeper-sleep.webp";
import pillowDeeperSleepBack from "@/assets/pillow-deeper-sleep-back.webp";
import pillowCoupleNeckPain from "@/assets/pillow-couple-no-neck-pain.webp";
import pillowCoupleBackPain from "@/assets/pillow-couple-back-pain.webp";
import pillowCoverMask from "@/assets/ergonomic-pillow-cover-mask.webp";
import pillowMachineWashable from "@/assets/ergonomic-pillow-machine-washable-removable-cover.webp";
import pillowTrusted from "@/assets/ergonomic-pillow-trusted.webp";
import noNumbnessSocialProof from "/images/no-numbness-social-proof.webp";
import { PillowFocus } from "@/config/pillowFocusContent";

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

interface ProductImageCarouselProps {
  pillowFocus?: PillowFocus;
}

export const ProductImageCarousel = ({ pillowFocus = 'neck' }: ProductImageCarouselProps) => {
  const [expandedImageIndex, setExpandedImageIndex] = useState<number | null>(null);
  const [mobileApi, setMobileApi] = useState<CarouselApi>();
  const [desktopApi, setDesktopApi] = useState<CarouselApi>();
  const [mobileCurrent, setMobileCurrent] = useState(0);
  const [desktopCurrent, setDesktopCurrent] = useState(0);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [selectedVideoSrc, setSelectedVideoSrc] = useState<string | null>(null);

  // Select image 1 based on pillow focus (neck pain vs back pain)
  const image1 = pillowFocus === 'neck' ? pillowHeroNeckPain : backPainHero1;
  const image1Alt = pillowFocus === 'neck' 
    ? "Rise By Night ergonomic pillow - neck pain relief for side sleepers"
    : "Rise By Night ergonomic pillow - stop waking up with a numb arm, designed for side sleepers";

  // Select image 2 based on pillow focus (back pain vs neck pain)
  const image2 = pillowFocus === 'back' ? pillowDeeperSleepBack : pillowDeeperSleep;
  const image2Alt = pillowFocus === 'back' 
    ? "Rise By Night pillow - designed to remove back pain"
    : "Rise By Night pillow - engineered for deeper sleep with reduced neck and shoulder pressure";

  // Select image 4 based on pillow focus (back pain vs neck pain)
  const image4 = pillowFocus === 'back' ? noNumbnessSocialProof : pillowTrusted;
  const image4Alt = pillowFocus === 'back' 
    ? "Rise By Night pillow - trusted by 20,000+ sleepers with customer reviews for arm numbness and shoulder pain relief"
    : "Rise By Night pillow - trusted by 100,000+ sleepers with customer reviews";

  // Select image 5 based on pillow focus (back pain vs neck pain)
  const image5 = pillowFocus === 'back' ? pillowCoupleBackPain : pillowCoupleNeckPain;
  const image5Alt = pillowFocus === 'back' 
    ? "Happy couple with Rise By Night pillows - no more back pain"
    : "Happy couple with Rise By Night pillows - no more neck pain";

  // Multiple views of the Rise By Night pillow (desktop order)
  const images = [
    { url: image1, alt: image1Alt, type: "image" },
    { url: pillowMachineWashable, alt: "Ergonomic pillow with machine washable removable cover - cooling fabric and fits standard pillowcases", type: "image" },
    { url: image2, alt: image2Alt, type: "image" },
    { url: image4, alt: image4Alt, type: "image" },
    { url: image5, alt: image5Alt, type: "image" },
    { url: pillowFocus === 'back' ? noNumbnessBeforeAfterSpine : pillowBeforeAfterSpine, alt: pillowFocus === 'back' ? "Reduces shoulder pressure and arm numbness while side sleeping - before and after comparison" : "Before and after spine alignment comparison - Rise By Night pillow vs regular pillow", type: "image" },
  ];

  // Get only image URLs (excluding videos) for the modal navigation
  const imageOnlyUrls = images.filter(img => img.type === "image").map(img => img.url);

  // Mobile order - same product images as desktop
  const mobileImages = [
    images[0], // hero image
    images[1], // machine washable
    images[2], // deeper sleep
    images[3], // pillowTrusted
    images[4], // couple image
    images[5], // spine alignment
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
      {/* Mobile Carousel - full width edge-to-edge */}
      <div className="md:hidden w-screen relative left-1/2 -translate-x-1/2">
        <div className="bg-surface-subtle">
          <Carousel className="w-full" setApi={setMobileApi}>
            <CarouselContent className="ml-0">
              {mobileImages.map((item, index) => (
                <CarouselItem key={index} className="pl-0">
                  {/* Fixed aspect ratio container prevents CLS on image load */}
                  <div
                    className="overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity aspect-square"
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
        </div>
        
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

      {/* Desktop Carousel - contained within grid column, bottom-only rounding */}
      <div className="hidden md:block w-full rounded-b-xl overflow-hidden">
        <Carousel className="w-full" setApi={setDesktopApi}>
          <CarouselContent className="-ml-0">
            {images.map((item, index) => (
              <CarouselItem key={index} className="pl-0">
                {/* Fixed aspect ratio container prevents CLS on image load */}
                <div 
                  className="overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity aspect-square bg-surface-subtle"
                  onClick={() => item.type === "image" && openImageModal(item.url, false)}
                >
                  {item.type === "video" ? (
                    <VideoPoster
                      videoSrc={item.url}
                      alt={item.alt}
                      posterSrc={(item as any).poster || pillowHeroNew}
                      width={1200}
                      height={1200}
                      onPlayClick={() => handleVideoClick(item.url)}
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.alt}
                      className="w-full h-full object-cover"
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "low"}
                      decoding="async"
                      width={1200}
                      height={1200}
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
