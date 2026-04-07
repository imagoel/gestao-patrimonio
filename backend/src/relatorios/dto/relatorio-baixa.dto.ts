import { MotivoBaixa } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RelatorioBaixaDto {
  @IsOptional()
  @IsString()
  secretariaId?: string;

  @IsOptional()
  @IsEnum(MotivoBaixa)
  motivo?: MotivoBaixa;
}
