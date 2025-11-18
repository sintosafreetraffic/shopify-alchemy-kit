import { useState } from "react";
import optisleepPillow from "@/assets/optisleep-pillow-main.png";

export const ProductImageCarousel = () => {
  const [selectedImage, setSelectedImage] = useState(0);
  
  // Multiple views of the OptiSleep pillow
  const images = [
    { url: optisleepPillow, alt: "OptiSleep pillow main view" },
    { url: optisleepPillow, alt: "OptiSleep pillow side angle" },
    { url: optisleepPillow, alt: "OptiSleep pillow detail view" },
    { url: optisleepPillow, alt: "OptiSleep pillow perspective" },
  ];

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
        <img
          src={images[selectedImage].url}
          alt={images[selectedImage].alt}
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Thumbnail Grid */}
      <div className="grid grid-cols-4 gap-3">
        {images.map((image, index) => (
          <button
            key={index}
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
        ))}
      </div>
    </div>
  );
};
