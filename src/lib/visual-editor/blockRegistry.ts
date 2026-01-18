/**
 * Block Registry
 * Maps all available components to editable blocks
 */

import type { BlockDefinition, BlockType } from '@/types/visual-editor';

export const blockRegistry: Record<BlockType, BlockDefinition> = {
  'hero': {
    type: 'hero',
    name: 'Hero Section',
    description: 'Main product hero with images, pricing, and CTA',
    icon: 'Star',
    category: 'hero',
    component: 'Hero',
    defaultProps: {
      showFreeGift: true,
      showCountdown: false,
      variant: 'default',
    },
    editableProps: [
      { key: 'showFreeGift', label: 'Show Free Gift', type: 'boolean', defaultValue: true },
      { key: 'showCountdown', label: 'Show Countdown Timer', type: 'boolean', defaultValue: false },
      { key: 'variant', label: 'Hero Variant', type: 'select', defaultValue: 'default', options: [
        { label: 'Default', value: 'default' },
        { label: 'Urgency (Variant B)', value: 'urgency' },
      ]},
    ],
  },
  
  'features': {
    type: 'features',
    name: 'Features Section',
    description: 'Product features with images and comparison',
    icon: 'Check',
    category: 'content',
    component: 'Features',
    defaultProps: {},
    editableProps: [],
  },
  
  'benefits': {
    type: 'benefits',
    name: 'Benefits Section',
    description: 'Product benefits with icons and descriptions',
    icon: 'Award',
    category: 'content',
    component: 'ProductBenefitsSection',
    defaultProps: {},
    editableProps: [],
  },
  
  'pain-relief': {
    type: 'pain-relief',
    name: 'Pain Relief Section',
    description: 'Highlights pain relief benefits',
    icon: 'Heart',
    category: 'content',
    component: 'PainReliefSection',
    defaultProps: {},
    editableProps: [],
  },
  
  'chiropractor': {
    type: 'chiropractor',
    name: 'Chiropractor Endorsement',
    description: 'Professional endorsement section',
    icon: 'UserCheck',
    category: 'social-proof',
    component: 'ChiropractorEndorsement',
    defaultProps: {},
    editableProps: [],
  },
  
  'look-inside': {
    type: 'look-inside',
    name: 'Look Inside',
    description: 'Internal product construction details',
    icon: 'Eye',
    category: 'content',
    component: 'LookInside',
    defaultProps: {},
    editableProps: [],
  },
  
  'reviews-wall': {
    type: 'reviews-wall',
    name: 'Reviews Wall',
    description: 'Customer reviews grid',
    icon: 'MessageSquare',
    category: 'social-proof',
    component: 'ReviewsWall',
    defaultProps: {
      productHandle: 'ergonomic-pillow',
      productName: 'Ergonomic Cervical Pillow',
    },
    editableProps: [
      { key: 'productHandle', label: 'Product Handle', type: 'text', defaultValue: 'ergonomic-pillow' },
      { key: 'productName', label: 'Product Name', type: 'text', defaultValue: 'Ergonomic Cervical Pillow' },
    ],
  },
  
  'reviews-carousel': {
    type: 'reviews-carousel',
    name: 'Reviews Carousel',
    description: 'Scrolling customer testimonials',
    icon: 'Star',
    category: 'social-proof',
    component: 'ReviewsSection',
    defaultProps: {},
    editableProps: [],
    isLazy: true,
  },
  
  'video': {
    type: 'video',
    name: 'Video Section',
    description: 'Product video showcase',
    icon: 'Play',
    category: 'content',
    component: 'VideoSection',
    defaultProps: {},
    editableProps: [],
    isLazy: true,
  },
  
  'faq': {
    type: 'faq',
    name: 'FAQ Section',
    description: 'Frequently asked questions accordion',
    icon: 'HelpCircle',
    category: 'content',
    component: 'ProductFAQSection',
    defaultProps: {},
    editableProps: [],
  },
  
  'guarantee': {
    type: 'guarantee',
    name: 'Guarantee Section',
    description: 'Money-back guarantee messaging',
    icon: 'Shield',
    category: 'conversion',
    component: 'GuaranteeSection',
    defaultProps: {},
    editableProps: [],
  },
  
  'quiz-cta': {
    type: 'quiz-cta',
    name: 'Quiz CTA',
    description: 'Sleep quiz call-to-action',
    icon: 'ClipboardList',
    category: 'conversion',
    component: 'QuizCTA',
    defaultProps: {
      variant: 'default',
    },
    editableProps: [
      { key: 'variant', label: 'Style', type: 'select', defaultValue: 'default', options: [
        { label: 'Default', value: 'default' },
        { label: 'Subtle', value: 'subtle' },
      ]},
    ],
  },
  
  'inline-cta': {
    type: 'inline-cta',
    name: 'Inline CTA Banner',
    description: 'Promotional banner between sections',
    icon: 'Megaphone',
    category: 'conversion',
    component: 'InlineCTA',
    defaultProps: {
      headline: '🎁 Limited Time: FREE Sleep Mask Included',
      subtext: 'Order now and save + get free shipping',
      buttonText: 'Claim Your Pillow Now',
    },
    editableProps: [
      { key: 'headline', label: 'Headline', type: 'text', defaultValue: '🎁 Limited Time: FREE Sleep Mask Included' },
      { key: 'subtext', label: 'Subtext', type: 'text', defaultValue: 'Order now and save + get free shipping' },
      { key: 'buttonText', label: 'Button Text', type: 'text', defaultValue: 'Claim Your Pillow Now' },
    ],
  },
  
  'final-cta': {
    type: 'final-cta',
    name: 'Final CTA Section',
    description: 'Strong urgency CTA before guarantee',
    icon: 'Zap',
    category: 'conversion',
    component: 'FinalCTA',
    defaultProps: {
      headline: "Don't Wake Up With Neck Pain Tomorrow",
      buttonText: 'Claim Your Pillow + FREE Gift',
      showCountdown: true,
    },
    editableProps: [
      { key: 'headline', label: 'Headline', type: 'text', defaultValue: "Don't Wake Up With Neck Pain Tomorrow" },
      { key: 'buttonText', label: 'Button Text', type: 'text', defaultValue: 'Claim Your Pillow + FREE Gift' },
      { key: 'showCountdown', label: 'Show Countdown', type: 'boolean', defaultValue: true },
    ],
  },
  
  'social-proof-toast': {
    type: 'social-proof-toast',
    name: 'Social Proof Toast',
    description: 'Purchase notifications popup',
    icon: 'Bell',
    category: 'conversion',
    component: 'SocialProofToast',
    defaultProps: {
      interval: 30000,
    },
    editableProps: [
      { key: 'interval', label: 'Interval (ms)', type: 'number', defaultValue: 30000 },
    ],
  },
  
  'exit-popup': {
    type: 'exit-popup',
    name: 'Exit Intent Popup',
    description: 'Popup when user tries to leave',
    icon: 'AlertTriangle',
    category: 'conversion',
    component: 'ExitIntentPopup',
    defaultProps: {},
    editableProps: [],
  },
  
  'sticky-cart': {
    type: 'sticky-cart',
    name: 'Sticky Add to Cart',
    description: 'Fixed bottom add to cart bar',
    icon: 'ShoppingCart',
    category: 'utility',
    component: 'StickyAddToCart',
    defaultProps: {
      productType: 'ergonomic-pillow',
    },
    editableProps: [
      { key: 'productType', label: 'Product Type', type: 'text', defaultValue: 'ergonomic-pillow' },
    ],
  },
  
  'morning-puffiness': {
    type: 'morning-puffiness',
    name: 'Morning Puffiness Section',
    description: 'Variant B specific urgency section',
    icon: 'Sun',
    category: 'conversion',
    component: 'MorningPuffinessSection',
    defaultProps: {},
    editableProps: [],
  },
  
  'custom-text': {
    type: 'custom-text',
    name: 'Custom Text Block',
    description: 'Add custom headline and text',
    icon: 'Type',
    category: 'content',
    component: 'CustomTextBlock',
    defaultProps: {
      headline: 'Your Headline Here',
      body: 'Add your custom content here.',
      alignment: 'center',
      backgroundColor: 'transparent',
    },
    editableProps: [
      { key: 'headline', label: 'Headline', type: 'text', defaultValue: 'Your Headline Here' },
      { key: 'body', label: 'Body Text', type: 'textarea', defaultValue: 'Add your custom content here.' },
      { key: 'alignment', label: 'Alignment', type: 'select', defaultValue: 'center', options: [
        { label: 'Left', value: 'left' },
        { label: 'Center', value: 'center' },
        { label: 'Right', value: 'right' },
      ]},
      { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: 'transparent' },
    ],
  },
  
  'custom-banner': {
    type: 'custom-banner',
    name: 'Custom Banner',
    description: 'Colored banner with custom text',
    icon: 'Flag',
    category: 'conversion',
    component: 'CustomBannerBlock',
    defaultProps: {
      text: '🎁 Special Offer!',
      backgroundColor: '#16a34a',
      textColor: '#ffffff',
    },
    editableProps: [
      { key: 'text', label: 'Banner Text', type: 'text', defaultValue: '🎁 Special Offer!' },
      { key: 'backgroundColor', label: 'Background Color', type: 'color', defaultValue: '#16a34a' },
      { key: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#ffffff' },
    ],
  },
};

export const blockCategories = [
  { id: 'hero', name: 'Hero', icon: 'Star' },
  { id: 'content', name: 'Content', icon: 'FileText' },
  { id: 'social-proof', name: 'Social Proof', icon: 'Users' },
  { id: 'conversion', name: 'Conversion', icon: 'TrendingUp' },
  { id: 'utility', name: 'Utility', icon: 'Settings' },
] as const;

export function getBlocksByCategory(category: string): BlockDefinition[] {
  return Object.values(blockRegistry).filter(block => block.category === category);
}

export function getBlockDefinition(type: BlockType): BlockDefinition | undefined {
  return blockRegistry[type];
}
