import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMovimentacaoDto {
  @IsString()
  patrimonioId!: string;

  @IsString()
  secretariaDestinoId!: string;

  @IsOptional()
  @IsString()
  responsavelDestinoId?: string | null;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  localizacaoDestino!: string;

  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  motivo!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string | null;
}
