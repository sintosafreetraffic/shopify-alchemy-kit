import pillowMain from "@/assets/optisleep-pillow-main.png";
import kneePillowMain from "@/assets/knee-pillow-new.png";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";

export const SleepBundleBenefits = () => {
  const products = [
    {
      image: pillowMain,
      name: "Ergonomic Sleep Pillow",
      benefits: [
        "Contoured design supports natural spinal alignment",
        "Cooling gel technology prevents overheating",
        "High-density memory foam maintains shape for 3-5 years",
        "Reduces neck pain and morning stiffness",
      ],
    },
    {
      image: kneePillowMain,
      name: "Ergonomic Knee Pillow",
      benefits: [
        "Aligns hips and spine for side sleepers",
        "Reduces lower back and hip pain",
        "Memory foam cushioning with adjustable strap",
        "Improves circulation and reduces leg discomfort",
      ],
    },
    {
      image: eyeMaskGift,
      name: "Silk Sleep Mask",
      benefits: [
        "Blocks 100% of light for deeper sleep",
        "Pure mulberry silk gentle on skin",
        "Contoured design doesn't press on eyes",
        "Hypoallergenic and breathable material",
      ],
    },
  ];

  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">What's Included in Your Bundle</h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Three premium products working together to transform your sleep
            </p>
          </div>

          <div className="space-y-12">
            {products.map((product, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } gap-8 items-center bg-muted/30 p-8 rounded-lg`}
              >
                <div className="flex-1">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full max-w-md mx-auto h-64 object-contain"
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <h3 className="text-2xl md:text-3xl font-bold">{product.name}</h3>
                  <ul className="space-y-3">
                    {product.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-start gap-3">
                        <span className="text-primary text-xl mt-0.5">✓</span>
                        <span className="text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-primary/5 border-2 border-primary rounded-lg p-8 text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-3">Save $40 with the Bundle</h3>
            <p className="text-lg text-muted-foreground mb-2">
              Regular price: <span className="line-through">$189.97</span>
            </p>
            <p className="text-3xl md:text-4xl font-bold text-primary">
              Bundle price: $149.99
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
