// Ergonomic Pillow Chiropractor Endorsement - uses shared component
import { ChiropractorEndorsementSection } from "@/components/shared/ChiropractorEndorsementSection";
import chiropractorImage from "@/assets/chiropractor-endorsement-new.webp";

const benefits = [
  {
    title: "Scientifically Proven Design",
    description: "Supports optimal cervical spine alignment during sleep",
  },
  {
    title: "Recommended by Professionals",
    description: "Used in chiropractic offices across the country",
  },
  {
    title: "Proven Results",
    description: "Patients report significant reduction in neck pain and improved sleep quality",
  },
];

export const ChiropractorEndorsement = () => {
  return (
    <ChiropractorEndorsementSection
      image={chiropractorImage}
      imageAlt="Dr. Michael Thompson, Chiropractor, endorsing Rise By Night Ergonomic Sleep Pillow"
      headline="Chiropractor Approved & Recommended"
      quote="As a chiropractor with over 15 years of experience, I've seen countless patients suffering from neck pain and poor sleep posture. Rise By Night is one of the few products I confidently stand behind and recommend to my patients."
      benefits={benefits}
    />
  );
};
