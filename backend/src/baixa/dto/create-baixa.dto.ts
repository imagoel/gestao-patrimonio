import { MotivoBaixa } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateBaixaDto {
  @IsString()
  patrimonioId!: string;

  @IsEnum(MotivoBaixa)
  motivo!: MotivoBaixa;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  observacoes?: string | null;
}
