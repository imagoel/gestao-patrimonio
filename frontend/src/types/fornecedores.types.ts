export interface FornecedorOption {
  id: string
  nome: string
  cpfCnpj: string | null
}

export interface FornecedorItem extends FornecedorOption {
  telefone: string | null
  email: string | null
  observacoes: string | null
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export interface FornecedorListResponse {
  items: FornecedorItem[]
  total: number
  page: number
  limit: number
}

export interface FornecedorFilters {
  page?: number
  limit?: number
  search?: string
  cpfCnpj?: string
  email?: string
  ativo?: boolean
}

export interface FornecedorFormValues {
  nome: string
  cpfCnpj?: string | null
  telefone?: string | null
  email?: string | null
  observacoes?: string | null
  ativo?: boolean
}
