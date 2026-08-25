export function formatScoreOutOf100(value: number): string {
  return `${Math.round(value)} / 100`;
}

export function formatRussianDecimal(value: number, fractionDigits = 1): string {
  return value.toFixed(fractionDigits).replace(".", ",");
}

export function formatPublicRating(value: number | null): string {
  if (value === null) return "Пока нет оценок";
  return `${formatRussianDecimal(value)} / 10`;
}
