import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuthenticatedUser } from './authenticated-user.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async validateUser(email: string, senha: string): Promise<AuthenticatedUser> {
    const usuario = await this.usuariosService.findByEmailForAuth(email);

    if (!usuario?.ativo) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);

    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais invalidas.');
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil,
      secretariaId: usuario.secretariaId,
    };
  }

  async login(user: AuthenticatedUser) {
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      nome: user.nome,
      perfil: user.perfil,
      secretariaId: user.secretariaId,
    });

    await this.auditoriaService.registrar({
      entidade: 'Usuario',
      entidadeId: user.id,
      acao: 'LOGIN',
      usuarioId: user.id,
      contexto: {
        email: user.email,
        perfil: user.perfil,
      },
    });

    return {
      accessToken,
      user,
    };
  }
}
