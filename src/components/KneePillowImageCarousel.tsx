import { useState, useEffect } from "react";
import kneePillowHeroMain from "@/assets/knee-pillow-hero-main.webp";
import kneePillowHeroLifestyle from "@/assets/knee-pillow-hero-lifestyle.webp";
import kneePillowMain from "@/assets/knee-pillow-main-new.webp";
import kneePillowMaterials from "@/assets/knee-pillow-materials.webp";
import kneePillowErgonomic from "@/assets/knee-pillow-ergonomic-design.webp";
import kneePillowSleepingPositions from "@/assets/knee-pillow-sleeping-positions.webp";
import kneePillowDesignFeatures from "@/assets/knee-pillow-design-features.webp";
import kneePillowMemoryFoam from "@/assets/knee-pillow-memory-foam-core.webp";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ImageModal } from "./ImageModal";

export const KneePillowImageCarousel = () => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  
  const images = [
    { url: kneePillowHeroMain, alt: "Rise By Night ergonomic knee pillow main product view", type: "image" },
    { url: kneePillowHeroLifestyle, alt: "Rise By Night ergonomic knee pillow lifestyle view on bed", type: "image" },
    { url: kneePillowMain, alt: "Rise By Night ergonomic knee pillow main view", type: "image" },
    { url: kneePillowMaterials, alt: "Rise By Night knee pillow high quality materials", type: "image" },
    { url: kneePillowErgonomic, alt: "Rise By Night knee pillow ergonomic design", type: "image" },
    { url: kneePillowSleepingPositions, alt: "Rise By Night knee pillow for multiple sleeping positions", type: "image" },
    { url: kneePillowDesignFeatures, alt: "Rise By Night knee pillow design features and construction", type: "image" },
    { url: kneePillowMemoryFoam, alt: "Rise By Night knee pillow memory foam core technology", type: "image" },
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
      <div className="md:hidden">
        <Carousel className="w-full" setApi={setApi}>
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
                    fetchPriority={index === 0 ? "high" : "low"}
                    decoding="async"
                    width="800"
                    height="800"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-2" />
          <CarouselNext className="right-2" />
        </Carousel>
        
        {/* Carousel Indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => api?.scrollTo(index)}
              className={`h-2 rounded-full transition-all ${
                current === index ? 'w-8 bg-primary' : 'w-2 bg-gray-300'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
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
