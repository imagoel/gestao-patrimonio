import { ForbiddenException } from '@nestjs/common';
import { Perfil } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';

const ALLOWED_PERFIS = [
  Perfil.ADMINISTRADOR,
  Perfil.TECNICO_PATRIMONIO,
  Perfil.CHEFE_SETOR,
  Perfil.USUARIO_CONSULTA,
] as const;

export function canViewNotificacoes(user: AuthenticatedUser) {
  return ALLOWED_PERFIS.includes(user.perfil);
}

export function assertCanViewNotificacoes(user: AuthenticatedUser) {
  if (!canViewNotificacoes(user)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para acessar notificacoes.',
    );
  }
}
