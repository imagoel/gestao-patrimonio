import { ForbiddenException } from '@nestjs/common';
import { Perfil } from '@prisma/client';
import type { AuthenticatedUser } from '../../auth/authenticated-user.interface';

interface InventarioScopeTarget {
  secretariaId: string;
}

export function canManageInventario(user: AuthenticatedUser) {
  return (
    user.perfil === Perfil.ADMINISTRADOR ||
    user.perfil === Perfil.TECNICO_PATRIMONIO
  );
}

export function assertCanManageInventario(user: AuthenticatedUser) {
  if (!canManageInventario(user)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para gerenciar inventarios.',
    );
  }
}

export function canViewInventario(
  user: AuthenticatedUser,
  inventario: InventarioScopeTarget,
) {
  if (canManageInventario(user)) {
    return true;
  }

  if (
    (user.perfil === Perfil.CHEFE_SETOR ||
      user.perfil === Perfil.USUARIO_CONSULTA) &&
    user.secretariaId
  ) {
    return user.secretariaId === inventario.secretariaId;
  }

  return false;
}

export function assertCanViewInventario(
  user: AuthenticatedUser,
  inventario: InventarioScopeTarget,
) {
  if (!canViewInventario(user, inventario)) {
    throw new ForbiddenException(
      'Voce nao possui acesso a este inventario.',
    );
  }
}

export function canRegisterInventarioItem(
  user: AuthenticatedUser,
  inventario: InventarioScopeTarget,
) {
  if (canManageInventario(user)) {
    return true;
  }

  return (
    user.perfil === Perfil.CHEFE_SETOR &&
    Boolean(user.secretariaId) &&
    user.secretariaId === inventario.secretariaId
  );
}

export function assertCanRegisterInventarioItem(
  user: AuthenticatedUser,
  inventario: InventarioScopeTarget,
) {
  if (!canRegisterInventarioItem(user, inventario)) {
    throw new ForbiddenException(
      'Voce nao possui permissao para registrar itens deste inventario.',
    );
  }
}

