import { useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, X } from "lucide-react";
import optisleepPillow from "@/assets/optisleep-pillow-main.png";
import pillowHeroImage from "@/assets/pillow-hero-main.png";
import pillowHeroNew from "@/assets/pillow-hero-new.png";
import pillowBenefitsHero from "@/assets/pillow-benefits-hero.png";
import consumerChoiceBadge from "@/assets/consumer-choice-badge-new.jpg";
import neckPainSpine from "@/assets/neck-pain-spine.png";
import lifestyleExcellent from "@/assets/lifestyle-excellent-rating.png";
import pillowEasyCleaning from "@/assets/pillow-easy-cleaning-new.png";
import pillowLifestyleSleep from "@/assets/pillow-lifestyle-sleep.jpg";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export const ProductImageCarousel = () => {
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; alt: string; type: string } | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Multiple views of the RiseByNight pillow (desktop order)
  const images = [
    { url: pillowHeroNew, alt: "RiseByNight ergonomic pillow main view", type: "image" },
    { url: "/videos/product-demo.mp4", alt: "RiseByNight pillow demonstration", type: "video" },
    { url: pillowBenefitsHero, alt: "RiseByNight pillow benefits - relieves neck pain, reduces sleep apnea, reduces acid reflux, relieves shoulders", type: "image" },
    { url: pillowEasyCleaning, alt: "RiseByNight pillow - easy cleaning and maintenance with removable cover", type: "image" },
    { url: neckPainSpine, alt: "RiseByNight pillow - neck pain and spine alignment relief", type: "image" },
    { url: pillowLifestyleSleep, alt: "RiseByNight pillow - person sleeping comfortably with ergonomic support", type: "image" },
  ];

  // Mobile order - swap image 2 (video) with image 4 (easy cleaning)
  const mobileImages = [
    images[0], // pillowHeroNew
    images[3], // pillowEasyCleaning (swapped from position 4)
    images[2], // pillowBenefitsHero
    images[1], // video (swapped from position 2)
    images[4], // neckPainSpine
    images[5], // pillowLifestyleSleep
  ];

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.5, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.5, 1));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleCloseModal = () => {
    setExpandedMedia(null);
    setZoomLevel(1);
  };

  return (
    <>
      {/* Simple Modal Overlay */}
      {expandedMedia && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center p-4"
          onClick={handleCloseModal}
        >
          <div className="relative max-w-6xl w-full h-full flex items-center justify-center">
            {/* Close Button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 z-[10000] rounded-full bg-white text-black p-3 hover:bg-gray-200 transition-all shadow-xl"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Content */}
            <div className="relative max-h-[90vh] max-w-full" onClick={(e) => e.stopPropagation()}>
              {expandedMedia.type === "video" ? (
                <video
                  src={expandedMedia.url}
                  controls
                  autoPlay
                  loop
                  className="max-h-[90vh] w-auto rounded-lg"
                  aria-label={expandedMedia.alt}
                />
              ) : (
                <div className="relative">
                  {/* Zoom Controls */}
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= 1}
                      className="p-2 rounded-full bg-white text-black shadow-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Zoom out"
                    >
                      <ZoomOut className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleResetZoom}
                      className="p-2 rounded-full bg-white text-black shadow-lg hover:bg-gray-200 transition-all"
                      aria-label="Reset zoom"
                    >
                      <Maximize2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= 3}
                      className="p-2 rounded-full bg-white text-black shadow-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Zoom in"
                    >
                      <ZoomIn className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Zoom Level Indicator */}
                  {zoomLevel > 1 && (
                    <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-white text-black shadow-lg text-sm font-medium">
                      {Math.round(zoomLevel * 100)}%
                    </div>
                  )}

                  {/* Image */}
                  <img
                    src={expandedMedia.url}
                    alt={expandedMedia.alt}
                    className="max-h-[90vh] w-auto rounded-lg"
                    style={{
                      transform: `scale(${zoomLevel})`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.2s'
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Carousel */}
      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            {mobileImages.map((item, index) => (
              <CarouselItem key={index}>
                <div 
                  className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 relative cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setExpandedMedia(item)}
                >
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto object-cover"
                      aria-label={item.alt}
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.alt}
                      className="w-full h-auto object-cover"
                      loading={index === 0 ? "eager" : "lazy"}
                      decoding="async"
                    />
                  )}
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
      </div>

      {/* Desktop Static Gallery */}
      <div className="hidden md:block">
        {/* First large image */}
        <div 
          className="overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setExpandedMedia(images[0])}
        >
          {images[0]?.type === "video" ? (
            <video
              src={images[0].url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
              aria-label={images[0].alt}
            />
          ) : (
            <img
              src={images[0]?.url}
              alt={images[0]?.alt}
              className="w-full h-full object-cover"
              loading="eager"
              decoding="async"
            />
          )}
        </div>

        {/* Two images side by side */}
        <div className="grid grid-cols-2 gap-0">
          <div 
            className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setExpandedMedia(images[1])}
          >
            {images[1]?.type === "video" ? (
              <video
                src={images[1].url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover"
                aria-label={images[1].alt}
              />
            ) : (
              <img
                src={images[1]?.url}
                alt={images[1]?.alt}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
            )}
          </div>
          <div 
            className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setExpandedMedia(images[2])}
          >
            <img
              src={images[2]?.url}
              alt={images[2]?.alt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>

        {/* Second large image */}
        <div 
          className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setExpandedMedia(images[3])}
        >
          <img
            src={images[3]?.url}
            alt={images[3]?.alt}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>

        {/* Last two images side by side */}
        <div className="grid grid-cols-2 gap-0">
          <div 
            className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setExpandedMedia(images[4])}
          >
...
          </div>
          <div 
            className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setExpandedMedia(images[5])}
          >
            <img
              src={images[5]?.url}
              alt={images[5]?.alt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </>
  );
};
