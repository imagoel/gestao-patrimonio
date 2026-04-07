-- CreateEnum
CREATE TYPE "StatusInventario" AS ENUM ('ABERTO', 'CONCLUIDO');

-- CreateEnum
CREATE TYPE "StatusInventarioItem" AS ENUM ('PENDENTE', 'LOCALIZADO', 'NAO_LOCALIZADO');

-- CreateTable
CREATE TABLE "Inventario" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "secretariaId" TEXT NOT NULL,
    "status" "StatusInventario" NOT NULL DEFAULT 'ABERTO',
    "observacoes" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "concluidoPorId" TEXT,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "concluidoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventarioItem" (
    "id" TEXT NOT NULL,
    "inventarioId" TEXT NOT NULL,
    "patrimonioId" TEXT NOT NULL,
    "tomboSnapshot" VARCHAR(5) NOT NULL,
    "itemSnapshot" TEXT NOT NULL,
    "localizacaoSnapshot" TEXT NOT NULL,
    "responsavelSnapshotNome" TEXT NOT NULL,
    "status" "StatusInventarioItem" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "registradoPorId" TEXT,
    "registradoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventarioItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Inventario_secretariaId_idx" ON "Inventario"("secretariaId");

-- CreateIndex
CREATE INDEX "Inventario_status_idx" ON "Inventario"("status");

-- CreateIndex
CREATE INDEX "Inventario_secretariaId_status_idx" ON "Inventario"("secretariaId", "status");

-- CreateIndex
CREATE INDEX "Inventario_iniciadoEm_idx" ON "Inventario"("iniciadoEm");

-- CreateIndex
CREATE INDEX "InventarioItem_inventarioId_status_idx" ON "InventarioItem"("inventarioId", "status");

-- CreateIndex
CREATE INDEX "InventarioItem_patrimonioId_idx" ON "InventarioItem"("patrimonioId");

-- CreateIndex
CREATE UNIQUE INDEX "InventarioItem_inventarioId_patrimonioId_key" ON "InventarioItem"("inventarioId", "patrimonioId");

-- AddForeignKey
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_secretariaId_fkey" FOREIGN KEY ("secretariaId") REFERENCES "Secretaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventario" ADD CONSTRAINT "Inventario_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioItem" ADD CONSTRAINT "InventarioItem_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "Inventario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioItem" ADD CONSTRAINT "InventarioItem_patrimonioId_fkey" FOREIGN KEY ("patrimonioId") REFERENCES "Patrimonio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventarioItem" ADD CONSTRAINT "InventarioItem_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
