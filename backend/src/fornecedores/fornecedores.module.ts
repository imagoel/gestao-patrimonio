import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { FornecedoresController } from './fornecedores.controller';
import { FornecedoresService } from './fornecedores.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [FornecedoresController],
  providers: [FornecedoresService],
  exports: [FornecedoresService],
})
export class FornecedoresModule {}
