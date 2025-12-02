import { useState, useEffect } from "react";
import pillowHeroNew from "@/assets/pillow-hero-new.webp";
import pillowBenefitsNew from "@/assets/pillow-benefits-new.webp";
import pillowBenefitsUpdated from "@/assets/pillow-benefits-updated.webp";
import neckPainSpine from "@/assets/neck-pain-spine.webp";
import pillowEasyCleaning from "@/assets/pillow-easy-cleaning-new.webp";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ImageModal } from "./ImageModal";

export const ProductImageCarousel = () => {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  // Multiple views of the Rise By Night pillow (desktop order)
  const images = [
    { url: pillowHeroNew, alt: "Rise By Night ergonomic pillow main view", type: "image" },
    { url: "/videos/product-demo.mp4", alt: "Rise By Night pillow demonstration", type: "video" },
    { url: pillowBenefitsNew, alt: "Rise By Night ergonomic pillow benefits - relieves neck & back pain, reduces sleep apnea, reduces acid reflux, relieves shoulders", type: "image" },
    { url: pillowEasyCleaning, alt: "Rise By Night pillow - easy cleaning and maintenance with removable cover", type: "image" },
    { url: neckPainSpine, alt: "Rise By Night pillow - neck pain and spine alignment relief", type: "image" },
    { url: pillowBenefitsUpdated, alt: "Rise By Night pillow - premium ergonomic pillow benefits including neck support, pressure relief, custom fit, durability, high-end materials, enhanced sleep", type: "image" },
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
            {mobileImages.map((item, index) => (
              <CarouselItem key={index}>
                <div 
                  className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 relative cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => item.type === "image" && setExpandedImage(item.url)}
                >
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      preload="none"
                      className="w-full h-auto object-cover rounded-xl"
                      aria-label={item.alt}
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.alt}
                      className="w-full h-auto object-cover rounded-xl"
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
        
        {/* Carousel Indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {mobileImages.map((_, index) => (
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
      <div className="hidden md:block space-y-2">
        {/* First large image */}
        <div className="overflow-hidden rounded-xl relative cursor-pointer hover:opacity-90 transition-opacity" onClick={() => images[0]?.type === "image" && setExpandedImage(images[0].url)}>
          {images[0]?.type === "video" ? (
            <video
              src={images[0].url}
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover rounded-xl"
              aria-label={images[0].alt}
            />
          ) : (
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
          )}
        </div>

        {/* Two images side by side */}
        <div className="grid grid-cols-2 gap-2">
          <div className="overflow-hidden rounded-xl aspect-square cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
            if (images[1]?.type === "image") {
              setExpandedImage(images[1].url);
            }
          }}>
            {images[1]?.type === "video" ? (
              <video
                src={images[1].url}
                autoPlay
                loop
                muted
                playsInline
                preload="none"
                className="w-full h-full object-cover rounded-xl"
                aria-label={images[1].alt}
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
              />
            )}
          </div>
          <div className="overflow-hidden rounded-xl aspect-square cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
            if (images[2]?.type === "image") {
              setExpandedImage(images[2]?.url);
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
            setExpandedImage(images[3]?.url);
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
        <div className="grid grid-cols-2 gap-2">
          <div className="overflow-hidden rounded-xl cursor-pointer hover:opacity-90 transition-opacity" onClick={() => {
            if (images[4]?.type === "image") {
              setExpandedImage(images[4]?.url);
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
              setExpandedImage(images[5]?.url);
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

      <ImageModal imageUrl={expandedImage} onClose={() => setExpandedImage(null)} />
    </>
  );
};
