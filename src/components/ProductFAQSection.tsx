// Ergonomic Pillow FAQ - uses shared FAQSection
import { FAQSection } from "@/components/shared/FAQSection";

const faqs = [
  {
    question: "What makes the Rise By Night pillow different?",
    answer: "The Rise By Night pillow uses scientifically-designed ergonomic contours and medical-grade cooling gel technology to maintain proper spinal alignment, reduce sleep apnea episodes by 86%, and eliminate snoring. Unlike regular pillows that flatten quickly, Rise By Night maintains its shape and support for 3-5 years."
  },
  {
    question: "What are the pillow dimensions and materials?",
    answer: "Dimensions: 60cm × 35cm × 11cm (23.6\" × 13.8\" × 4.3\"). Material composition: Medical-grade memory foam core with cooling gel infusion, breathable bamboo-derived rayon cover (40% bamboo rayon, 60% polyester), hypoallergenic inner lining, and CertiPUR-US certified foam free from harmful chemicals."
  },
  {
    question: "How does the 100-night trial work?",
    answer: "Try Rise By Night risk-free for 100 nights. If you're not completely satisfied, simply contact us for a full refund. No questions asked, no hassle. We'll arrange a free pickup and process your refund within 5 business days."
  },
  {
    question: "Is the pillow suitable for all sleeping positions?",
    answer: "Yes! The Rise By Night pillow is designed for all sleeping positions - back, side, and stomach sleepers. The ergonomic design adapts to your sleeping style while maintaining proper spinal alignment and airway opening."
  },
  {
    question: "How do I clean and maintain my pillow?",
    answer: "The Rise By Night pillow comes with a removable, machine-washable cover. Simply unzip and wash the cover on a gentle cycle. The pillow core can be spot cleaned with mild soap and water. Allow to air dry completely before use."
  },
  {
    question: "Will this help with my neck pain?",
    answer: "Many customers report significant reduction in neck and shoulder pain within the first few weeks of use. The ergonomic design promotes proper spinal alignment, reducing strain on your neck muscles. However, individual results may vary, and we recommend consulting with your healthcare provider for chronic pain issues."
  },
  {
    question: "What's included with my purchase?",
    answer: "Each Rise By Night pillow includes: the ergonomic pillow with cooling gel technology, a premium removable washable cover, a travel pouch, and care instructions. Bundle purchases include additional free gifts as indicated."
  }
];

export const ProductFAQSection = () => {
  return (
    <FAQSection
      title="Frequently Asked Questions"
      subtitle="Everything you need to know about Rise By Night"
      items={faqs}
    />
  );
};
