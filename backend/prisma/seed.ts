import { PrismaPg } from '@prisma/adapter-pg';
import { Perfil, PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://postgres:postgres@localhost:5432/patrimonio?schema=public';

const pool = new Pool({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

const secretariasIniciais = [
  {
    sigla: 'SEAFI',
    nomeCompleto: 'Secretaria de Administracao e Financas',
  },
  {
    sigla: 'SEAMA',
    nomeCompleto: 'Secretaria de Agricultura e Meio Ambiente',
  },
  {
    sigla: 'SEMED',
    nomeCompleto: 'Secretaria de Educacao',
  },
  {
    sigla: 'SEMOP',
    nomeCompleto: 'Secretaria de Obras e Servicos Publicos',
  },
  {
    sigla: 'SESAU',
    nomeCompleto: 'Secretaria de Saude',
  },
  {
    sigla: 'SUGEP',
    nomeCompleto: 'Superintendencia de Gestao de Pessoas',
  },
];

async function main() {
  for (const secretaria of secretariasIniciais) {
    await prisma.secretaria.upsert({
      where: { sigla: secretaria.sigla },
      update: {
        nomeCompleto: secretaria.nomeCompleto,
        ativo: true,
      },
      create: {
        sigla: secretaria.sigla,
        nomeCompleto: secretaria.nomeCompleto,
        ativo: true,
      },
    });
  }

  const hashedPassword = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123',
    12,
  );

  await prisma.usuario.upsert({
    where: {
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@patrimonio.local',
    },
    update: {
      nome: process.env.SEED_ADMIN_NAME ?? 'Administrador Inicial',
      perfil: Perfil.ADMINISTRADOR,
      ativo: true,
      senhaHash: hashedPassword,
      secretariaId: null,
    },
    create: {
      nome: process.env.SEED_ADMIN_NAME ?? 'Administrador Inicial',
      email: process.env.SEED_ADMIN_EMAIL ?? 'admin@patrimonio.local',
      perfil: Perfil.ADMINISTRADOR,
      ativo: true,
      senhaHash: hashedPassword,
      secretariaId: null,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error('Erro ao executar seed inicial do Prisma.', error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
