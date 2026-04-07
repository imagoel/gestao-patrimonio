import { Perfil } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUsuarioDto {
  @IsString()
  @MinLength(3)
  nome!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  senha!: string;

  @IsEnum(Perfil)
  perfil!: Perfil;

  @IsOptional()
  @IsString()
  secretariaId?: string | null;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
