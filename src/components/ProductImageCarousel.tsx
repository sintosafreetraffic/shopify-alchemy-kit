import { useState } from "react";
import optisleepPillow from "@/assets/optisleep-pillow-main.png";
import consumerChoiceBadge from "@/assets/consumer-choice-badge-new.jpg";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export const ProductImageCarousel = () => {
  
  // Multiple views of the RiseByNight pillow
  const images = [
    { url: optisleepPillow, alt: "RiseByNight pillow main view", type: "image" },
    { url: "/videos/product-demo.mp4", alt: "RiseByNight pillow demonstration", type: "video" },
    { url: optisleepPillow, alt: "RiseByNight pillow detail view", type: "image" },
    { url: optisleepPillow, alt: "RiseByNight pillow perspective", type: "image" },
    { url: optisleepPillow, alt: "RiseByNight pillow lifestyle view", type: "image" },
    { url: optisleepPillow, alt: "RiseByNight pillow comfort view", type: "image" },
  ];

  return (
    <>
      {/* Mobile Carousel */}
      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            {images.map((item, index) => (
              <CarouselItem key={index}>
                <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 relative">
                  {index === 0 && (
                    <img
                      src={consumerChoiceBadge}
                      alt="Consumer Choice Badge"
                      className="absolute top-4 right-4 w-20 h-auto z-10"
                    />
                  )}
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-full h-auto object-contain"
                      aria-label={item.alt}
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={item.alt}
                      className="w-full h-auto object-contain"
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
      <div className="hidden md:block space-y-3">
        {/* First large image */}
        <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 relative">
          <img
            src={consumerChoiceBadge}
            alt="Consumer Choice Badge"
            className="absolute top-4 right-4 w-24 h-auto z-10"
          />
          <img
            src={images[0].url}
            alt={images[0].alt}
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Two images side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
            {images[1].type === "video" ? (
              <video
                src={images[1].url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto object-contain"
                aria-label={images[1].alt}
              />
            ) : (
              <img
                src={images[1].url}
                alt={images[1].alt}
                className="w-full h-auto object-contain"
              />
            )}
          </div>
          <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
            {images[2].type === "video" ? (
              <video
                src={images[2].url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto object-contain"
                aria-label={images[2].alt}
              />
            ) : (
              <img
                src={images[2].url}
                alt={images[2].alt}
                className="w-full h-auto object-contain"
              />
            )}
          </div>
        </div>

        {/* Second large image */}
        <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
          <img
            src={images[3].url}
            alt={images[3].alt}
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Two more images side by side at the bottom */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
            <img
              src={images[4].url}
              alt={images[4].alt}
              className="w-full h-auto object-contain"
            />
          </div>
          <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
            <img
              src={images[5].url}
              alt={images[5].alt}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </>
  );
};
