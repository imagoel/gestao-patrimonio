import { createContext, useState } from 'react'
import type { PropsWithChildren } from 'react'
import { AUTH_STORAGE_KEY } from '../types/auth.types'
import type { AuthSession } from '../types/auth.types'

export interface AuthContextValue {
  session: AuthSession
  isAuthenticated: boolean
  login: (session: AuthSession) => void
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)

const emptySession: AuthSession = {
  token: null,
  user: null,
}

function readStoredSession(): AuthSession {
  const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY)

  if (!rawSession) {
    return emptySession
  }

  try {
    return JSON.parse(rawSession) as AuthSession
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY)

    return emptySession
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession>(() => readStoredSession())

  function login(nextSession: AuthSession) {
    setSession(nextSession)
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
  }

  function logout() {
    setSession(emptySession)
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: Boolean(session.token),
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
