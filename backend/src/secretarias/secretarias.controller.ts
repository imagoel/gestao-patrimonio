import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Perfil } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateSecretariaDto } from './dto/create-secretaria.dto';
import { SecretariaFilterDto } from './dto/secretaria-filter.dto';
import { UpdateSecretariaDto } from './dto/update-secretaria.dto';
import { SecretariasService } from './secretarias.service';

@Controller('secretarias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecretariasController {
  constructor(private readonly secretariasService: SecretariasService) {}

  @Get('options')
  findOptions() {
    return this.secretariasService.findOptions();
  }

  @Get()
  @Roles(Perfil.ADMINISTRADOR)
  findAll(@Query() filters: SecretariaFilterDto) {
    return this.secretariasService.findAll(filters);
  }

  @Get(':id')
  @Roles(Perfil.ADMINISTRADOR)
  findOne(@Param('id') id: string) {
    return this.secretariasService.findOne(id);
  }

  @Post()
  @Roles(Perfil.ADMINISTRADOR)
  create(
    @Body() dto: CreateSecretariaDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.secretariasService.create(dto, actor);
  }

  @Patch(':id')
  @Roles(Perfil.ADMINISTRADOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateSecretariaDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.secretariasService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(Perfil.ADMINISTRADOR)
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.secretariasService.remove(id, actor);
  }
}
