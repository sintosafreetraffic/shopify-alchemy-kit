import { useState } from "react";
import optisleepPillow from "@/assets/optisleep-pillow-main.png";
import pillowHeroImage from "@/assets/pillow-hero-main.png";
import pillowHeroNew from "@/assets/pillow-hero-new.png";
import pillowBenefitsHero from "@/assets/pillow-benefits-hero.png";
import consumerChoiceBadge from "@/assets/consumer-choice-badge-new.jpg";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";

export const ProductImageCarousel = () => {
  const [expandedMedia, setExpandedMedia] = useState<{ url: string; alt: string; type: string } | null>(null);
  
  // Multiple views of the RiseByNight pillow
  const images = [
    { url: pillowHeroNew, alt: "RiseByNight ergonomic pillow main view", type: "image" },
    { url: "/videos/product-demo.mp4", alt: "RiseByNight pillow demonstration", type: "video" },
    { url: pillowBenefitsHero, alt: "RiseByNight pillow benefits - relieves neck pain, reduces sleep apnea, reduces acid reflux, relieves shoulders", type: "image" },
    { url: optisleepPillow, alt: "RiseByNight pillow perspective", type: "image" },
    { url: optisleepPillow, alt: "RiseByNight pillow lifestyle view", type: "image" },
    { url: optisleepPillow, alt: "RiseByNight pillow comfort view", type: "image" },
  ];

  return (
    <>
      {/* Expanded Media Dialog */}
      <Dialog open={!!expandedMedia} onOpenChange={(open) => !open && setExpandedMedia(null)}>
        <DialogContent className="max-w-4xl w-full">
          {expandedMedia && (
            <div className="w-full">
              {expandedMedia.type === "video" ? (
                <video
                  src={expandedMedia.url}
                  controls
                  autoPlay
                  loop
                  className="w-full h-auto"
                  aria-label={expandedMedia.alt}
                />
              ) : (
                <img
                  src={expandedMedia.url}
                  alt={expandedMedia.alt}
                  className="w-full h-auto"
                />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Carousel */}
      <div className="md:hidden">
        <Carousel className="w-full">
          <CarouselContent>
            {images.map((item, index) => (
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
          className="overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 relative cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setExpandedMedia(images[0])}
        >
          {images[0]?.type === "video" ? (
            <video
              src={images[0].url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-auto object-cover"
              aria-label={images[0].alt}
            />
          ) : (
            <img
              src={images[0]?.url}
              alt={images[0]?.alt}
              className="w-full h-auto object-cover"
            />
          )}
        </div>

        {/* Two images side by side */}
        <div className="grid grid-cols-2">
          <div 
            className="overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setExpandedMedia(images[1])}
          >
            {images[1]?.type === "video" ? (
              <video
                src={images[1].url}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-auto object-cover"
                aria-label={images[1].alt}
              />
            ) : (
              <img
                src={images[1]?.url}
                alt={images[1]?.alt}
                className="w-full h-auto object-cover"
              />
            )}
          </div>
          <div 
            className="overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setExpandedMedia(images[2])}
          >
            <img
              src={images[2]?.url}
              alt={images[2]?.alt}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

        {/* Second large image */}
        <div 
          className="overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => setExpandedMedia(images[3])}
        >
          <img
            src={images[3]?.url}
            alt={images[3]?.alt}
            className="w-full h-auto object-cover"
          />
        </div>

        {/* Last two images side by side */}
        <div className="grid grid-cols-2">
          <div 
            className="overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setExpandedMedia(images[4])}
          >
            <img
              src={images[4]?.url}
              alt={images[4]?.alt}
              className="w-full h-auto object-cover"
            />
          </div>
          <div 
            className="overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8 cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => setExpandedMedia(images[5])}
          >
            <img
              src={images[5]?.url}
              alt={images[5]?.alt}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>
      </div>
    </>
  );
};
