import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Perfil } from '@prisma/client';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { PrismaService } from '../prisma/prisma.service';
import { FornecedoresService } from './fornecedores.service';

describe('FornecedoresService', () => {
  let service: FornecedoresService;
  let prisma: jest.Mocked<PrismaService>;
  let auditoria: jest.Mocked<AuditoriaService>;

  const actor = {
    id: 'admin-1',
    nome: 'Administrador',
    email: 'admin@patrimonio.local',
    perfil: Perfil.ADMINISTRADOR,
    secretariaId: null,
  };

  beforeEach(() => {
    prisma = {
      fornecedor: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    } as unknown as jest.Mocked<PrismaService>;

    auditoria = {
      registrar: jest.fn(),
    } as unknown as jest.Mocked<AuditoriaService>;

    service = new FornecedoresService(prisma, auditoria);
  });

  it('cria fornecedor normalizando cpfCnpj e email com auditoria', async () => {
    prisma.fornecedor.findFirst.mockResolvedValueOnce(null);
    prisma.fornecedor.create.mockResolvedValue({
      id: 'forn-1',
      nome: 'Fornecedor Teste',
      cpfCnpj: '12345678000190',
      telefone: '(83) 99999-0000',
      email: 'contato@fornecedor.local',
      observacoes: 'Parceiro inicial',
      ativo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    auditoria.registrar.mockResolvedValue({ id: 'audit-1' } as never);

    const result = await service.create(
      {
        nome: '  Fornecedor Teste  ',
        cpfCnpj: '12.345.678/0001-90',
        telefone: ' (83) 99999-0000 ',
        email: ' CONTATO@fornecedor.local ',
        observacoes: ' Parceiro inicial ',
      },
      actor,
    );

    expect(result.cpfCnpj).toBe('12345678000190');
    expect(prisma.fornecedor.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nome: 'Fornecedor Teste',
          cpfCnpj: '12345678000190',
          email: 'contato@fornecedor.local',
        }),
      }),
    );
    expect(auditoria.registrar).toHaveBeenCalled();
  });

  it('nao permite criar fornecedor com cpfCnpj duplicado', async () => {
    prisma.fornecedor.findFirst.mockResolvedValueOnce({ id: 'forn-1' } as never);

    await expect(
      service.create(
        {
          nome: 'Duplicado',
          cpfCnpj: '12345678000190',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('bloqueia cpfCnpj com quantidade invalida de digitos', async () => {
    await expect(
      service.create(
        {
          nome: 'Invalido',
          cpfCnpj: '12345',
        },
        actor,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('falha ao buscar fornecedor inexistente', async () => {
    prisma.fornecedor.findUnique.mockResolvedValue(null);

    await expect(service.findOne('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
