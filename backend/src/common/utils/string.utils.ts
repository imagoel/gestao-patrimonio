export function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

export function normalizeRequiredText(value: string) {
  return value.trim();
}

export function normalizeUppercaseText(value: string) {
  return normalizeRequiredText(value).toUpperCase();
}

export function normalizeDisplayText(
  value?: string | null,
  fallback = 'Nao informado',
) {
  return normalizeOptionalText(value) ?? fallback;
}
