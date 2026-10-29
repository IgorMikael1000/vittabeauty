import { describe, expect, it } from "vitest";
import {
  describeMercadoPagoPayment,
  describePaymentInstallments,
  estimateMercadoPagoFee,
} from "./mercadopago-fees";

describe("estimateMercadoPagoFee", () => {
  it.each([
    [1, 498, 1990],
    [2, 299, 1990],
    [6, 299, 1990],
    [7, 309, 1990],
    [12, 309, 1990],
  ])("estimates %s credit-card installment fee", (installments, rate, amount) => {
    expect(
      estimateMercadoPagoFee({
        amountCents: amount,
        paymentMethod: "visa",
        paymentType: "credit_card",
        installments,
      })?.feeCents,
    ).toBe(Math.round((amount * rate) / 10_000));
  });

  it.each([
    ["account_money", "account_money", 499, "Saldo Mercado Pago"],
    ["consumer_credits", "consumer_credits", 499, "Linha de Crédito"],
    ["prepaid_card", "prepaid_card", 499, "Cartão pré-pago"],
    ["pix", "bank_transfer", 99, "Pix"],
  ])("estimates the %s payment fee", (method, type, rate, label) => {
    expect(
      estimateMercadoPagoFee({
        amountCents: 10_000,
        paymentMethod: method,
        paymentType: type,
        installments: null,
      }),
    ).toEqual({ label, feeCents: rate });
  });

  it("uses the fixed boleto fee", () => {
    expect(
      estimateMercadoPagoFee({
        amountCents: 1990,
        paymentMethod: "bolbradesco",
        paymentType: "ticket",
        installments: null,
      }),
    ).toEqual({ label: "Boleto", feeCents: 349 });
  });

  it("recognizes zero-fee Open Finance", () => {
    expect(
      estimateMercadoPagoFee({
        amountCents: 1990,
        paymentMethod: "openfinance",
        paymentType: "bank_transfer",
        installments: null,
      }),
    ).toEqual({ label: "Open Finance", feeCents: 0 });
  });

  it.each([
    { paymentMethod: "visa", paymentType: "credit_card", installments: null },
    { paymentMethod: "visa", paymentType: "credit_card", installments: 13 },
    { paymentMethod: "elo", paymentType: "debit_card", installments: 1 },
    { paymentMethod: "unknown", paymentType: "unknown", installments: null },
  ])("does not invent a fee for unsupported payment details", (payment) => {
    expect(
      estimateMercadoPagoFee({
        amountCents: 10_000,
        ...payment,
      }),
    ).toBeNull();
  });
});

describe("payment descriptions", () => {
  it("shows the card brand and installment count", () => {
    expect(
      describeMercadoPagoPayment({
        paymentMethod: "master",
        paymentType: "credit_card",
      }),
    ).toBe("Cartão de crédito · Mastercard");
    expect(
      describePaymentInstallments({
        installments: 3,
        paymentType: "credit_card",
      }),
    ).toBe("3 parcelas");
  });

  it("identifies a cash payment without showing an installment count", () => {
    expect(
      describePaymentInstallments({
        installments: 1,
        paymentType: "credit_card",
      }),
    ).toBe("À vista");
    expect(
      describePaymentInstallments({
        installments: 1,
        paymentType: "pix",
      }),
    ).toBeNull();
  });
});
