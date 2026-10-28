export const cnpjValidation = (cnpj: string): boolean => {
  if (!/^\d{14}$/.test(cnpj)) {
    return false;
  }

  if (/^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const calcularDigito = (base: string, pesos: number[]): number => {
    const soma = pesos.reduce(
      (total, peso, index) => total + Number(base[index]) * peso,
      0,
    );

    const resto = soma % 11;

    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiroDigito = calcularDigito(
    cnpj.slice(0, 12),
    [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  if (primeiroDigito !== Number(cnpj[12])) {
    return false;
  }

  const segundoDigito = calcularDigito(
    cnpj.slice(0, 13),
    [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return segundoDigito === Number(cnpj[13]);
};
