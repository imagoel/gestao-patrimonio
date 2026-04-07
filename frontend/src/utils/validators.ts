import type { Rule } from 'antd/es/form'

export const emailRule: Rule = {
  type: 'email',
  message: 'Informe um e-mail valido.',
}

export function normalizeTomboInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 5)
}
