import { useState, useEffect } from "react";
import pillowMain from "@/assets/optisleep-pillow-main.png";
import kneePillowMain from "@/assets/knee-pillow-new.png";
import eyeMaskGift from "@/assets/eye-mask-gift-transparent.png";
import { fetchProducts, type ShopifyProduct } from "@/lib/shopify";
import { formatPrice } from "@/lib/formatPrice";
import { getBuyerCountrySync } from "@/lib/buyerContext";
import { getCurrencyForCountry } from "@/lib/countryCode";

export const SleepBundleBenefits = () => {
  const [bundleProduct, setBundleProduct] = useState<ShopifyProduct | null>(null);
  const [individualProducts, setIndividualProducts] = useState<{
    pillow: ShopifyProduct | null;
    kneePillow: ShopifyProduct | null;
    sleepMask: ShopifyProduct | null;
  }>({ pillow: null, kneePillow: null, sleepMask: null });
  const buyerCountry = getBuyerCountrySync() || 'US';
  const buyerCurrency = getCurrencyForCountry(buyerCountry);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const products = await fetchProducts();
        
        const bundle = products.find(
          (p: ShopifyProduct) => p.node.handle === "rise-by-night™-complete-sleep-bundle"
        );
        const pillow = products.find(
          (p: ShopifyProduct) => p.node.handle === "risebynight-ergonomic-sleep-pillow"
        );
        const kneePillow = products.find(
          (p: ShopifyProduct) => p.node.handle === "risebynight-ergonomic-knee-pillow"
        );
        const sleepMask = products.find(
          (p: ShopifyProduct) => p.node.handle === "risebynight-silk-deep-sleep-mask"
        );
        
        setBundleProduct(bundle || null);
        setIndividualProducts({ pillow: pillow || null, kneePillow: kneePillow || null, sleepMask: sleepMask || null });
      } catch (error) {
        console.error("Failed to load products:", error);
      }
    };
    loadProducts();
  }, []);

  // Helper to get currency with buyer-country-aware override
  const getCurrency = (shopifyCurrency: string | undefined) => {
    const currency = shopifyCurrency || 'USD';
    return currency === 'USD' ? buyerCurrency : currency;
  };

  // Calculate prices from Shopify data
  const bundlePrice = bundleProduct?.node.variants.edges[0]?.node.price;
  const bundlePriceFormatted = bundlePrice 
    ? formatPrice(bundlePrice.amount, getCurrency(bundlePrice.currencyCode))
    : formatPrice("109.99", "EUR");

  // Calculate "regular price" (sum of individual products)
  const pillowPrice = individualProducts.pillow?.node.variants.edges[0]?.node.price;
  const kneePillowPrice = individualProducts.kneePillow?.node.variants.edges[0]?.node.price;
  const sleepMaskPrice = individualProducts.sleepMask?.node.variants.edges[0]?.node.price;
  
  const regularPriceTotal = (
    (pillowPrice ? parseFloat(pillowPrice.amount) : 79.99) +
    (kneePillowPrice ? parseFloat(kneePillowPrice.amount) : 39.99) +
    (sleepMaskPrice ? parseFloat(sleepMaskPrice.amount) : 29.99)
  );
  
  const bundlePriceNum = bundlePrice ? parseFloat(bundlePrice.amount) : 109.99;
  const savings = Math.round(regularPriceTotal - bundlePriceNum);
  
  const currency = getCurrency(bundlePrice?.currencyCode);
  const regularPriceFormatted = formatPrice(regularPriceTotal.toString(), currency);

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
      name: "Silk Deep Sleep Mask",
      benefits: [
        "Blocks 100% of light for deeper sleep",
        "Pure mulberry silk gentle on skin",
        "Contoured design doesn't press on eyes",
        "Hypoallergenic and breathable material",
      ],
    },
  ];

  return (
    <section className="py-6 md:py-10 lg:py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-4 md:mb-8">
            <h2 className="text-xl md:text-3xl lg:text-4xl font-bold mb-2">What's Included in Your Bundle</h2>
            <p className="text-sm md:text-base lg:text-lg text-muted-foreground">
              Three premium products working together to transform your sleep
            </p>
          </div>

          <div className="space-y-4 md:space-y-6 lg:space-y-8">
            {products.map((product, index) => (
              <div
                key={index}
                className={`flex flex-col ${
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                } gap-4 md:gap-6 items-center bg-muted/30 p-4 md:p-6 rounded-lg`}
              >
                <div className="flex-1">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full max-w-xs md:max-w-md mx-auto h-40 md:h-52 object-contain"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="flex-1 space-y-2 md:space-y-3">
                  <h3 className="text-lg md:text-xl lg:text-2xl font-bold">{product.name}</h3>
                  <ul className="space-y-1 md:space-y-2">
                    {product.benefits.map((benefit, benefitIndex) => (
                      <li key={benefitIndex} className="flex items-start gap-2">
                        <span className="text-primary text-base md:text-lg mt-0.5">✓</span>
                        <span className="text-xs md:text-sm text-muted-foreground">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 md:mt-8 bg-primary/5 border-2 border-primary rounded-lg p-4 md:p-6 text-center">
            <h3 className="text-lg md:text-xl lg:text-2xl font-bold mb-1 md:mb-2">
              Save {formatPrice(savings.toString(), currency)} with the Bundle
            </h3>
            <p className="text-sm md:text-base text-muted-foreground mb-1">
              Regular price: <span className="line-through">{regularPriceFormatted}</span>
            </p>
            <p className="text-xl md:text-2xl lg:text-3xl font-bold text-primary">
              Bundle price: {bundlePriceFormatted}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
