import { IsOptional, IsString } from 'class-validator';

export class RelatorioAuditoriaMovimentacaoDto {
  @IsOptional()
  @IsString()
  acao?: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;

  @IsOptional()
  @IsString()
  patrimonioId?: string;
}
