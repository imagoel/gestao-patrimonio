import { StatusMovimentacao } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RelatorioMovimentacaoDto {
  @IsOptional()
  @IsString()
  secretariaId?: string;

  @IsOptional()
  @IsEnum(StatusMovimentacao)
  status?: StatusMovimentacao;
}
