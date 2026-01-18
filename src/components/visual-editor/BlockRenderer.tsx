/**
 * Dynamic Block Renderer
 * Renders blocks from configuration, mapping to actual React components
 */

import { Suspense, lazy, ComponentType } from 'react';
import { BlockWrapper } from './BlockWrapper';
import type { BlockConfig, BlockType } from '@/types/visual-editor';

// Import all block components
import { Hero } from '@/components/Hero';
import { Features } from '@/components/Features';
import { ProductBenefitsSection } from '@/components/ProductBenefitsSection';
import { PainReliefSection } from '@/components/PainReliefSection';
import { ChiropractorEndorsement } from '@/components/ChiropractorEndorsement';
import { LookInside } from '@/components/LookInside';
import { ReviewsWall } from '@/components/reviews';
import { ProductFAQSection } from '@/components/ProductFAQSection';
import { GuaranteeSection } from '@/components/GuaranteeSection';
import { StickyAddToCart } from '@/components/StickyAddToCart';
import { HeroVariantB } from '@/components/ab-testing/HeroVariantB';
import { SocialProofToast, MorningPuffinessSection } from '@/components/ab-testing/UrgencyElements';
import { ExitIntentPopup } from '@/components/ab-testing/ExitIntentPopup';
import { CountdownTimerDisplay } from '@/components/CountdownTimer';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Gift, ShoppingCart } from 'lucide-react';

// Lazy loaded components
const VideoSection = lazy(() =>
  import('@/components/VideoSection').then((mod) => ({ default: mod.VideoSection }))
);
const ReviewsSection = lazy(() =>
  import('@/components/ReviewsSection').then((mod) => ({ default: mod.ReviewsSection }))
);

// Loading fallback
const SectionFallback = () => (
  <div className="py-8 flex items-center justify-center text-sm text-muted-foreground">
    Loading...
  </div>
);

// Custom block components
function QuizCTA({ variant = 'default' }: { variant?: 'default' | 'subtle' }) {
  return (
    <div
      className={`py-4 md:py-6 lg:py-10 ${
        variant === 'subtle'
          ? 'bg-muted/20'
          : 'bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5'
      }`}
    >
      <div className="container mx-auto px-4 text-center">
        <p className="text-xs md:text-sm text-muted-foreground mb-1">
          Not sure if this pillow is right for you?
        </p>
        <h3 className="text-base md:text-lg lg:text-xl font-semibold mb-2">
          Take the Science-Backed Assessment
        </h3>
        <p className="text-xs md:text-sm text-muted-foreground mb-3 max-w-md mx-auto">
          Discover your sleeper type and get personalized recommendations.
        </p>
        <Link to="/sleep-quiz">
          <Button size="default" className="rounded-full px-6 h-9 md:h-10 text-sm">
            Start the Assessment <ArrowRight className="w-3 h-3 md:w-4 md:h-4 ml-1.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

function InlineCTA({
  headline = '🎁 Limited Time: FREE Sleep Mask Included',
  subtext = 'Order now and save + get free shipping',
  buttonText = 'Claim Your Pillow Now',
}: {
  headline?: string;
  subtext?: string;
  buttonText?: string;
}) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="py-6 bg-gradient-to-r from-green-50 to-emerald-50 border-y border-green-200">
      <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-center gap-4">
        <div className="text-center md:text-left">
          <p className="text-sm font-semibold text-green-800">{headline}</p>
          <p className="text-xs text-green-600">{subtext}</p>
        </div>
        <Button
          onClick={scrollToTop}
          className="bg-green-600 hover:bg-green-500 text-white font-bold px-6"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          {buttonText}
        </Button>
      </div>
    </div>
  );
}

