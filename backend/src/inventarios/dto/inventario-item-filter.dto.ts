import { Transform } from 'class-transformer';
import { StatusInventarioItem } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class InventarioItemFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value || undefined)
  @IsEnum(StatusInventarioItem)
  status?: StatusInventarioItem;
}
