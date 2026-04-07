import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateResponsavelDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  cargo?: string | null;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  setor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  contato?: string | null;

  @IsOptional()
  @IsString()
  secretariaId?: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
