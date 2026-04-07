import { Module } from '@nestjs/common';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { InventariosController } from './inventarios.controller';
import { InventariosService } from './inventarios.service';

@Module({
  imports: [AuditoriaModule],
  controllers: [InventariosController],
  providers: [InventariosService],
})
export class InventariosModule {}
