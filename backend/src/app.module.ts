import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { AuthModule } from './auth/auth.module';
import { BaixaModule } from './baixa/baixa.module';
import configuration from './config/configuration';
import { DashboardModule } from './dashboard/dashboard.module';
import { FornecedoresModule } from './fornecedores/fornecedores.module';
import { HealthModule } from './health/health.module';
import { ImportacoesModule } from './importacoes/importacoes.module';
import { InventariosModule } from './inventarios/inventarios.module';
import { MovimentacaoModule } from './movimentacao/movimentacao.module';
import { NotificacoesModule } from './notificacoes/notificacoes.module';
import { PatrimonioModule } from './patrimonio/patrimonio.module';
import { PrismaModule } from './prisma/prisma.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { ResponsaveisModule } from './responsaveis/responsaveis.module';
import { SecretariasModule } from './secretarias/secretarias.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuditoriaModule,
    BaixaModule,
    UsuariosModule,
    SecretariasModule,
    ResponsaveisModule,
    FornecedoresModule,
    PatrimonioModule,
    MovimentacaoModule,
    DashboardModule,
    ImportacoesModule,
    InventariosModule,
    NotificacoesModule,
    RelatoriosModule,
    AuthModule,
    HealthModule,
  ],
})
export class AppModule {}
