export interface SecretariaOption {
  id: string
  sigla: string
  nomeCompleto: string
}

export interface SecretariaItem extends SecretariaOption {
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export interface SecretariaListResponse {
  items: SecretariaItem[]
  total: number
  page: number
  limit: number
}

export interface SecretariaFilters {
  page?: number
  limit?: number
  search?: string
  ativo?: boolean
}

export interface SecretariaFormValues {
  sigla: string
  nomeCompleto: string
  ativo?: boolean
}
