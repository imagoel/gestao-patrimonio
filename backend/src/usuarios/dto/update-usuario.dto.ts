import { Perfil } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  senha?: string;

  @IsOptional()
  @IsEnum(Perfil)
  perfil?: Perfil;

  @IsOptional()
  @IsString()
  secretariaId?: string | null;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
