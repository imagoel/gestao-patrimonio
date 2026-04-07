const DEFAULT_LOCALE = 'pt-BR';
const DEFAULT_TIME_ZONE = 'America/Sao_Paulo';

type DateInput = Date | string | number;

function resolveDate(value: DateInput) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError('Data invalida recebida para formatacao.');
  }

  return date;
}

export function formatDatePtBr(
  value: DateInput,
  timeZone: string = DEFAULT_TIME_ZONE,
) {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    dateStyle: 'short',
    timeZone,
  }).format(resolveDate(value));
}

export function formatDateTimePtBr(
  value: DateInput,
  timeZone: string = DEFAULT_TIME_ZONE,
) {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone,
  }).format(resolveDate(value));
}

export function buildIsoDateStamp(value: DateInput = new Date()) {
  return resolveDate(value).toISOString().slice(0, 10);
}
