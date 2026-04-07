import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { BaixaController } from './baixa.controller';
import { BaixaService } from './baixa.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [BaixaController],
  providers: [BaixaService],
})
export class BaixaModule {}
