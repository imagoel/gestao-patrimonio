import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificacaoFilterDto } from './dto/notificacao-filter.dto';
import { NotificacoesService } from './notificacoes.service';

@Controller('notificacoes')
@UseGuards(JwtAuthGuard)
export class NotificacoesController {
  constructor(private readonly notificacoesService: NotificacoesService) {}

  @Get()
  findAll(
    @Query() filters: NotificacaoFilterDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.notificacoesService.findAll(filters, actor);
  }
}
