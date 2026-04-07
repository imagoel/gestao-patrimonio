import { Perfil } from './enums'

export const AUTH_STORAGE_KEY = 'patrimonio.session'

export interface AuthUser {
  id: string
  nome: string
  email: string
  perfil: Perfil
  secretariaId: string | null
}

export interface AuthSession {
  token: string | null
  user: AuthUser | null
}

export interface LoginPayload {
  email: string
  senha: string
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface MeResponse {
  user: AuthUser
}

export interface HealthStatusResponse {
  status: 'ok'
  service: string
  timestamp: string
}
