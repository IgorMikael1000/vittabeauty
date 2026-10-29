const percentRates = {
  creditCardCash: 498,
  creditCardTwoToSix: 299,
  creditCardSevenToTwelve: 309,
  standard: 499,
  pix: 99,
} as const;

const fixedFees = {
  ticket: 349,
} as const;

export type PaymentFeeEstimate = {
  label: string;
  feeCents: number;
};

function normalize(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? "";
}

export function estimateMercadoPagoFee({
  amountCents,
  paymentMethod,
  paymentType,
  installments,
}: {
  amountCents: number;
  paymentMethod: string | null;
  paymentType: string | null;
  installments: number | null;
}): PaymentFeeEstimate | null {
  const method = normalize(paymentMethod);
  const type = normalize(paymentType);

  if (amountCents < 0) {
    throw new Error("Payment amount cannot be negative.");
  }

  let label: string;
  let rate: number | undefined;

  if (method === "openfinance" || type === "openfinance") {
    label = "Open Finance";
    rate = 0;
  } else if (method === "pix" || type === "pix") {
    label = "Pix";
    rate = percentRates.pix;
  } else if (
    type === "ticket" ||
    method === "ticket" ||
    method.includes("boleto")
  ) {
    return { label: "Boleto", feeCents: fixedFees.ticket };
  } else if (type === "credit_card") {
    if (!installments || installments < 1 || installments > 12) {
      return null;
    }

    label = "Cartão de crédito";
    rate =
      installments === 1
        ? percentRates.creditCardCash
        : installments <= 6
          ? percentRates.creditCardTwoToSix
          : percentRates.creditCardSevenToTwelve;
  } else if (type === "account_money" || method === "account_money") {
    label = "Saldo Mercado Pago";
    rate = percentRates.standard;
  } else if (
    type === "consumer_credits" ||
    method === "consumer_credits"
  ) {
    label = "Linha de Crédito";
    rate = percentRates.standard;
  } else if (type === "prepaid_card" || method === "prepaid_card") {
    label = "Cartão pré-pago";
    rate = percentRates.standard;
  } else {
    return null;
  }

  return {
    label,
    feeCents: Math.round((amountCents * rate) / 10_000),
  };
}

const paymentTypeLabels: Record<string, string> = {
  account_money: "Saldo Mercado Pago",
  bank_transfer: "Transferência bancária",
  consumer_credits: "Linha de Crédito",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  digital_wallet: "Carteira digital",
  openfinance: "Open Finance",
  pix: "Pix",
  prepaid_card: "Cartão pré-pago",
  ticket: "Boleto",
};

const paymentMethodLabels: Record<string, string> = {
  account_money: "Saldo Mercado Pago",
  consumer_credits: "Linha de Crédito",
  openfinance: "Open Finance",
  pix: "Pix",
  prepaid_card: "Cartão pré-pago",
};

const cardBrands: Record<string, string> = {
  amex: "American Express",
  cabal: "Cabal",
  diners: "Diners Club",
  elo: "Elo",
  hipercard: "Hipercard",
  master: "Mastercard",
  mastercard: "Mastercard",
  visa: "Visa",
};

function humanize(value: string): string {
  return value
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function describeMercadoPagoPayment({
  paymentMethod,
  paymentType,
}: {
  paymentMethod: string | null;
  paymentType: string | null;
}): string {
  const method = normalize(paymentMethod);
  const type = normalize(paymentType);
  const methodLabel = paymentMethodLabels[method];

  if (methodLabel) return methodLabel;
  if (type === "credit_card" && method) {
    return `Cartão de crédito · ${cardBrands[method] ?? humanize(method)}`;
  }
  if (type) return paymentTypeLabels[type] ?? humanize(type);
  if (method) return humanize(method);
  return "Não informado";
}

export function describePaymentInstallments({
  installments,
  paymentType,
}: {
  installments: number | null;
  paymentType: string | null;
}): string | null {
  if (normalize(paymentType) !== "credit_card") return null;
  if (installments === null) return "Parcelamento não informado";
  if (installments === 1) return "À vista";
  return `${installments} parcelas`;
}
