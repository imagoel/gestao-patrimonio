import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateInventarioDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  titulo!: string;

  @IsString()
  @IsNotEmpty()
  secretariaId!: string;

  @IsOptional()
  @IsString()
  observacoes?: string;
}
