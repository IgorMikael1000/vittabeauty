export function getCpfDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatCpf(value: string): string {
  const digits = getCpfDigits(value);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function isValidCpf(value: string): boolean {
  const cpf = getCpfDigits(value);

  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const calculateDigit = (length: number): number => {
    let total = 0;

    for (let index = 0; index < length; index += 1) {
      total += Number(cpf[index]) * (length + 1 - index);
    }

    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return (
    calculateDigit(9) === Number(cpf[9]) &&
    calculateDigit(10) === Number(cpf[10])
  );
}

export function formatBrazilianPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits.length ? `(${digits}` : "";
  }

  const areaCode = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  const prefixLength = digits.length > 10 ? 5 : 4;

  if (subscriber.length <= prefixLength) {
    return `(${areaCode}) ${subscriber}`;
  }

  return `(${areaCode}) ${subscriber.slice(0, prefixLength)}-${subscriber.slice(prefixLength)}`;
}

export function formatAccountPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) {
    return digits.length ? `(${digits}` : "";
  }

  const areaCode = digits.slice(0, 2);
  const subscriber = digits.slice(2);

  if (digits.length > 10) {
    if (subscriber.length <= 1) {
      return `(${areaCode}) ${subscriber}`;
    }

    return `(${areaCode}) ${subscriber[0]} ${subscriber.slice(1, 5)}${
      subscriber.length > 5 ? `-${subscriber.slice(5)}` : ""
    }`;
  }

  return `(${areaCode}) ${subscriber.slice(0, 4)}${
    subscriber.length > 4 ? `-${subscriber.slice(4)}` : ""
  }`;
}

export function getPasswordRequirements(password: string) {
  return [
    { label: "Pelo menos 8 caracteres", met: [...password].length >= 8 },
    { label: "Uma letra maiúscula", met: /\p{Lu}/u.test(password) },
    { label: "Uma letra minúscula", met: /\p{Ll}/u.test(password) },
    { label: "Um número", met: /\p{N}/u.test(password) },
    {
      label: "Um caractere especial",
      met: /[^\p{L}\p{N}]/u.test(password),
    },
  ] as const;
}

export function hasValidProfessionalName(name: string): boolean {
  return name.trim().split(/\s+/).filter(Boolean).length >= 2;
}
