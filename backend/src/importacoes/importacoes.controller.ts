import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Perfil } from '@prisma/client';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ImportacoesService } from './importacoes.service';

interface UploadedCsvFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('importacoes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Perfil.ADMINISTRADOR, Perfil.TECNICO_PATRIMONIO)
export class ImportacoesController {
  constructor(private readonly importacoesService: ImportacoesService) {}

  @Get('patrimonios/template')
  downloadPatrimoniosTemplate(@Res() response: Response) {
    const template = this.importacoesService.buildPatrimoniosTemplate();

    response.setHeader(
      'Content-Disposition',
      'attachment; filename="template-importacao-patrimonios.csv"',
    );
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.send(template);
  }

  @Post('patrimonios')
  @UseInterceptors(FileInterceptor('file'))
  importPatrimonios(
    @UploadedFile() file: UploadedCsvFile | undefined,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('Envie um arquivo CSV para importacao.');
    }

    return this.importacoesService.importPatrimonios(file, actor);
  }
}
