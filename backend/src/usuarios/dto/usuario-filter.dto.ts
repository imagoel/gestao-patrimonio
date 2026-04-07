import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { Perfil } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class UsuarioFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Perfil)
  perfil?: Perfil;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) {
      return true;
    }

    if (value === 'false' || value === false) {
      return false;
    }

    return value;
  })
  @IsBoolean()
  ativo?: boolean;

  @IsOptional()
  @IsString()
  secretariaId?: string;
}
