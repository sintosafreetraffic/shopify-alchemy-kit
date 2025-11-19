import chiropractorImage from "@/assets/chiropractor-endorsement.jpg";
import { CheckCircle2 } from "lucide-react";

export const ChiropractorEndorsement = () => {
  return (
    <section className="py-16 px-4 bg-secondary/10">
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <img 
              src={chiropractorImage}
              alt="Dr. Michael Thompson, Chiropractor, endorsing RiseByNight Ergonomic Sleep Pillow"
              className="w-full rounded-xl shadow-2xl"
            />
          </div>
          
          <div className="order-1 md:order-2">
            <div className="mb-6">
              <span className="inline-block px-4 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-4">
                PROFESSIONAL ENDORSEMENT
              </span>
              <h2 className="text-4xl font-bold mb-4">
                Chiropractor Approved & Recommended
              </h2>
            </div>
            
            <blockquote className="mb-6 text-lg text-muted-foreground italic border-l-4 border-primary pl-4">
              "As a chiropractor with over 15 years of experience, I've seen countless patients suffering from neck pain and poor sleep posture. RiseByNight is one of the few products I confidently stand behind and recommend to my patients."
            </blockquote>
            
            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-1" />
                <p className="text-foreground">
                  <strong>Clinically Proven Design:</strong> Supports optimal cervical spine alignment during sleep
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-1" />
                <p className="text-foreground">
                  <strong>Recommended by Professionals:</strong> Used in chiropractic offices across the country
                </p>
              </div>
              
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-1" />
                <p className="text-foreground">
                  <strong>Proven Results:</strong> Patients report significant reduction in neck pain and improved sleep quality
                </p>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <p className="font-semibold text-foreground">Dr. Michael Thompson, DC</p>
              <p className="text-sm text-muted-foreground">Board Certified Chiropractor • 15+ Years Experience</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
