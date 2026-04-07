import { StatusItem } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RelatorioPatrimonioDto {
  @IsOptional()
  @IsString()
  secretariaAtualId?: string;

  @IsOptional()
  @IsString()
  responsavelAtualId?: string;

  @IsOptional()
  @IsEnum(StatusItem)
  status?: StatusItem;

  @IsOptional()
  @IsString()
  localizacaoAtual?: string;
}