function FinalCTA({
  headline = "Don't Wake Up With Neck Pain Tomorrow",
  buttonText = 'Claim Your Pillow + FREE Gift',
  showCountdown = true,
}: {
  headline?: string;
  buttonText?: string;
  showCountdown?: boolean;
}) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="py-10 bg-gradient-to-r from-red-600 via-red-500 to-orange-500 text-white">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">{headline}</h2>
        <p className="text-white/90 mb-4 max-w-xl mx-auto">
          Join 250,000+ happy sleepers who transformed their sleep with our ergonomic pillow.
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={scrollToTop}
            className="bg-white text-red-600 hover:bg-gray-100 font-bold text-lg px-8 h-14"
          >
            <Gift className="h-5 w-5 mr-2" />
            {buttonText}
          </Button>
          {showCountdown && (
            <div className="flex items-center gap-2 text-sm text-white/80">
              <span>⏰ Offer ends in:</span>
              <CountdownTimerDisplay />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CustomTextBlock({
  headline = 'Your Headline Here',
  body = 'Add your custom content here.',
  alignment = 'center',
  backgroundColor = 'transparent',
}: {
  headline?: string;
  body?: string;
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
}) {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment];

  return (
    <section className="py-12" style={{ backgroundColor }}>
      <div className={`container mx-auto px-4 ${alignClass}`}>
        <h2 className="text-2xl md:text-3xl font-bold mb-4">{headline}</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">{body}</p>
      </div>
    </section>
  );
}

function CustomBannerBlock({
  text = '🎁 Special Offer!',
  backgroundColor = '#16a34a',
  textColor = '#ffffff',
}: {
  text?: string;
  backgroundColor?: string;
  textColor?: string;
}) {
  return (
    <div
      className="py-3 text-center font-semibold"
      style={{ backgroundColor, color: textColor }}
    >
      {text}
    </div>
  );
}

// Component registry
const componentRegistry: Record<BlockType, ComponentType<any>> = {
  hero: Hero,
  features: Features,
  benefits: ProductBenefitsSection,
  'pain-relief': PainReliefSection,
  chiropractor: ChiropractorEndorsement,
  'look-inside': LookInside,
  'reviews-wall': ReviewsWall,
  'reviews-carousel': ReviewsSection,
  video: VideoSection,
  faq: ProductFAQSection,
  guarantee: GuaranteeSection,
  'quiz-cta': QuizCTA,
  'inline-cta': InlineCTA,
  'final-cta': FinalCTA,
  'social-proof-toast': SocialProofToast,
  'exit-popup': ExitIntentPopup,
  'sticky-cart': StickyAddToCart,
  'morning-puffiness': MorningPuffinessSection,
  'custom-text': CustomTextBlock,
  'custom-banner': CustomBannerBlock,
};

// Lazy components that need Suspense
const lazyComponents: BlockType[] = ['video', 'reviews-carousel'];

interface BlockRendererProps {
  blocks: BlockConfig[];
  isEditing?: boolean;
}

export function BlockRenderer({ blocks, isEditing = false }: BlockRendererProps) {
  const sortedBlocks = [...blocks]
    .filter((b) => b.visible || isEditing)
    .sort((a, b) => a.order - b.order);

  return (
    <>
      {sortedBlocks.map((block, index) => {
        const Component = componentRegistry[block.type];
        if (!Component) {
          console.warn(`[BlockRenderer] Unknown block type: ${block.type}`);
          return null;
        }

        const isLazy = lazyComponents.includes(block.type);
        const content = isLazy ? (
          <Suspense fallback={<SectionFallback />}>
            <Component {...block.props} />
          </Suspense>
        ) : (
          <Component {...block.props} />
        );

        if (isEditing) {
          return (
            <BlockWrapper key={block.id} block={block} index={index}>
              {content}
            </BlockWrapper>
          );
        }

        return <div key={block.id}>{content}</div>;
      })}
    </>
  );
}

/**
 * Convert a page's hardcoded structure to BlockConfig array
 */
export function pageToBlocks(pageHandle: string): BlockConfig[] {
  // Default product page structure
  const defaultProductBlocks: BlockConfig[] = [
    { id: 'hero-1', type: 'hero', visible: true, order: 0, props: {} },
    { id: 'features-1', type: 'features', visible: true, order: 1, props: {} },
    { id: 'benefits-1', type: 'benefits', visible: true, order: 2, props: {} },
    { id: 'pain-relief-1', type: 'pain-relief', visible: true, order: 3, props: {} },
    { id: 'chiro-1', type: 'chiropractor', visible: true, order: 4, props: {} },
    { id: 'look-inside-1', type: 'look-inside', visible: true, order: 5, props: {} },
    {
      id: 'reviews-wall-1',
      type: 'reviews-wall',
      visible: true,
      order: 6,
      props: { productHandle: pageHandle, productName: 'Ergonomic Cervical Pillow' },
    },
    { id: 'video-1', type: 'video', visible: true, order: 7, props: {} },
    { id: 'reviews-carousel-1', type: 'reviews-carousel', visible: true, order: 8, props: {} },
    { id: 'faq-1', type: 'faq', visible: true, order: 9, props: {} },
    { id: 'quiz-cta-1', type: 'quiz-cta', visible: true, order: 10, props: { variant: 'default' } },
    { id: 'guarantee-1', type: 'guarantee', visible: true, order: 11, props: {} },
    { id: 'sticky-cart-1', type: 'sticky-cart', visible: true, order: 12, props: { productType: pageHandle } },
  ];

  return defaultProductBlocks;
}
