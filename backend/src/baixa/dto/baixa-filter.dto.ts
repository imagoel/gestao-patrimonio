import { MotivoBaixa } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class BaixaFilterDto extends PaginationDto {
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
  @IsEnum(MotivoBaixa)
  motivo?: MotivoBaixa;
}
