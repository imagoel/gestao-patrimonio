import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { SecretariasController } from './secretarias.controller';
import { SecretariasService } from './secretarias.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [SecretariasController],
  providers: [SecretariasService],
  exports: [SecretariasService],
})
export class SecretariasModule {}
