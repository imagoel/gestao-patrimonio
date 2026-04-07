import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Perfil } from '@prisma/client';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { buildIsoDateStamp } from '../common/utils/date.utils';
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

    this.sendPdf(
      response,
      `relatorio-patrimonio-${this.buildDateStamp()}.pdf`,
      pdf,
    );
  }

  @Get('bens-por-localizacao')
  async gerarRelatorioBensPorLocalizacao(
    @Query() filters: RelatorioPatrimonioDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const pdf = await this.relatoriosService.gerarRelatorioBensPorLocalizacao(
      filters,
      actor,
    );

    this.sendPdf(
      response,
      `relatorio-bens-por-localizacao-${this.buildDateStamp()}.pdf`,
      pdf,
    );
  }

  @Get('bens-inativos')
  async gerarRelatorioBensInativos(
    @Query() filters: RelatorioPatrimonioDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const pdf = await this.relatoriosService.gerarRelatorioBensInativos(
      filters,
      actor,
    );

    this.sendPdf(
      response,
      `relatorio-bens-inativos-${this.buildDateStamp()}.pdf`,
      pdf,
    );
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

    this.sendPdf(
      response,
      `relatorio-movimentacoes-${this.buildDateStamp()}.pdf`,
      pdf,
    );
  }

  @Get('movimentacoes-pendentes')
  async gerarRelatorioMovimentacoesPendentes(
    @Query() filters: RelatorioMovimentacaoDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const pdf =
      await this.relatoriosService.gerarRelatorioMovimentacoesPendentes(
        filters,
        actor,
      );

    this.sendPdf(
      response,
      `relatorio-movimentacoes-pendentes-${this.buildDateStamp()}.pdf`,
      pdf,
    );
  }

  @Get('movimentacoes-concluidas')
  async gerarRelatorioMovimentacoesConcluidas(
    @Query() filters: RelatorioMovimentacaoDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const pdf =
      await this.relatoriosService.gerarRelatorioMovimentacoesConcluidas(
        filters,
        actor,
      );

    this.sendPdf(
      response,
      `relatorio-movimentacoes-concluidas-${this.buildDateStamp()}.pdf`,
      pdf,
    );
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

    this.sendPdf(
      response,
      `relatorio-baixas-${this.buildDateStamp()}.pdf`,
      pdf,
    );
  }

  @Get('auditoria-movimentacoes')
  async gerarRelatorioAuditoriaMovimentacoes(
    @Query() filters: RelatorioAuditoriaMovimentacaoDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const pdf =
      await this.relatoriosService.gerarRelatorioAuditoriaMovimentacoes(
        filters,
        actor,
      );

    this.sendPdf(
      response,
      `relatorio-auditoria-movimentacoes-${this.buildDateStamp()}.pdf`,
      pdf,
    );
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

    this.sendPdf(
      response,
      `relatorio-historico-patrimonio-${this.buildDateStamp()}.pdf`,
      pdf,
    );
  }

  private buildDateStamp() {
    return buildIsoDateStamp();
  }

  private sendPdf(response: Response, filename: string, pdf: Buffer) {
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.send(pdf);
  }
}
