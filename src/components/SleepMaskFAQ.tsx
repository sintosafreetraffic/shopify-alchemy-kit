// Sleep Mask FAQ - uses shared FAQSection
import { FAQSection } from "@/components/shared/FAQSection";

const faqs = [
  {
    question: "Will the deep sleep mask stay in place all night?",
    answer: "Yes! The adjustable elastic strap is designed to stay secure without being too tight. It won't slip off during the night, even if you move around while sleeping."
  },
  {
    question: "Is the mask suitable for side sleepers?",
    answer: "Absolutely! The contoured design and soft silk material make it perfect for side sleepers. The mask stays in place and doesn't create uncomfortable pressure when sleeping on your side."
  },
  {
    question: "How do I clean the deep sleep mask?",
    answer: "Hand wash in cold water with mild detergent and air dry. The silk material is durable and easy to maintain. We recommend washing every 1-2 weeks for optimal hygiene."
  },
  {
    question: "Will it block out 100% of light?",
    answer: "Yes! Our multi-layer design with contoured eye cups creates complete darkness. The mask effectively blocks all light from streetlights, morning sun, and any ambient light sources."
  },
  {
    question: "Is it comfortable for people with sensitive skin?",
    answer: "Definitely! Made from 100% pure mulberry silk, it's naturally hypoallergenic and gentle on even the most sensitive skin. Many customers with skin sensitivities specifically choose our mask for its comfort."
  },
  {
    question: "Can I wear it with eyelash extensions?",
    answer: "Yes! The contoured eye cups create space around your eyes, so there's no pressure on your lashes or lash extensions. Your extensions will remain intact and undamaged."
  },
  {
    question: "What's your return policy?",
    answer: "We offer a 100-night risk-free trial. If you're not completely satisfied with your sleep mask, return it within 100 nights for a full refund. We also provide a 2-year warranty."
  },
  {
    question: "How long will the mask last?",
    answer: "With proper care, your RiseByNight™ Sleep Mask will last for years. The high-quality silk and durable elastic are built to withstand nightly use while maintaining their shape and effectiveness."
  }
];

export const SleepMaskFAQ = () => {
  return (
    <FAQSection
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about the RiseByNight™ Deep Sleep Mask"
      items={faqs}
    />
  );
};
