import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { Perfil } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let authService: AuthService;
  let usuariosService: jest.Mocked<UsuariosService>;
  let jwtService: jest.Mocked<JwtService>;
  let auditoriaService: jest.Mocked<AuditoriaService>;

  beforeEach(() => {
    usuariosService = {
      findByEmailForAuth: jest.fn(),
      findActiveAuthById: jest.fn(),
    } as unknown as jest.Mocked<UsuariosService>;

    jwtService = {
      signAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    auditoriaService = {
      registrar: jest.fn(),
    } as unknown as jest.Mocked<AuditoriaService>;

    authService = new AuthService(usuariosService, jwtService, auditoriaService);
  });

  it('valida um usuario ativo com senha correta', async () => {
    const senha = 'Admin@123';

    usuariosService.findByEmailForAuth.mockResolvedValue({
      id: 'user-1',
      nome: 'Administrador',
      email: 'admin@patrimonio.local',
      perfil: Perfil.ADMINISTRADOR,
      ativo: true,
      secretariaId: null,
      senhaHash: await bcrypt.hash(senha, 4),
    });

    await expect(
      authService.validateUser('admin@patrimonio.local', senha),
    ).resolves.toEqual({
      id: 'user-1',
      nome: 'Administrador',
      email: 'admin@patrimonio.local',
      perfil: Perfil.ADMINISTRADOR,
      secretariaId: null,
    });
  });

  it('bloqueia login com usuario inativo', async () => {
    usuariosService.findByEmailForAuth.mockResolvedValue({
      id: 'user-1',
      nome: 'Consulta',
      email: 'consulta@patrimonio.local',
      perfil: Perfil.USUARIO_CONSULTA,
      ativo: false,
      secretariaId: null,
      senhaHash: await bcrypt.hash('123456', 4),
    });

    await expect(
      authService.validateUser('consulta@patrimonio.local', '123456'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('emite token e registra auditoria no login', async () => {
    jwtService.signAsync.mockResolvedValue('jwt-token');
    auditoriaService.registrar.mockResolvedValue({ id: 'audit-1' } as never);

    const user = {
      id: 'user-1',
      nome: 'Administrador',
      email: 'admin@patrimonio.local',
      perfil: Perfil.ADMINISTRADOR,
      secretariaId: null,
    };

    await expect(authService.login(user)).resolves.toEqual({
      accessToken: 'jwt-token',
      user,
    });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
      nome: user.nome,
      perfil: user.perfil,
      secretariaId: user.secretariaId,
    });

    expect(auditoriaService.registrar).toHaveBeenCalledWith({
      entidade: 'Usuario',
      entidadeId: user.id,
      acao: 'LOGIN',
      usuarioId: user.id,
      contexto: {
        email: user.email,
        perfil: user.perfil,
      },
    });
  });
});
