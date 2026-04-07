import { ForbiddenException } from '@nestjs/common';
import { Perfil } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';

export function canViewAuditoria(user: AuthenticatedUser) {
  return (
    user.perfil === Perfil.ADMINISTRADOR ||
    user.perfil === Perfil.TECNICO_PATRIMONIO
  );
}

export function assertCanViewAuditoria(user: AuthenticatedUser) {
  if (!canViewAuditoria(user)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para consultar auditoria.',
    );
  }
}
