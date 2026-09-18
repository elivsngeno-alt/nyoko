export type PricingPlan = {
    name: string;
    eyebrow: string;
    description: string;
    featured?: boolean;
};

export const pricingPlans: PricingPlan[] = [
    { name: 'Free', eyebrow: 'START HERE', description: 'Explore the platform and selected free bots.' },
    { name: 'Pro', eyebrow: 'FOR ACTIVE TRADERS', description: 'Advanced tools and workflows for focused analysis.', featured: true },
    { name: 'Premium', eyebrow: 'FULL PLATFORM', description: 'Access the complete trading workspace.' },
];

export const pricingAvailabilityLabel = 'Coming Soon';
