import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateFornecedorDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  nome?: string;

  @IsOptional()
  @IsString()
  @MaxLength(18)
  cpfCnpj?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  telefone?: string | null;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string | null;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
