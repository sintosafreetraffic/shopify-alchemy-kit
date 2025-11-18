import { useState } from "react";
import optisleepPillow from "@/assets/optisleep-pillow-main.png";

export const ProductImageCarousel = () => {
  
  // Multiple views of the OptiSleep pillow
  const images = [
    { url: optisleepPillow, alt: "OptiSleep pillow main view" },
    { url: optisleepPillow, alt: "OptiSleep pillow side angle" },
    { url: optisleepPillow, alt: "OptiSleep pillow detail view" },
    { url: optisleepPillow, alt: "OptiSleep pillow perspective" },
  ];

  return (
    <div className="space-y-3">
      {/* First large image */}
      <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
        <img
          src={images[0].url}
          alt={images[0].alt}
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Second large image */}
      <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
        <img
          src={images[1].url}
          alt={images[1].alt}
          className="w-full h-auto object-contain"
        />
      </div>

      {/* Two images side by side at the bottom */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
          <img
            src={images[2].url}
            alt={images[2].alt}
            className="w-full h-auto object-contain"
          />
        </div>
        <div className="rounded-xl overflow-hidden bg-gradient-to-br from-secondary/30 to-secondary/10 p-8">
          <img
            src={images[3].url}
            alt={images[3].alt}
            className="w-full h-auto object-contain"
          />
        </div>
      </div>
    </div>
  );
};
