import { ForbiddenException } from '@nestjs/common';
import { Perfil, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';

const DASHBOARD_ALLOWED_PERFIS = [
  Perfil.ADMINISTRADOR,
  Perfil.TECNICO_PATRIMONIO,
  Perfil.CHEFE_SETOR,
  Perfil.USUARIO_CONSULTA,
] as const;

export function canViewDashboard(user: AuthenticatedUser) {
  return DASHBOARD_ALLOWED_PERFIS.includes(user.perfil);
}

export function assertCanViewDashboard(user: AuthenticatedUser) {
  if (!canViewDashboard(user)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para acessar o dashboard.',
    );
  }
}

export function isDashboardGlobalScope(user: AuthenticatedUser) {
  return (
    user.perfil === Perfil.ADMINISTRADOR ||
    user.perfil === Perfil.TECNICO_PATRIMONIO
  );
}

export function buildDashboardBaixaWhere(
  user: AuthenticatedUser,
): Prisma.BaixaPatrimonialWhereInput {
  if (isDashboardGlobalScope(user)) {
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
    'Voce nao possui escopo de consulta para o dashboard.',
  );
}
