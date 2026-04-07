import { Perfil } from '../types/enums'
import { useAuth } from './useAuth'

export function usePermissao() {
  const { session } = useAuth()

  function hasPerfil(...perfis: Perfil[]) {
    const perfilAtual = session.user?.perfil

    if (!perfilAtual) {
      return false
    }

    return perfis.includes(perfilAtual)
  }

  return {
    hasPerfil,
  }
}
