import { useState } from "react";
import sleepMaskHeroMain from "@/assets/sleep-mask-hero-main.png";
import sleepMaskBenefits1 from "@/assets/sleep-mask-benefits-1.png";
import sleepMaskLifestyle1 from "@/assets/sleep-mask-lifestyle-1.png";
import sleepMaskLifestyle2 from "@/assets/sleep-mask-lifestyle-2.png";
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
    { url: sleepMaskHeroMain, alt: "Rise By Night Silk Deep Sleep Mask - Wake up pain-free after deep uninterrupted sleep", type: "image" },
    { url: sleepMaskBenefits1, alt: "Rise By Night Silk Deep Sleep Mask benefits - Reduces puffiness, promotes healthier skin, gentle breathable fabric", type: "image" },
    { url: sleepMaskLifestyle1, alt: "Rise By Night Silk Deep Sleep Mask - Upgrade your sleep, upgrade your life", type: "image" },
    { url: sleepMaskLifestyle2, alt: "Rise By Night Silk Deep Sleep Mask - Finally real rest, real recovery", type: "image" },
    { url: sleepMaskHeroMain, alt: "Rise By Night Silk Deep Sleep Mask comfortable fit", type: "image" },
    { url: sleepMaskBenefits1, alt: "Rise By Night Silk Deep Sleep Mask premium quality", type: "image" },
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
