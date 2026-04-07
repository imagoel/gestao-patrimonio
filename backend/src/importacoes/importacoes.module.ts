import { Module } from '@nestjs/common';
import { PatrimonioModule } from '../patrimonio/patrimonio.module';
import { ImportacoesController } from './importacoes.controller';
import { ImportacoesService } from './importacoes.service';

@Module({
  imports: [PatrimonioModule],
  controllers: [ImportacoesController],
  providers: [ImportacoesService],
})
export class ImportacoesModule {}
