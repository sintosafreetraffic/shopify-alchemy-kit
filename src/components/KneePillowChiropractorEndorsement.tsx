// Knee Pillow Chiropractor Endorsement - uses shared component
import { ChiropractorEndorsementSection } from "@/components/shared/ChiropractorEndorsementSection";
import chiropractorImage from "@/assets/knee-pillow-chiropractor-new.png";

const benefits = [
  {
    title: "Scientifically Proven Design",
    description: "Maintains optimal hip and spine alignment for side sleepers",
  },
  {
    title: "Recommended by Professionals",
    description: "Used in chiropractic offices for lower back pain relief",
  },
  {
    title: "Proven Results",
    description: "Patients report significant reduction in hip and back pain",
  },
];

export const KneePillowChiropractorEndorsement = () => {
  return (
    <ChiropractorEndorsementSection
      image={chiropractorImage}
      imageAlt="Dr. Michael Thompson, Chiropractor, endorsing Rise By Night Ergonomic Knee Pillow"
      headline="Chiropractor Approved & Recommended"
      quote="As a chiropractor specializing in spinal health, I recommend the Rise By Night Knee Pillow to side sleepers experiencing lower back pain. Proper hip alignment during sleep is crucial for spinal health."
      benefits={benefits}
    />
  );
};
