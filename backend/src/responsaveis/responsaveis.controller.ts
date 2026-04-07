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
import { CreateResponsavelDto } from './dto/create-responsavel.dto';
import { ResponsavelFilterDto } from './dto/responsavel-filter.dto';
import { UpdateResponsavelDto } from './dto/update-responsavel.dto';
import { ResponsaveisService } from './responsaveis.service';

@Controller('responsaveis')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResponsaveisController {
  constructor(private readonly responsaveisService: ResponsaveisService) {}

  @Get('options')
  findOptions() {
    return this.responsaveisService.findOptions();
  }

  @Get()
  @Roles(Perfil.ADMINISTRADOR)
  findAll(@Query() filters: ResponsavelFilterDto) {
    return this.responsaveisService.findAll(filters);
  }

  @Get(':id')
  @Roles(Perfil.ADMINISTRADOR)
  findOne(@Param('id') id: string) {
    return this.responsaveisService.findOne(id);
  }

  @Post()
  @Roles(Perfil.ADMINISTRADOR)
  create(
    @Body() dto: CreateResponsavelDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.responsaveisService.create(dto, actor);
  }

  @Patch(':id')
  @Roles(Perfil.ADMINISTRADOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateResponsavelDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.responsaveisService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(Perfil.ADMINISTRADOR)
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.responsaveisService.remove(id, actor);
  }
}
