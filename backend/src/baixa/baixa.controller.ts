import {
  Body,
  Controller,
  Get,
  Param,
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
import { BaixaFilterDto } from './dto/baixa-filter.dto';
import { CreateBaixaDto } from './dto/create-baixa.dto';
import { BaixaService } from './baixa.service';

@Controller('baixas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BaixaController {
  constructor(private readonly baixaService: BaixaService) {}

  @Get('options')
  @Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  findOptions() {
    return this.baixaService.findOptions();
  }

  @Get()
  findAll(
    @Query() filters: BaixaFilterDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.baixaService.findAll(filters, actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.baixaService.findOne(id, actor);
  }

  @Post()
  @Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  create(
    @Body() dto: CreateBaixaDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.baixaService.create(dto, actor);
  }
}
