export const subscriptionPlans = {
  MONTHLY: {
    name: "Mensal",
    amount: 19.9,
    frequency: 1,
    durationDays: 30,
    priceLabel: "R$ 19,90",
    intervalLabel: "por mês",
    savings: null,
  },
  SEMIANNUAL: {
    name: "Semestral",
    amount: 109.9,
    frequency: 6,
    durationDays: 180,
    priceLabel: "R$ 109,90",
    intervalLabel: "a cada 6 meses",
    savings: "Economize R$ 9,50",
  },
  ANNUAL: {
    name: "Anual",
    amount: 209.9,
    frequency: 12,
    durationDays: 365,
    priceLabel: "R$ 209,90",
    intervalLabel: "por ano",
    savings: "Melhor Custo Benefício · economize R$ 28,90",
  },
} as const;

export type SubscriptionPlanType = keyof typeof subscriptionPlans;

export function isSubscriptionPlanType(
  value: string,
): value is SubscriptionPlanType {
  return Object.hasOwn(subscriptionPlans, value);
}
