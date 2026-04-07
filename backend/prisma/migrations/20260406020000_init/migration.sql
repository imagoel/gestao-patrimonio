-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ADMINISTRADOR', 'TECNICO_PATRIMONIO', 'CHEFE_SETOR', 'USUARIO_CONSULTA');

-- CreateEnum
CREATE TYPE "EstadoConservacao" AS ENUM ('EXCELENTE', 'BOM', 'REGULAR', 'RUIM', 'PESSIMO');

-- CreateEnum
CREATE TYPE "StatusItem" AS ENUM ('ATIVO', 'INATIVO', 'EM_MOVIMENTACAO', 'BAIXADO', 'EM_MANUTENCAO');

-- CreateEnum
CREATE TYPE "StatusMovimentacao" AS ENUM ('AGUARDANDO_CONFIRMACAO_ENTREGA', 'AGUARDANDO_CONFIRMACAO_RECEBIMENTO', 'AGUARDANDO_APROVACAO_PATRIMONIO', 'APROVADA', 'REJEITADA', 'CONCLUIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoEntrada" AS ENUM ('COMPRA', 'DOACAO', 'CESSAO', 'TRANSFERENCIA', 'PRODUCAO_PROPRIA', 'OUTRO');

-- CreateEnum
CREATE TYPE "MotivoBaixa" AS ENUM ('LEILAO', 'DOACAO', 'INSERVIVEL', 'EXTRAVIO', 'DESCARTE', 'TRANSFERENCIA_DEFINITIVA', 'OUTRO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "secretariaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Secretaria" (
    "id" TEXT NOT NULL,
    "sigla" VARCHAR(10) NOT NULL,
    "nomeCompleto" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Secretaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responsavel" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cargo" TEXT,
    "setor" TEXT NOT NULL,
    "contato" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "secretariaId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Responsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fornecedor" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpfCnpj" VARCHAR(18),
    "telefone" TEXT,
    "email" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fornecedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patrimonio" (
    "id" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "tombo" VARCHAR(5) NOT NULL,
    "secretariaAtualId" TEXT NOT NULL,
    "localizacaoAtual" TEXT NOT NULL,
    "responsavelAtualId" TEXT NOT NULL,
    "estadoConservacao" "EstadoConservacao" NOT NULL,
    "status" "StatusItem" NOT NULL DEFAULT 'ATIVO',
    "fornecedorId" TEXT,
    "tipoEntrada" "TipoEntrada" NOT NULL,
    "valorOriginal" DECIMAL(14,2) NOT NULL,
    "valorAtual" DECIMAL(14,2),
    "descricao" TEXT,
    "dataAquisicao" TIMESTAMP(3),
    "observacoes" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patrimonio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Movimentacao" (
    "id" TEXT NOT NULL,
    "patrimonioId" TEXT NOT NULL,
    "secretariaOrigemId" TEXT NOT NULL,
    "localizacaoOrigem" TEXT NOT NULL,
    "secretariaDestinoId" TEXT NOT NULL,
    "localizacaoDestino" TEXT NOT NULL,
    "responsavelOrigemId" TEXT NOT NULL,
    "responsavelDestinoId" TEXT,
    "solicitanteId" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "observacoes" TEXT,
    "status" "StatusMovimentacao" NOT NULL DEFAULT 'AGUARDANDO_CONFIRMACAO_ENTREGA',
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmadoEntregaPorId" TEXT,
    "confirmadoEntregaEm" TIMESTAMP(3),
    "confirmadoRecebimentoPorId" TEXT,
    "confirmadoRecebimentoEm" TIMESTAMP(3),
    "validadoPorId" TEXT,
    "validadoEm" TIMESTAMP(3),
    "justificativaRejeicao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movimentacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoPatrimonio" (
    "id" TEXT NOT NULL,
    "patrimonioId" TEXT NOT NULL,
    "usuarioId" TEXT,
    "movimentacaoId" TEXT,
    "baixaPatrimonialId" TEXT,
    "evento" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "dadosAnteriores" JSONB,
    "dadosNovos" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoPatrimonio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "usuarioId" TEXT,
    "dadosAnteriores" JSONB,
    "dadosNovos" JSONB,
    "contexto" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaixaPatrimonial" (
    "id" TEXT NOT NULL,
    "patrimonioId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "motivo" "MotivoBaixa" NOT NULL,
    "observacoes" TEXT,
    "baixadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaixaPatrimonial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "Usuario_secretariaId_idx" ON "Usuario"("secretariaId");

-- CreateIndex
CREATE INDEX "Usuario_perfil_ativo_idx" ON "Usuario"("perfil", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Secretaria_sigla_key" ON "Secretaria"("sigla");

-- CreateIndex
CREATE INDEX "Secretaria_ativo_idx" ON "Secretaria"("ativo");

-- CreateIndex
CREATE INDEX "Responsavel_secretariaId_ativo_idx" ON "Responsavel"("secretariaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Fornecedor_cpfCnpj_key" ON "Fornecedor"("cpfCnpj");

-- CreateIndex
CREATE INDEX "Fornecedor_ativo_idx" ON "Fornecedor"("ativo");

-- CreateIndex
CREATE UNIQUE INDEX "Patrimonio_tombo_key" ON "Patrimonio"("tombo");

-- CreateIndex
CREATE INDEX "Patrimonio_secretariaAtualId_idx" ON "Patrimonio"("secretariaAtualId");

-- CreateIndex
CREATE INDEX "Patrimonio_responsavelAtualId_idx" ON "Patrimonio"("responsavelAtualId");

-- CreateIndex
CREATE INDEX "Patrimonio_status_idx" ON "Patrimonio"("status");

-- CreateIndex
CREATE INDEX "Patrimonio_secretariaAtualId_status_idx" ON "Patrimonio"("secretariaAtualId", "status");

-- CreateIndex
CREATE INDEX "Movimentacao_patrimonioId_idx" ON "Movimentacao"("patrimonioId");

-- CreateIndex
CREATE INDEX "Movimentacao_status_idx" ON "Movimentacao"("status");

-- CreateIndex
CREATE INDEX "Movimentacao_patrimonioId_status_idx" ON "Movimentacao"("patrimonioId", "status");

-- CreateIndex
CREATE INDEX "Movimentacao_secretariaOrigemId_idx" ON "Movimentacao"("secretariaOrigemId");

-- CreateIndex
CREATE INDEX "Movimentacao_secretariaDestinoId_idx" ON "Movimentacao"("secretariaDestinoId");

-- CreateIndex
CREATE INDEX "HistoricoPatrimonio_patrimonioId_criadoEm_idx" ON "HistoricoPatrimonio"("patrimonioId", "criadoEm");

-- CreateIndex
CREATE INDEX "HistoricoPatrimonio_usuarioId_idx" ON "HistoricoPatrimonio"("usuarioId");

-- CreateIndex
CREATE INDEX "Auditoria_entidade_entidadeId_idx" ON "Auditoria"("entidade", "entidadeId");

-- CreateIndex
CREATE INDEX "Auditoria_createdAt_idx" ON "Auditoria"("createdAt");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_idx" ON "Auditoria"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "BaixaPatrimonial_patrimonioId_key" ON "BaixaPatrimonial"("patrimonioId");

-- CreateIndex
CREATE INDEX "BaixaPatrimonial_usuarioId_idx" ON "BaixaPatrimonial"("usuarioId");

-- CreateIndex
CREATE INDEX "BaixaPatrimonial_baixadoEm_idx" ON "BaixaPatrimonial"("baixadoEm");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Responsavel" ADD CONSTRAINT "Responsavel_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patrimonio" ADD CONSTRAINT "Patrimonio_secretariaAtualId_fkey" FOREIGN KEY ("secretariaAtualId") REFERENCES "Secretaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patrimonio" ADD CONSTRAINT "Patrimonio_responsavelAtualId_fkey" FOREIGN KEY ("responsavelAtualId") REFERENCES "Responsavel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patrimonio" ADD CONSTRAINT "Patrimonio_fornecedorId_fkey" FOREIGN KEY ("fornecedorId") REFERENCES "Fornecedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patrimonio" ADD CONSTRAINT "Patrimonio_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patrimonio" ADD CONSTRAINT "Patrimonio_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "Patrimonio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_secretariaOrigemId_fkey" FOREIGN KEY ("secretariaOrigemId") REFERENCES "Secretaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_secretariaDestinoId_fkey" FOREIGN KEY ("secretariaDestinoId") REFERENCES "Secretaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_responsavelOrigemId_fkey" FOREIGN KEY ("responsavelOrigemId") REFERENCES "Responsavel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_responsavelDestinoId_fkey" FOREIGN KEY ("responsavelDestinoId") REFERENCES "Responsavel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_solicitanteId_fkey" FOREIGN KEY ("solicitanteId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_confirmadoEntregaPorId_fkey" FOREIGN KEY ("confirmadoEntregaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_confirmadoRecebimentoPorId_fkey" FOREIGN KEY ("confirmadoRecebimentoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Movimentacao" ADD CONSTRAINT "Movimentacao_validadoPorId_fkey" FOREIGN KEY ("validadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPatrimonio" ADD CONSTRAINT "HistoricoPatrimonio_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "Patrimonio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPatrimonio" ADD CONSTRAINT "HistoricoPatrimonio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPatrimonio" ADD CONSTRAINT "HistoricoPatrimonio_movimentacaoId_fkey" FOREIGN KEY ("movimentacaoId") REFERENCES "Movimentacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoPatrimonio" ADD CONSTRAINT "HistoricoPatrimonio_baixaPatrimonialId_fkey" FOREIGN KEY ("baixaPatrimonialId") REFERENCES "BaixaPatrimonial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaixaPatrimonial" ADD CONSTRAINT "BaixaPatrimonial_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "Patrimonio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaixaPatrimonial" ADD CONSTRAINT "BaixaPatrimonial_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
