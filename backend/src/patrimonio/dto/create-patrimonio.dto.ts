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

export class CreatePatrimonioDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  item!: string;

  @IsString()
  @Matches(/^\d{5}$/)
  tombo!: string;

  @IsString()
  secretariaAtualId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(255)
  localizacaoAtual!: string;

  @IsString()
  responsavelAtualId!: string;

  @IsEnum(EstadoConservacao)
  estadoConservacao!: EstadoConservacao;

  @IsOptional()
  @IsEnum(StatusItem)
  status?: StatusItem;

  @IsOptional()
  @IsString()
  fornecedorId?: string | null;

  @IsEnum(TipoEntrada)
  tipoEntrada!: TipoEntrada;

  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  valorOriginal!: number;

  @IsOptional()
  @Transform(({ value }) => (value === '' || value === null ? undefined : Number(value)))
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
