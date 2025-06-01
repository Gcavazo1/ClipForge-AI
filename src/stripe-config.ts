export const STRIPE_PRODUCTS = {
  FREE: {
    id: 'prod_SQ7ELpGvxxfEeP',
    priceId: 'price_1RVH0MJ7uLzhznneUtQb3DqH',
    name: 'ClipForge Free',
    description: 'Limited features, watermarked exports',
    mode: 'payment' as const,
    features: [
      '5 clips per month',
      'Basic analytics',
      'Standard support',
      'Watermarked exports',
      '720p max resolution',
    ],
  },
  PRO: {
    id: 'prod_SQ7GoNdSjEPMa1',
    priceId: 'price_1RVH1eJ7uLzhznneayR2Mm0d',
    name: 'ClipForge Pro',
    description: 'Unlimited clips, brand removal, premium templates, analytics',
    mode: 'subscription' as const,
    features: [
      'Unlimited clips',
      'Brand removal',
      'Premium templates',
      'Advanced analytics',
      'Priority support',
      '1080p max resolution',
      'Prophetic Mode access',
    ],
  },
} as const;

export type StripePlan = keyof typeof STRIPE_PRODUCTS;
export type StripeProduct = typeof STRIPE_PRODUCTS[StripePlan];