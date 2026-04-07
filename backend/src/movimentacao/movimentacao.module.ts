import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { PatrimonioModule } from '../patrimonio/patrimonio.module';
import { MovimentacaoController } from './movimentacao.controller';
import { MovimentacaoService } from './movimentacao.service';

@Module({
  imports: [AuditoriaModule, PatrimonioModule],
  controllers: [MovimentacaoController],
  providers: [MovimentacaoService],
})
export class MovimentacaoModule {}
