import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Perfil } from '@prisma/client';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { RelatorioAuditoriaMovimentacaoDto } from './dto/relatorio-auditoria-movimentacao.dto';
import { RelatorioBaixaDto } from './dto/relatorio-baixa.dto';
import { RelatorioMovimentacaoDto } from './dto/relatorio-movimentacao.dto';
import { RelatorioPatrimonioDto } from './dto/relatorio-patrimonio.dto';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('options')
  findOptions(@CurrentUser() actor: AuthenticatedUser) {
    return this.relatoriosService.findOptions(actor);
  }

  @Get('patrimonio')
  async gerarRelatorioPatrimonio(
    @Query() filters: RelatorioPatrimonioDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const pdf = await this.relatoriosService.gerarRelatorioPatrimonio(
      filters,
      actor,
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-patrimonio-${this.buildDateStamp()}.pdf"`,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.send(pdf);
  }

  @Get('movimentacoes')
  async gerarRelatorioMovimentacoes(
    @Query() filters: RelatorioMovimentacaoDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const pdf = await this.relatoriosService.gerarRelatorioMovimentacoes(
      filters,
      actor,
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-movimentacoes-${this.buildDateStamp()}.pdf"`,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.send(pdf);
  }

  @Get('baixas')
  async gerarRelatorioBaixas(
    @Query() filters: RelatorioBaixaDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const pdf = await this.relatoriosService.gerarRelatorioBaixas(
      filters,
      actor,
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-baixas-${this.buildDateStamp()}.pdf"`,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.send(pdf);
  }

  @Get('auditoria-movimentacoes')
  async gerarRelatorioAuditoriaMovimentacoes(
    @Query() filters: RelatorioAuditoriaMovimentacaoDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const pdf = await this.relatoriosService.gerarRelatorioAuditoriaMovimentacoes(
      filters,
      actor,
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-auditoria-movimentacoes-${this.buildDateStamp()}.pdf"`,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.send(pdf);
  }

  @Get('patrimonios/:id/historico')
  async gerarRelatorioHistoricoPatrimonio(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const pdf = await this.relatoriosService.gerarRelatorioHistoricoPatrimonio(
      id,
      actor,
    );

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-historico-patrimonio-${this.buildDateStamp()}.pdf"`,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.send(pdf);
  }

  private buildDateStamp() {
    return new Date().toISOString().slice(0, 10);
  }
}
