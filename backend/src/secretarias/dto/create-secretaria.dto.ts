import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSecretariaDto {
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  sigla!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(255)
  nomeCompleto!: string;

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
