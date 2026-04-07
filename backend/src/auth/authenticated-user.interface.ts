import { Perfil } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  nome: string;
  email: string;
  perfil: Perfil;
  secretariaId: string | null;
}
