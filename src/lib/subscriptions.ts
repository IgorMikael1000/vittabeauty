export const subscriptionPlans = {
  MONTHLY: {
    name: "Mensal",
    amount: 19.9,
    durationDays: 30,
    priceLabel: "R$ 19,90",
    intervalLabel: "30 dias de acesso · pagamento único",
    savings: null,
  },
  SEMIANNUAL: {
    name: "Semestral",
    amount: 99.5,
    durationDays: 180,
    priceLabel: "R$ 99,50",
    intervalLabel: "180 dias de acesso · pagamento único",
    savings: "Ganhe 1 mês · economize R$ 19,90",
  },
  ANNUAL: {
    name: "Anual",
    amount: 209.9,
    durationDays: 365,
    priceLabel: "R$ 209,90",
    intervalLabel: "365 dias de acesso · pagamento único",
    savings: "Melhor Custo Benefício · economize R$ 28,90 e ganhe 45 dias",
  },
} as const;

export type SubscriptionPlanType = keyof typeof subscriptionPlans;

export function isSubscriptionPlanType(
  value: string,
): value is SubscriptionPlanType {
  return Object.hasOwn(subscriptionPlans, value);
}
