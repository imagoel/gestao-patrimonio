import { IsEnum, IsOptional, IsString } from 'class-validator';
import { StatusMovimentacao } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class MovimentacaoFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  patrimonioId?: string;

  @IsOptional()
  @IsString()
  secretariaId?: string;

  @IsOptional()
  @IsEnum(StatusMovimentacao)
  status?: StatusMovimentacao;
}
