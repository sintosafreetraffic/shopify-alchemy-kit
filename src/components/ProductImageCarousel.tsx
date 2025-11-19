import { useState } from "react";
import optisleepPillow from "@/assets/optisleep-pillow-main.png";
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
    { url: optisleepPillow, alt: "RiseByNight pillow main view" },
    { url: optisleepPillow, alt: "RiseByNight pillow side angle" },
    { url: optisleepPillow, alt: "RiseByNight pillow detail view" },
    { url: optisleepPillow, alt: "RiseByNight pillow perspective" },
    { url: optisleepPillow, alt: "RiseByNight pillow lifestyle view" },
    { url: optisleepPillow, alt: "RiseByNight pillow comfort view" },
  ];

  return (
    <>
      {/* Mobile Carousel */}
      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem key={index}>
                <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
                  <img
                    src={image.url}
                    alt={image.alt}
                    className="w-full h-auto object-contain"
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
      <div className="hidden md:block space-y-3">
        {/* First large image */}
        <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
          <img
            src={images[0].url}
            alt={images[0].alt}
            className="w-full h-auto object-contain"
          />
        </div>

        {/* Two images side by side */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
            <img
              src={images[1].url}
              alt={images[1].alt}
              className="w-full h-auto object-contain"
            />
          </div>
          <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
            <img
              src={images[2].url}
              alt={images[2].alt}
              className="w-full h-auto object-contain"
            />
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
