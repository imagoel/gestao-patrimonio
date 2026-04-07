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
import { CreateFornecedorDto } from './dto/create-fornecedor.dto';
import { FornecedorFilterDto } from './dto/fornecedor-filter.dto';
import { UpdateFornecedorDto } from './dto/update-fornecedor.dto';
import { FornecedoresService } from './fornecedores.service';

@Controller('fornecedores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class FornecedoresController {
  constructor(private readonly fornecedoresService: FornecedoresService) {}

  @Get('options')
  findOptions() {
    return this.fornecedoresService.findOptions();
  }

  @Get()
  @Roles(Perfil.ADMINISTRADOR)
  findAll(@Query() filters: FornecedorFilterDto) {
    return this.fornecedoresService.findAll(filters);
  }

  @Get(':id')
  @Roles(Perfil.ADMINISTRADOR)
  findOne(@Param('id') id: string) {
    return this.fornecedoresService.findOne(id);
  }

  @Post()
  @Roles(Perfil.ADMINISTRADOR)
  create(
    @Body() dto: CreateFornecedorDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.fornecedoresService.create(dto, actor);
  }

  @Patch(':id')
  @Roles(Perfil.ADMINISTRADOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFornecedorDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.fornecedoresService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles(Perfil.ADMINISTRADOR)
  remove(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.fornecedoresService.remove(id, actor);
  }
}
