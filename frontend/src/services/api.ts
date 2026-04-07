import axios from 'axios'
import { AUTH_STORAGE_KEY } from '../types/auth.types'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY)

  if (!rawSession) {
    return config
  }

  try {
    const session = JSON.parse(rawSession) as { token?: string | null }

    if (session.token) {
      config.headers.Authorization = `Bearer ${session.token}`
    }
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      window.localStorage.removeItem(AUTH_STORAGE_KEY)

      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }

    return Promise.reject(error)
  },
)
