import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AuditoriaFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  entidade?: string;

  @IsOptional()
  @IsString()
  acao?: string;

  @IsOptional()
  @IsString()
  usuarioId?: string;
}
