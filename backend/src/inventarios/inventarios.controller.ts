import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateInventarioDto } from './dto/create-inventario.dto';
import { InventarioItemFilterDto } from './dto/inventario-item-filter.dto';
import { InventarioFilterDto } from './dto/inventario-filter.dto';
import { RegistrarInventarioItemDto } from './dto/registrar-inventario-item.dto';
import { InventariosService } from './inventarios.service';

@Controller('inventarios')
@UseGuards(JwtAuthGuard)
export class InventariosController {
  constructor(private readonly inventariosService: InventariosService) {}

  @Get('options')
  findOptions(@CurrentUser() actor: AuthenticatedUser) {
    return this.inventariosService.findOptions(actor);
  }

  @Get()
  findAll(
    @Query() filters: InventarioFilterDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.inventariosService.findAll(filters, actor);
  }

  @Post()
  create(
    @Body() dto: CreateInventarioDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.inventariosService.create(dto, actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.inventariosService.findOne(id, actor);
  }

  @Get(':id/itens')
  findItems(
    @Param('id') id: string,
    @Query() filters: InventarioItemFilterDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.inventariosService.findItems(id, filters, actor);
  }

  @Patch(':id/itens/:itemId')
  registrarItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: RegistrarInventarioItemDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.inventariosService.registrarItem(id, itemId, dto, actor);
  }

  @Post(':id/concluir')
  concluir(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.inventariosService.concluir(id, actor);
  }
}
