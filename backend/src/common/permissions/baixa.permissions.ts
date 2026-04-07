import { ForbiddenException } from '@nestjs/common';
import { Perfil, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';

interface BaixaScopeTarget {
  patrimonio: {
    secretariaAtualId: string;
  };
}

export function canManageBaixa(user: AuthenticatedUser) {
  return (
    user.perfil === Perfil.ADMINISTRADOR ||
    user.perfil === Perfil.TECNICO_PATRIMONIO
  );
}

export function assertCanManageBaixa(user: AuthenticatedUser) {
  if (!canManageBaixa(user)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para registrar baixa patrimonial.',
    );
  }
}

export function canAccessBaixa(
  user: AuthenticatedUser,
  baixa: BaixaScopeTarget,
) {
  if (canManageBaixa(user)) {
    return true;
  }

  if (
    (user.perfil === Perfil.CHEFE_SETOR ||
      user.perfil === Perfil.USUARIO_CONSULTA) &&
    user.secretariaId
  ) {
    return user.secretariaId === baixa.patrimonio.secretariaAtualId;
  }

  return false;
}

export function assertCanAccessBaixa(
  user: AuthenticatedUser,
  baixa: BaixaScopeTarget,
) {
  if (!canAccessBaixa(user, baixa)) {
    throw new ForbiddenException(
      'Voce nao possui acesso a esta baixa patrimonial.',
    );
  }
}

export function buildBaixaScopeWhere(
  user: AuthenticatedUser,
): Prisma.BaixaPatrimonialWhereInput {
  if (canManageBaixa(user)) {
    return {};
  }

  if (
    (user.perfil === Perfil.CHEFE_SETOR ||
      user.perfil === Perfil.USUARIO_CONSULTA) &&
    user.secretariaId
  ) {
    return {
      patrimonio: {
        secretariaAtualId: user.secretariaId,
      },
    };
  }

  throw new ForbiddenException(
    'Voce nao possui escopo de consulta de baixas patrimoniais.',
  );
}
