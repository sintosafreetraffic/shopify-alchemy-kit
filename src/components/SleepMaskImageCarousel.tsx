import { useState, useEffect } from "react";
import sleepMaskLifestyleHero from "@/assets/sleep-mask-lifestyle-hero.webp";
import sleepMaskLifestyleReading from "@/assets/sleep-mask-lifestyle-reading.webp";
import sleepMaskHeroBenefits from "@/assets/sleep-mask-hero-benefits.webp";
import sleepMaskBenefitsNew from "@/assets/sleep-mask-benefits-new.webp";
import sleepMaskLifestyleSitting from "@/assets/sleep-mask-lifestyle-sitting.webp";
import sleepMaskStrapDetail from "@/assets/sleep-mask-strap-detail.webp";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ImageModal } from "./ImageModal";

export const SleepMaskImageCarousel = () => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  
  const images = [
    { url: sleepMaskLifestyleHero, alt: "Rise By Night Silk Deep Sleep Mask - Woman sleeping peacefully", type: "image" },
    { url: sleepMaskLifestyleReading, alt: "Rise By Night Silk Deep Sleep Mask - Reading in bed with comfort", type: "image" },
    { url: sleepMaskHeroBenefits, alt: "Rise By Night Silk Deep Sleep Mask - The power to feel your best again starts tonight", type: "image" },
    { url: sleepMaskBenefitsNew, alt: "Rise By Night Silk Deep Sleep Mask - Reduces puffiness, promotes healthier skin, gentle breathable fabric", type: "image" },
    { url: sleepMaskLifestyleSitting, alt: "Rise By Night Silk Deep Sleep Mask lifestyle", type: "image" },
    { url: sleepMaskStrapDetail, alt: "Rise By Night Silk Deep Sleep Mask adjustable strap detail", type: "image" },
  ];

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
            {images.map((item, index) => (
              <CarouselItem key={index} className="pl-0">
                <div 
                  className="overflow-hidden bg-secondary/10 relative cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setExpandedImage(item.url)}
                >
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
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-3" />
          <CarouselNext className="right-3" />
        </Carousel>
        
        {/* Carousel Thumbnail Indicators */}
        <div className="flex justify-start gap-2 mt-4 px-4 py-2 overflow-x-auto scrollbar-hide">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`w-14 h-14 rounded-lg overflow-hidden transition-all flex-shrink-0 ${
                current === index 
                  ? 'ring-2 ring-primary ring-offset-2' 
                  : 'opacity-60 hover:opacity-100'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            >
              <img 
                src={img.url} 
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Static Gallery */}
      <div className="hidden md:block">
        {/* First large image */}
        <div className="overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setExpandedImage(images[0].url)}>
          <img
            src={images[0].url}
            alt={images[0].alt}
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            width="1200"
            height="900"
          />
        </div>

        {/* Two images side by side */}
        <div className="grid grid-cols-2 gap-0">
          <div className="overflow-hidden aspect-square cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setExpandedImage(images[1].url)}>
            <img
              src={images[1].url}
              alt={images[1].alt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              width="600"
              height="600"
            />
          </div>
          <div className="overflow-hidden aspect-square cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setExpandedImage(images[2].url)}>
            <img
              src={images[2].url}
              alt={images[2].alt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              width="600"
              height="600"
            />
          </div>
        </div>

        {/* Second large image */}
        <div className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setExpandedImage(images[3].url)}>
          <img
            src={images[3].url}
            alt={images[3].alt}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            width="1200"
            height="900"
          />
        </div>

        {/* Last two images side by side */}
        <div className="grid grid-cols-2 gap-0">
          <div className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setExpandedImage(images[4].url)}>
            <img
              src={images[4].url}
              alt={images[4].alt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              width="600"
              height="600"
            />
          </div>
          <div className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setExpandedImage(images[5].url)}>
            <img
              src={images[5].url}
              alt={images[5].alt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              width="600"
              height="600"
            />
          </div>
        </div>
      </div>

      <ImageModal imageUrl={expandedImage} onClose={() => setExpandedImage(null)} />
    </>
  );
};
