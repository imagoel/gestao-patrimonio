export interface ImportacaoPatrimonioErro {
  linha: number
  item?: string
  tombo?: string
  mensagem: string
}

export interface ImportacaoPatrimonioResponse {
  arquivo: string
  processadoEm: string
  totalLinhas: number
  importados: number
  falhas: number
  erros: ImportacaoPatrimonioErro[]
}
