import { useState } from "react";
import sleepMaskProductShot from "@/assets/sleep-mask-product-shot.png";
import sleepMaskLifestyleReading from "@/assets/sleep-mask-lifestyle-reading.png";
import sleepMaskHeroBenefits from "@/assets/sleep-mask-hero-benefits.png";
import sleepMaskBenefitsTurquoise from "@/assets/sleep-mask-benefits-turquoise.png";
import sleepMaskLifestyleSitting from "@/assets/sleep-mask-lifestyle-sitting.png";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ImageModal } from "./ImageModal";

export const SleepMaskImageCarousel = () => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  
  const images = [
    { url: sleepMaskProductShot, alt: "Rise By Night Silk Deep Sleep Mask product view", type: "image" },
    { url: sleepMaskLifestyleReading, alt: "Rise By Night Silk Deep Sleep Mask - Reading in bed with comfort", type: "image" },
    { url: sleepMaskHeroBenefits, alt: "Rise By Night Silk Deep Sleep Mask - The power to feel your best again starts tonight", type: "image" },
    { url: sleepMaskBenefitsTurquoise, alt: "Rise By Night Silk Deep Sleep Mask - Reduces puffiness, promotes healthier skin, gentle breathable fabric", type: "image" },
    { url: sleepMaskLifestyleSitting, alt: "Rise By Night Silk Deep Sleep Mask lifestyle", type: "image" },
    { url: sleepMaskProductShot, alt: "Rise By Night Silk Deep Sleep Mask detailed view", type: "image" },
  ];

  return (
    <>
      {/* Mobile Carousel */}
      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            {images.map((item, index) => (
              <CarouselItem key={index}>
                <div 
                  className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 relative cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setExpandedImage(item.url)}
                >
                  <img
                    src={item.url}
                    alt={item.alt}
                    className="w-full h-auto object-cover"
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                  />
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
        <div className="overflow-hidden relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setExpandedImage(images[0].url)}>
          <img
            src={images[0].url}
            alt={images[0].alt}
            className="w-full h-full object-cover"
            loading="eager"
            decoding="async"
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
            />
          </div>
          <div className="overflow-hidden aspect-square cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setExpandedImage(images[2].url)}>
            <img
              src={images[2].url}
              alt={images[2].alt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
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
            />
          </div>
          <div className="overflow-hidden cursor-pointer hover:opacity-90 transition-opacity" onClick={() => setExpandedImage(images[5].url)}>
            <img
              src={images[5].url}
              alt={images[5].alt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>

      <ImageModal imageUrl={expandedImage} onClose={() => setExpandedImage(null)} />
    </>
  );
};
