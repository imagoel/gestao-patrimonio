import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConfirmarEntregaDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string | null;
}
