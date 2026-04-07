# Sistema de Gestao de Patrimonio da Prefeitura

Repositorio principal do sistema de patrimonio da prefeitura, seguindo
`docs/architecture.md` como fonte de verdade para regras e arquitetura e
`docs/execution-plan.md` como fonte de verdade para ordem de entrega.

## Estrutura

```text
.
|- AGENTS.md
|- docs/
|- frontend/
|- backend/
|- infra/nginx/
|- docker-compose.yml
|- .env.example
`- README.md
```

## Estado atual

O repositorio ja passou da base inicial. Hoje ele entrega, em escopo funcional
minimo:

- autenticacao com JWT e controle basico de acesso por perfil e escopo;
- CRUD de usuarios, secretarias, responsaveis e fornecedores;
- cadastro, listagem, filtros, historico e auditoria de patrimonio;
- movimentacao patrimonial ponta a ponta;
- baixa patrimonial;
- relatorios PDF principais;
- dashboard inicial;
- importacao inicial por CSV;
- notificacoes internas operacionais;
- avaliacao assistiva de valor atual;
- inventario periodico inicial;
- infraestrutura integrada com `frontend`, `backend`, `postgres` e `nginx`.

## Como subir localmente

1. Copie `.env.example` para `.env` se quiser sobrescrever os valores padrao.
2. Execute `docker compose up --build`.
3. Abra `http://localhost:8080`.
4. A aplicacao deve redirecionar para `/login`.
5. O endpoint `http://localhost:8080/api/health` deve responder com status 200.
6. O backend aplica a migration inicial e executa o seed automaticamente.

Se o seu WSL estiver sem `buildx`, rode:

```bash
DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose up --build
```

## Dados iniciais

- Usuario administrador: `admin@patrimonio.local`
- Senha inicial: `Admin@123`
- Secretarias iniciais: `SEAFI`, `SEAMA`, `SEMED`, `SEMOP`, `SESAU` e `SUGEP`
- Expiracao padrao do JWT: `8h`

As credenciais e o nome do admin podem ser sobrescritos pelas variaveis
`SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` e
`JWT_EXPIRES_IN`.

## Autenticacao inicial

- Endpoint de login: `POST /api/auth/login`
- Endpoint para sessao autenticada: `GET /api/auth/me`
- O front-end ja entrega formulario de login, persistencia de sessao e rota
  protegida em `/app`.

## Smoke flow recomendado

Sempre que houver mudanca relevante, usar este fluxo como validacao principal:

1. Subir o ambiente com `docker compose up --build`.
2. Validar `http://localhost:8080/api/health`.
3. Fazer login com o administrador inicial.
4. Executar CRUD de `secretarias`, `responsaveis` e `fornecedores`.
5. Cadastrar um patrimonio.
6. Executar uma movimentacao completa:
   - solicitacao
   - confirmacao de entrega
   - confirmacao de recebimento
   - aprovacao final do patrimonio
7. Executar uma baixa patrimonial.
8. Corrigir bugs encontrados antes de abrir novas frentes maiores.

## Desenvolvimento sem Docker

### Front-end

```bash
cd frontend
npm install
npm run dev
```

### Back-end

```bash
cd backend
npm install
npm run start:dev
```

O front-end usa `/api` como base de chamadas HTTP. Sem Nginx, ajuste o ambiente
ou rode um proxy local se precisar testar a comunicacao direta entre as apps.

## Prioridade atual

- consolidar o que ja existe;
- manter o smoke flow principal estavel;
- corrigir regressos e bugs reais encontrados em validacao manual;
- seguir com refinamentos operacionais pequenos;
- tratar, junto da documentacao principal, as regras ainda abertas de
  `valor atual`, depreciacao, documentos obrigatorios e excecoes formais de
  processo antes de automatizacoes mais profundas.
