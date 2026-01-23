import { useMemo } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useSEO, SEO_CONFIGS } from "@/hooks/useSEO";
import { FAQSchema } from "@/components/seo/SEOSchemas";

const FAQ = () => {
  // SEO meta tags
  useSEO(SEO_CONFIGS.faq);
  const faqCategories = [
    {
      category: "Product Information",
      questions: [
        {
          question: "What makes Rise By Night™ pillows different from regular pillows?",
          answer: "Our pillows feature an ergonomic contour design that supports natural spinal alignment, high-density memory foam that maintains its shape for 3-5 years, and cooling gel technology to prevent overheating. Unlike regular pillows that flatten quickly, our pillows are scientifically designed and scientifically proven to reduce neck pain and improve sleep quality."
        },
        {
          question: "How long do Rise By Night™ products last?",
          answer: "Our ergonomic pillows are designed to last 3-5 years with proper care, significantly longer than regular pillows that typically need replacement every 6 months. Our products are made with high-density memory foam that maintains its shape and support over time. All products come with a 2-year warranty."
        },
        {
          question: "Are your products hypoallergenic?",
          answer: "Yes! All our products are made with CertiPUR-US certified materials that are hypoallergenic and safe. Our silk sleep mask is made from 100% pure mulberry silk, which is naturally hypoallergenic and gentle on sensitive skin."
        },
        {
          question: "What is the cooling gel technology?",
          answer: "Our pillows feature an innovative cooling gel layer that helps regulate temperature throughout the night. This technology prevents overheating and night sweats, keeping you comfortable all night long. 93% of our customers report sleeping cooler and more comfortably."
        }
      ]
    },
    {
      category: "Ordering & Shipping",
      questions: [
        {
          question: "Do you offer free shipping?",
          answer: "Yes! We offer free shipping worldwide on all orders. Standard delivery takes 5-7 business days globally, with expedited options available at checkout. US deliveries are typically faster due to our strategic logistics partnerships."
        },
        {
          question: "Can I track my order?",
          answer: "Absolutely! Once your order ships, you'll receive a tracking number via email. You can use this to monitor your package's journey to your door. For any questions about your order, our customer service team is available at support@risebynight.com."
        },
        {
          question: "What payment methods do you accept?",
          answer: "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and other secure payment methods through our Shopify checkout. All transactions are encrypted and secure."
        },
        {
          question: "Do you charge sales tax?",
          answer: "No, we do not charge sales tax at checkout. The price you see is the final price you pay, with free shipping included."
        }
      ]
    },
    {
      category: "Returns & Guarantee",
      questions: [
        {
          question: "What is your return policy?",
          answer: "We offer a 100-night risk-free trial on all our products. If you're not completely satisfied, you can return your product within 100 nights for a full refund. We also offer a 14-day return window from receipt if you decide it's not for you before the trial period ends. Customer bears return shipping costs."
        },
        {
          question: "What is covered under the 2-year warranty?",
          answer: "Our 2-year warranty covers any manufacturing defects or issues with materials. If your pillow loses its shape or support within 2 years under normal use, we'll replace it free of charge. The warranty does not cover damage from misuse or improper care."
        },
        {
          question: "What if my product arrives damaged?",
          answer: "If your product arrives damaged or defective, contact us immediately at support@risebynight.com with your order number and photos. We'll send a replacement within 7 business days at no cost to you."
        },
        {
          question: "Can I cancel my order?",
          answer: "Orders can only be cancelled within 5 minutes of placement. After that, your order enters our fulfillment process. If you need to make changes, please contact us immediately at support@risebynight.com."
        }
      ]
    },
    {
      category: "Usage & Care",
      questions: [
        {
          question: "How do I clean my Rise By Night™ pillow?",
          answer: "Remove and wash the pillowcase regularly. The pillow itself should be spot-cleaned only with a damp cloth and mild detergent. Do not machine wash or submerge the memory foam pillow in water. Allow to air dry completely before use."
        },
        {
          question: "How do I care for the silk sleep mask?",
          answer: "Hand wash the silk mask in cold water with gentle detergent. Do not wring or twist. Lay flat to air dry away from direct sunlight. Do not machine wash or tumble dry. With proper care, your silk mask will remain soft and effective for years."
        },
        {
          question: "Will the pillow work for all sleeping positions?",
          answer: "Our ergonomic pillow is designed primarily for back and side sleepers, which represent the majority of people. The contour design provides optimal support for these positions. Stomach sleepers may prefer a lower-profile pillow. Our knee pillow is specifically designed for side sleepers."
        },
        {
          question: "How long does it take to adjust to the pillow?",
          answer: "Most customers notice immediate improvement, but it can take 3-7 nights for your body to fully adjust to the ergonomic support. Some initial firmness is normal as the memory foam adapts to your body. If after 2 weeks you're not satisfied, remember you have our 100-night trial."
        }
      ]
    },
    {
      category: "Health & Safety",
      questions: [
        {
          question: "Can this pillow help with my neck pain?",
          answer: "96% of our customers report significant reduction in chronic neck pain. Our pillow is designed by sleep experts to support natural spinal alignment and reduce pressure points. However, if you have severe or persistent neck issues, we recommend consulting with your healthcare provider."
        },
        {
          question: "Is the pillow recommended by chiropractors?",
          answer: "Yes! Many chiropractors and healthcare professionals recommend our ergonomic pillow to their patients. The contour design promotes proper cervical spine alignment, which is crucial for reducing neck and shoulder pain."
        },
        {
          question: "Are your materials safe and certified?",
          answer: "Absolutely. All our memory foam products are CertiPUR-US certified, meaning they're made without harmful chemicals like formaldehyde, mercury, lead, and other heavy metals. Our silk is 100% pure mulberry silk with no synthetic additives."
        },
        {
          question: "Can the pillow help reduce snoring?",
          answer: "Yes! 86% of customers report reduced snoring. The ergonomic design helps keep airways open by maintaining proper head and neck positioning throughout the night. This can significantly reduce snoring for many people."
        }
      ]
    }
  ];

  // Flatten all questions for FAQ schema
  const allQuestions = useMemo(() => 
    faqCategories.flatMap(cat => cat.questions),
    []
  );

  return (
    <div className="min-h-screen bg-background">
      {/* FAQ Schema for rich snippets */}
      <FAQSchema items={allQuestions} />
      {/* Hero Section */}
      <section className="py-8 md:py-16 bg-gradient-to-b from-primary/5 to-background">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-5xl font-bold mb-4 md:mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-muted-foreground">
              Everything you need to know about Rise By Night™ products, shipping, returns, and more
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-8 md:py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
            {faqCategories.map((category, categoryIndex) => (
              <div key={categoryIndex}>
                <h2 className="text-2xl md:text-3xl font-bold mb-6">{category.category}</h2>
                <Accordion type="single" collapsible className="space-y-4">
                  {category.questions.map((item, index) => (
                    <AccordionItem 
                      key={index} 
                      value={`${categoryIndex}-${index}`}
                      className="border rounded-lg px-6 bg-card"
                    >
                      <AccordionTrigger className="text-left hover:no-underline py-4">
                        <span className="font-semibold">{item.question}</span>
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-4">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-8 md:py-16 bg-primary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-4 md:mb-6">
              Still Have Questions?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-6 md:mb-8">
              Our customer service team is here to help! Reach out and we'll get back to you within 24 hours.
            </p>
            <a 
              href="mailto:support@risebynight.com"
              className="inline-block bg-foreground text-background px-8 py-4 rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Contact Support
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FAQ;
