import { useState } from "react";
import optisleepPillow from "@/assets/optisleep-pillow-main.png";
import pillowHeroImage from "@/assets/pillow-hero-main.png";
import pillowHeroNew from "@/assets/pillow-hero-new.png";
import pillowBenefitsPainRelief from "@/assets/pillow-benefits-pain-relief.png";
import pillowBenefitsUpdated from "@/assets/pillow-benefits-updated.png";
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
  // Multiple views of the RiseByNight pillow (desktop order)
  const images = [
    { url: pillowHeroNew, alt: "RiseByNight ergonomic pillow main view", type: "image" },
    { url: "/videos/product-demo.mp4", alt: "RiseByNight pillow demonstration", type: "video" },
    { url: pillowBenefitsPainRelief, alt: "RiseByNight ergonomic pillow benefits - relieves neck & back pain, reduces sleep apnea, reduces acid reflux, relieves shoulders", type: "image" },
    { url: pillowEasyCleaning, alt: "RiseByNight pillow - easy cleaning and maintenance with removable cover", type: "image" },
    { url: neckPainSpine, alt: "RiseByNight pillow - neck pain and spine alignment relief", type: "image" },
    { url: pillowBenefitsUpdated, alt: "RiseByNight pillow - premium ergonomic pillow benefits including neck support, pressure relief, custom fit, durability, high-end materials, enhanced sleep", type: "image" },
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

  return (
    <>
      {/* Mobile Carousel */}
      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            {mobileImages.map((item, index) => (
              <CarouselItem key={index}>
                <div 
                  className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 relative"
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
        <div className="overflow-hidden relative">
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
          <div className="overflow-hidden aspect-[4/3]">
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
          <div className="overflow-hidden aspect-[4/3]">
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
        <div className="overflow-hidden">
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
          <div className="overflow-hidden">
            <img
              src={images[4]?.url}
              alt={images[4]?.alt}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
          <div className="overflow-hidden">
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
