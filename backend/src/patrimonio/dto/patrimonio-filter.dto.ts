import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import {
  EstadoConservacao,
  StatusItem,
  TipoEntrada,
} from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class PatrimonioFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  secretariaAtualId?: string;

  @IsOptional()
  @IsString()
  responsavelAtualId?: string;

  @IsOptional()
  @IsString()
  fornecedorId?: string;

  @IsOptional()
  @IsEnum(StatusItem)
  status?: StatusItem;

  @IsOptional()
  @IsEnum(EstadoConservacao)
  estadoConservacao?: EstadoConservacao;

  @IsOptional()
  @IsEnum(TipoEntrada)
  tipoEntrada?: TipoEntrada;

  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/)
  tombo?: string;
}
