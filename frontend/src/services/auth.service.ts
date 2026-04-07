import type { LoginPayload, LoginResponse, MeResponse } from '../types/auth.types'
import { api } from './api'

export const authService = {
  async login(payload: LoginPayload) {
    const response = await api.post<LoginResponse>('/auth/login', payload)

    return response.data
  },

  async me() {
    const response = await api.get<MeResponse>('/auth/me')

    return response.data
  },
}
