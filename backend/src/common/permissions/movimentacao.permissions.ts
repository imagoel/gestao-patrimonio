import { ForbiddenException } from '@nestjs/common';
import { Perfil, Prisma } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';

interface MovimentacaoScopeTarget {
  secretariaOrigemId: string;
  secretariaDestinoId: string;
}

interface PatrimonioOrigemTarget {
  secretariaAtualId: string;
}

export function canManageMovimentacao(user: AuthenticatedUser) {
  return (
    user.perfil === Perfil.ADMINISTRADOR ||
    user.perfil === Perfil.TECNICO_PATRIMONIO
  );
}

export function assertCanManageMovimentacao(user: AuthenticatedUser) {
  if (!canManageMovimentacao(user)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para validar movimentacoes.',
    );
  }
}

export function canCreateMovimentacao(
  user: AuthenticatedUser,
  patrimonio: PatrimonioOrigemTarget,
) {
  if (canManageMovimentacao(user)) {
    return true;
  }

  return (
    user.perfil === Perfil.CHEFE_SETOR &&
    Boolean(user.secretariaId) &&
    user.secretariaId === patrimonio.secretariaAtualId
  );
}

export function assertCanCreateMovimentacao(
  user: AuthenticatedUser,
  patrimonio: PatrimonioOrigemTarget,
) {
  if (!canCreateMovimentacao(user, patrimonio)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para solicitar esta movimentacao.',
    );
  }
}

export function canAccessMovimentacao(
  user: AuthenticatedUser,
  movimentacao: MovimentacaoScopeTarget,
) {
  if (canManageMovimentacao(user)) {
    return true;
  }

  if (
    (user.perfil === Perfil.CHEFE_SETOR ||
      user.perfil === Perfil.USUARIO_CONSULTA) &&
    user.secretariaId
  ) {
    return (
      user.secretariaId === movimentacao.secretariaOrigemId ||
      user.secretariaId === movimentacao.secretariaDestinoId
    );
  }

  return false;
}

export function assertCanAccessMovimentacao(
  user: AuthenticatedUser,
  movimentacao: MovimentacaoScopeTarget,
) {
  if (!canAccessMovimentacao(user, movimentacao)) {
    throw new ForbiddenException(
      'Voce nao possui acesso a esta movimentacao.',
    );
  }
}

export function canConfirmarEntrega(
  user: AuthenticatedUser,
  movimentacao: MovimentacaoScopeTarget,
) {
  if (canManageMovimentacao(user)) {
    return true;
  }

  return (
    user.perfil === Perfil.CHEFE_SETOR &&
    Boolean(user.secretariaId) &&
    user.secretariaId === movimentacao.secretariaOrigemId
  );
}

export function assertCanConfirmarEntrega(
  user: AuthenticatedUser,
  movimentacao: MovimentacaoScopeTarget,
) {
  if (!canConfirmarEntrega(user, movimentacao)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para confirmar a entrega desta movimentacao.',
    );
  }
}

export function canConfirmarRecebimento(
  user: AuthenticatedUser,
  movimentacao: MovimentacaoScopeTarget,
) {
  if (canManageMovimentacao(user)) {
    return true;
  }

  return (
    user.perfil === Perfil.CHEFE_SETOR &&
    Boolean(user.secretariaId) &&
    user.secretariaId === movimentacao.secretariaDestinoId
  );
}

export function assertCanConfirmarRecebimento(
  user: AuthenticatedUser,
  movimentacao: MovimentacaoScopeTarget,
) {
  if (!canConfirmarRecebimento(user, movimentacao)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para confirmar o recebimento desta movimentacao.',
    );
  }
}

export function buildMovimentacaoScopeWhere(
  user: AuthenticatedUser,
): Prisma.MovimentacaoWhereInput {
  if (canManageMovimentacao(user)) {
    return {};
  }

  if (
    (user.perfil === Perfil.CHEFE_SETOR ||
      user.perfil === Perfil.USUARIO_CONSULTA) &&
    user.secretariaId
  ) {
    return {
      OR: [
        {
          secretariaOrigemId: user.secretariaId,
        },
        {
          secretariaDestinoId: user.secretariaId,
        },
      ],
    };
  }

  throw new ForbiddenException(
    'Voce nao possui escopo de consulta de movimentacoes.',
  );
}

export function buildMovimentacaoCreatePatrimonioScopeWhere(
  user: AuthenticatedUser,
): Prisma.PatrimonioWhereInput {
  if (canManageMovimentacao(user)) {
    return {};
  }

  if (user.perfil === Perfil.CHEFE_SETOR && user.secretariaId) {
    return {
      secretariaAtualId: user.secretariaId,
    };
  }

  throw new ForbiddenException(
    'Voce nao possui escopo para solicitar movimentacoes.',
  );
}
