import { ForbiddenException } from '@nestjs/common';
import { Perfil } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';

export function canEmitRelatorios(user: AuthenticatedUser) {
  return (
    user.perfil === Perfil.ADMINISTRADOR ||
    user.perfil === Perfil.TECNICO_PATRIMONIO
  );
}

export function assertCanEmitRelatorios(user: AuthenticatedUser) {
  if (!canEmitRelatorios(user)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para emitir relatorios.',
    );
  }
}
