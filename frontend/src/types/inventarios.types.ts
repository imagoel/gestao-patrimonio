import type { AuthUser } from './auth.types'
import type {
  StatusInventario,
  StatusInventarioItem,
  StatusItem,
} from './enums'
import type { ResponsavelOption } from './responsaveis.types'
import type { SecretariaOption } from './secretarias.types'

export interface InventarioResumo {
  totalItens: number
  pendentes: number
  localizados: number
  naoLocalizados: number
}

export interface InventarioItemResumo {
  id: string
  titulo: string
  secretariaId: string
  status: StatusInventario
  observacoes: string | null
  criadoPorId: string
  concluidoPorId: string | null
  iniciadoEm: string
  concluidoEm: string | null
  createdAt: string
  updatedAt: string
  secretaria: SecretariaOption
  criadoPor: AuthUser
  concluidoPor: AuthUser | null
  _count: {
    itens: number
  }
  resumo: InventarioResumo
}

export interface InventarioListResponse {
  items: InventarioItemResumo[]
  total: number
  page: number
  limit: number
}

export interface InventarioFilters {
  page?: number
  limit?: number
  search?: string
  secretariaId?: string
  status?: StatusInventario
}

export interface InventarioItemRegistro {
  id: string
  inventarioId: string
  patrimonioId: string
  tomboSnapshot: string
  itemSnapshot: string
  localizacaoSnapshot: string
  responsavelSnapshotNome: string
  status: StatusInventarioItem
  observacoes: string | null
  registradoPorId: string | null
  registradoEm: string | null
  createdAt: string
  updatedAt: string
  registradoPor: AuthUser | null
  patrimonio: {
    id: string
    tombo: string
    item: string
    status: StatusItem
    secretariaAtualId: string
    localizacaoAtual: string
    responsavelAtualId: string
    secretariaAtual: SecretariaOption
    responsavelAtual: Pick<ResponsavelOption, 'id' | 'nome' | 'setor'>
  }
}

export interface InventarioItemsResponse {
  items: InventarioItemRegistro[]
  total: number
  page: number
  limit: number
  inventarioStatus: StatusInventario
}

export interface InventarioItemFilters {
  page?: number
  limit?: number
  search?: string
  status?: StatusInventarioItem
}

export interface InventarioOptionsResponse {
  secretarias: SecretariaOption[]
  status: StatusInventario[]
  itemStatus: StatusInventarioItem[]
}

export interface CreateInventarioValues {
  titulo: string
  secretariaId: string
  observacoes?: string | null
}

export interface RegistrarInventarioItemValues {
  status: StatusInventarioItem
  observacoes?: string | null
}
