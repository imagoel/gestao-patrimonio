import { ForbiddenException } from '@nestjs/common';
import { Prisma, Perfil } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';

interface PatrimonioScopeTarget {
  secretariaAtualId: string;
}

export function canManagePatrimonio(user: AuthenticatedUser) {
  return (
    user.perfil === Perfil.ADMINISTRADOR ||
    user.perfil === Perfil.TECNICO_PATRIMONIO
  );
}

export function assertCanManagePatrimonio(user: AuthenticatedUser) {
  if (!canManagePatrimonio(user)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para alterar patrimonio.',
    );
  }
}

export function canAccessPatrimonio(
  user: AuthenticatedUser,
  patrimonio: PatrimonioScopeTarget,
) {
  if (canManagePatrimonio(user)) {
    return true;
  }

  if (
    (user.perfil === Perfil.CHEFE_SETOR ||
      user.perfil === Perfil.USUARIO_CONSULTA) &&
    user.secretariaId
  ) {
    return user.secretariaId === patrimonio.secretariaAtualId;
  }

  return false;
}

export function assertCanAccessPatrimonio(
  user: AuthenticatedUser,
  patrimonio: PatrimonioScopeTarget,
) {
  if (!canAccessPatrimonio(user, patrimonio)) {
    throw new ForbiddenException(
      'Voce nao possui acesso a este patrimonio.',
    );
  }
}

export function buildPatrimonioScopeWhere(
  user: AuthenticatedUser,
): Prisma.PatrimonioWhereInput {
  if (canManagePatrimonio(user)) {
    return {};
  }

  if (
    (user.perfil === Perfil.CHEFE_SETOR ||
      user.perfil === Perfil.USUARIO_CONSULTA) &&
    user.secretariaId
  ) {
    return {
      secretariaAtualId: user.secretariaId,
    };
  }

  throw new ForbiddenException(
    'Voce nao possui escopo de consulta de patrimonio.',
  );
}
