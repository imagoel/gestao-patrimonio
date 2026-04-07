import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AnalisarMovimentacaoDto {
  @IsIn(['APROVAR', 'REJEITAR'])
  decisao!: 'APROVAR' | 'REJEITAR';

  @ValidateIf((dto: AnalisarMovimentacaoDto) => dto.decisao === 'REJEITAR')
  @IsString()
  @MinLength(5)
  @MaxLength(1000)
  justificativaRejeicao?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string | null;
}
