import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  EstadoConservacao,
  StatusItem,
  TipoEntrada,
} from '@prisma/client';

export class UpdatePatrimonioDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  item?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/)
  tombo?: string;

  @IsOptional()
  @IsString()
  secretariaAtualId?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  localizacaoAtual?: string;

  @IsOptional()
  @IsString()
  responsavelAtualId?: string;

  @IsOptional()
  @IsEnum(EstadoConservacao)
  estadoConservacao?: EstadoConservacao;

  @IsOptional()
  @IsEnum(StatusItem)
  status?: StatusItem;

  @IsOptional()
  @IsString()
  fornecedorId?: string | null;

  @IsOptional()
  @IsEnum(TipoEntrada)
  tipoEntrada?: TipoEntrada;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorOriginal?: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? null : Number(value)))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorAtual?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descricao?: string | null;

  @IsOptional()
  @IsDateString()
  dataAquisicao?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string | null;
}
