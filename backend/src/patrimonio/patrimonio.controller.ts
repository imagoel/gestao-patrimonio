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
import { CreatePatrimonioDto } from './dto/create-patrimonio.dto';
import { PatrimonioFilterDto } from './dto/patrimonio-filter.dto';
import { UpdatePatrimonioDto } from './dto/update-patrimonio.dto';
import { PatrimonioService } from './patrimonio.service';

@Controller('patrimonios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatrimonioController {
  constructor(private readonly patrimonioService: PatrimonioService) {}

  @Get('options')
  findOptions(@CurrentUser() actor: AuthenticatedUser) {
    return this.patrimonioService.findOptions(actor);
  }

  @Get()
  findAll(
    @Query() filters: PatrimonioFilterDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.patrimonioService.findAll(filters, actor);
  }

  @Get(':id/historico')
  findHistorico(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.patrimonioService.findHistorico(id, actor);
  }

  @Get(':id/avaliacao-valor-atual')
  findAvaliacaoValorAtual(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.patrimonioService.findAvaliacaoValorAtual(id, actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.patrimonioService.findOne(id, actor);
  }

  @Post()
  @Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  create(
    @Body() dto: CreatePatrimonioDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.patrimonioService.create(dto, actor);
  }

  @Patch(':id')
  @Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePatrimonioDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.patrimonioService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.patrimonioService.remove(id, actor);
  }

  @Post(':id/aplicar-valor-estimado')
  @Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  aplicarValorEstimado(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.patrimonioService.aplicarValorAtualEstimado(id, actor);
  }
}
