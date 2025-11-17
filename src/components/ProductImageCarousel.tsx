import { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import optisleepPillow from "@/assets/optisleep-pillow.png";

export const ProductImageCarousel = () => {
  const [selectedImage, setSelectedImage] = useState(0);
  
  // Using the main product image - in a real scenario, you'd have multiple product images
  const images = [
    { url: optisleepPillow, alt: "OptiSleep pillow main view" },
    { url: optisleepPillow, alt: "OptiSleep pillow side view" },
    { url: optisleepPillow, alt: "OptiSleep pillow with packaging" },
    { url: optisleepPillow, alt: "OptiSleep pillow in use" },
  ];

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="rounded-xl overflow-hidden bg-secondary/10">
        <img
          src={images[selectedImage].url}
          alt={images[selectedImage].alt}
          className="w-full h-auto object-cover"
        />
      </div>

      {/* Thumbnail Carousel */}
      <Carousel
        opts={{
          align: "start",
        }}
        className="w-full"
      >
        <CarouselContent>
          {images.map((image, index) => (
            <CarouselItem key={index} className="basis-1/4">
              <button
                onClick={() => setSelectedImage(index)}
                className={`rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImage === index
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <img
                  src={image.url}
                  alt={image.alt}
                  className="w-full h-auto object-cover"
                />
              </button>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
};
