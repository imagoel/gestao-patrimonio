import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Perfil } from '@prisma/client';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuditoriaFilterDto } from './dto/auditoria-filter.dto';
import { AuditoriaService } from './auditoria.service';

@Controller('auditorias')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get('options')
  findOptions(@CurrentUser() actor: AuthenticatedUser) {
    return this.auditoriaService.findOptions(actor);
  }

  @Get()
  findAll(
    @Query() filters: AuditoriaFilterDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.auditoriaService.findAll(filters, actor);
  }
}
