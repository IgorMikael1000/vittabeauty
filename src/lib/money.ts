export function decimalToCents(value: { toString(): string } | string): number {
  const text = value.toString();
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(text);

  if (!match) {
    throw new Error(`Invalid monetary decimal "${text}".`);
  }

  const [, sign, wholeText, fractionText = ""] = match;
  const cents = Number(wholeText) * 100 + Number(fractionText.padEnd(2, "0"));

  if (!Number.isSafeInteger(cents)) {
    throw new Error("Monetary amount exceeds the supported precision.");
  }

  return sign ? -cents : cents;
}

export function sumMoneyCents(
  amounts: Array<{ amount: { toString(): string } }>,
): number {
  return amounts.reduce(
    (total, entry) => total + decimalToCents(entry.amount),
    0,
  );
}
