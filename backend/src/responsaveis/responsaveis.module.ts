import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { ResponsaveisController } from './responsaveis.controller';
import { ResponsaveisService } from './responsaveis.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [ResponsaveisController],
  providers: [ResponsaveisService],
  exports: [ResponsaveisService],
})
export class ResponsaveisModule {}
