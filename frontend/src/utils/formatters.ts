import dayjs from 'dayjs'

const dateFormatter = 'DD/MM/YYYY'
const dateTimeFormatter = 'DD/MM/YYYY HH:mm'
const dateTimeWithSecondsFormatter = 'DD/MM/YYYY HH:mm:ss'
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export function formatCurrency(value: number | string) {
  return currencyFormatter.format(Number(value))
}

export function formatDate(value: string) {
  return dayjs(value).format(dateFormatter)
}

export function formatDateTime(value: string) {
  return dayjs(value).format(dateTimeFormatter)
}

export function formatDateTimeWithSeconds(value: string) {
  return dayjs(value).format(dateTimeWithSecondsFormatter)
}
