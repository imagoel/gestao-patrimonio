import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { PatrimonioController } from './patrimonio.controller';
import { PatrimonioService } from './patrimonio.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [PatrimonioController],
  providers: [PatrimonioService],
  exports: [PatrimonioService],
})
export class PatrimonioModule {}
