// Knee Pillow FAQ - uses shared FAQSection
import { FAQSection } from "@/components/shared/FAQSection";

const faqs = [
  {
    question: "How does a knee pillow help with sleep?",
    answer: "A knee pillow maintains proper spinal alignment by keeping your hips, pelvis, and spine in a neutral position while side sleeping. This reduces pressure on your lower back, hips, and knees, leading to less pain and better sleep quality."
  },
  {
    question: "Will the pillow stay in place all night?",
    answer: "Yes! Our knee pillow features an adjustable strap that wraps around your thigh to keep it securely in place throughout the night, even if you move around."
  },
  {
    question: "Is it only for side sleepers?",
    answer: "While primarily designed for side sleepers, the knee pillow can also be used by back sleepers who place it under their knees to reduce lower back pressure and improve circulation."
  },
  {
    question: "What is the pillow made of?",
    answer: "Our knee pillow is made from high-density memory foam that conforms to your leg shape while maintaining supportive structure. The cover is made from breathable, hypoallergenic fabric that's machine washable."
  },
  {
    question: "Can it help with sciatica?",
    answer: "Yes, many customers report significant relief from sciatica symptoms. By maintaining proper leg and spine alignment, the pillow reduces pressure on the sciatic nerve pathway."
  },
  {
    question: "How long does it take to get used to?",
    answer: "Most people adjust within 2-3 nights. Some feel the difference immediately, while others may need a week to fully adapt to the improved sleeping position."
  },
  {
    question: "Is it suitable for pregnancy?",
    answer: "Absolutely! Pregnant women often experience hip and back pain, and our knee pillow provides gentle support and alignment that many expecting mothers find extremely helpful."
  },
  {
    question: "How do I clean it?",
    answer: "The removable cover is machine washable. Simply unzip the cover, wash it in cold water on a gentle cycle, and air dry. The memory foam core can be spot cleaned with a damp cloth."
  }
];

export const KneePillowFAQ = () => {
  return (
    <FAQSection
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about our ergonomic knee pillow"
      items={faqs}
    />
  );
};
