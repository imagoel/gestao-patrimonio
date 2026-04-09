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
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@patrimonio.local';
  const shouldForceAdminUpdate =
    process.env.SEED_ADMIN_FORCE_UPDATE === 'true';
  const existingAdmin = await prisma.usuario.findUnique({
    where: {
      email: adminEmail,
    },
  });

  if (!existingAdmin) {
    await prisma.usuario.create({
      data: {
        nome: process.env.SEED_ADMIN_NAME ?? 'Administrador Inicial',
        email: adminEmail,
        perfil: Perfil.ADMINISTRADOR,
        ativo: true,
        senhaHash: hashedPassword,
        secretariaId: null,
      },
    });
    return;
  }

  if (!shouldForceAdminUpdate) {
    return;
  }

  await prisma.usuario.update({
    where: {
      email: adminEmail,
    },
    data: {
      nome: process.env.SEED_ADMIN_NAME ?? 'Administrador Inicial',
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
