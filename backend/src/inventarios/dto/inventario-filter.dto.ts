import { Transform } from 'class-transformer';
import { StatusInventario } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class InventarioFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  secretariaId?: string;

  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsEnum(StatusInventario)
  status?: StatusInventario;
}
