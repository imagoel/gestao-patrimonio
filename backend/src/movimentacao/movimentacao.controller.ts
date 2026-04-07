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
import { AnalisarMovimentacaoDto } from './dto/analisar-movimentacao.dto';
import { ConfirmarEntregaDto } from './dto/confirmar-entrega.dto';
import { ConfirmarRecebimentoDto } from './dto/confirmar-recebimento.dto';
import { CreateMovimentacaoDto } from './dto/create-movimentacao.dto';
import { MovimentacaoFilterDto } from './dto/movimentacao-filter.dto';
import { MovimentacaoService } from './movimentacao.service';

@Controller('movimentacoes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovimentacaoController {
  constructor(private readonly movimentacaoService: MovimentacaoService) {}

  @Get('options')
  findOptions(@CurrentUser() actor: AuthenticatedUser) {
    return this.movimentacaoService.findOptions(actor);
  }

  @Get()
  findAll(
    @Query() filters: MovimentacaoFilterDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.movimentacaoService.findAll(filters, actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.movimentacaoService.findOne(id, actor);
  }

  @Post()
  @Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO, Perfil.CHEFE_SETOR)
  create(
    @Body() dto: CreateMovimentacaoDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.movimentacaoService.create(dto, actor);
  }

  @Post(':id/confirmar-entrega')
  @Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO, Perfil.CHEFE_SETOR)
  confirmarEntrega(
    @Param('id') id: string,
    @Body() dto: ConfirmarEntregaDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.movimentacaoService.confirmarEntrega(id, dto, actor);
  }

  @Post(':id/confirmar-recebimento')
  @Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO, Perfil.CHEFE_SETOR)
  confirmarRecebimento(
    @Param('id') id: string,
    @Body() dto: ConfirmarRecebimentoDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.movimentacaoService.confirmarRecebimento(id, dto, actor);
  }

  @Post(':id/analisar')
  @Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
  analisar(
    @Param('id') id: string,
    @Body() dto: AnalisarMovimentacaoDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.movimentacaoService.analisar(id, dto, actor);
  }
}
