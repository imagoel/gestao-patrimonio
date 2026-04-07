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
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuarioFilterDto } from './dto/usuario-filter.dto';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Perfil.ADMINISTRADOR)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get('options')
  findOptions() {
    return this.usuariosService.findOptions();
  }

  @Get()
  findAll(@Query() filters: UsuarioFilterDto) {
    return this.usuariosService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usuariosService.findOne(id);
  }

  @Post()
  create(
    @Body() dto: CreateUsuarioDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usuariosService.create(dto, actor);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUsuarioDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usuariosService.update(id, dto, actor);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.usuariosService.remove(id, actor);
  }
}
