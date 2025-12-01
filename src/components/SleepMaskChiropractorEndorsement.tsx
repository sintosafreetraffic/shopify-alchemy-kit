import chiropractorImage from "@/assets/chiropractor-endorsement.jpg";
import { CheckCircle2 } from "lucide-react";

export const SleepMaskChiropractorEndorsement = () => {
  return (
    <section className="py-6 md:py-16 px-4 bg-background">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center">
          <div className="order-2 md:order-1">
            <img 
              src={chiropractorImage}
              alt="Sleep specialist endorsing Rise By Night Silk Deep Sleep Mask"
              className="w-full rounded-xl shadow-2xl"
            />
          </div>
          
          <div className="order-1 md:order-2">
            <div className="mb-4 md:mb-6">
              <span className="inline-block px-3 md:px-4 py-1 bg-primary/10 text-primary rounded-full text-xs md:text-sm font-semibold mb-3 md:mb-4">
                PROFESSIONAL ENDORSEMENT
              </span>
              <h2 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
                Sleep Specialist Approved & Recommended
              </h2>
            </div>
            
            <blockquote className="mb-4 md:mb-6 text-base md:text-lg text-muted-foreground italic border-l-4 border-primary pl-3 md:pl-4">
              "As a sleep specialist, I understand the critical role of complete darkness in achieving quality rest. The Rise By Night Deep Sleep Mask is one of the few products I confidently recommend to patients struggling with light sensitivity."
            </blockquote>
            
            <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
              <div className="flex items-start gap-2 md:gap-3">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0 mt-0.5 md:mt-1" />
                <p className="text-sm md:text-base text-foreground">
                  <strong>Scientifically Proven Design:</strong> 100% light blocking promotes natural melatonin production
                </p>
              </div>
              
              <div className="flex items-start gap-2 md:gap-3">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0 mt-0.5 md:mt-1" />
                <p className="text-sm md:text-base text-foreground">
                  <strong>Recommended by Professionals:</strong> Used by sleep clinics for improved sleep quality
                </p>
              </div>
              
              <div className="flex items-start gap-2 md:gap-3">
                <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6 text-primary shrink-0 mt-0.5 md:mt-1" />
                <p className="text-sm md:text-base text-foreground">
                  <strong>Proven Results:</strong> Patients report deeper sleep and reduced morning fatigue
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
