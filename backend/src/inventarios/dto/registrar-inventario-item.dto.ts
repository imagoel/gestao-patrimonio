import { StatusInventarioItem } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RegistrarInventarioItemDto {
  @IsEnum(StatusInventarioItem)
  status!: StatusInventarioItem;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
