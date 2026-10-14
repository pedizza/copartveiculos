# COPART Veículos

Consulte [LEIA-ME-COPAR.md](./LEIA-ME-COPAR.md) para configurar o banco novo, importar os 87 veículos e publicar a cópia.

## Projeto publicado

Site institucional com catálogo, página de detalhe, cadastro e login com autenticação JWT própria usando Supabase apenas como banco Postgres.

Repositório público: [pedizza/copartveiculos](https://github.com/pedizza/copartveiculos).

Site: [copartveiculos.vercel.app](https://copartveiculos.vercel.app). Projeto Vercel separado: `pedizza/copartveiculos`.

## Stack

- HTML, CSS e JavaScript
- Node.js + Express
- JWT próprio
- Supabase Postgres
- Vercel para frontend + funções `api/`

## Rodando localmente

1. Instale as dependências:

```bash
npm install
```

2. Esta cópia já contém um `.env` com segredos próprios. Preserve esse arquivo. Somente se estiver ausente, crie seu arquivo local:

```bash
cp -n .env.example .env
```

3. Preencha o `.env` com o banco novo e vazio e execute `npm run setup:copar`.

4. Inicie:

```bash
npm start
```

5. Acesse:

- `http://localhost:3000`

## Banco no Supabase

Execute o SQL abaixo no `SQL Editor` do Supabase:

- [supabase/001_init.sql](./supabase/001_init.sql)

Esse script cria:

- `public.app_users`
- `public.app_refresh_tokens`

Consulta rápida:

- [sql/check_profiles.sql](./sql/check_profiles.sql)

## Variáveis de ambiente

Base local:

- [`.env.example`](./.env.example)

Variáveis usadas:

- `DATABASE_URL`
- `DIRECT_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `JWT_REFRESH_SECRET`
- `JWT_REFRESH_EXPIRES_IN`
- `BCRYPT_ROUNDS`
- `APP_ENV`
- `PORT`
- `APP_URL`
- `APP_DOMAIN`
- `CORS_ORIGIN`

## Publicação

Publicado na Vercel em 14/10/2026 pela CLI autenticada. As variáveis de produção foram cadastradas somente no novo projeto; `.env`, backups e arquivos privados não são versionados. Catálogo, 202 imagens, login administrativo, painel e APIs foram verificados no endereço público. As credenciais de pagamento da nova empresa continuam pendentes.

A conexão automática GitHub → Vercel foi recusada pela integração. A publicação atual funciona, mas novos pushes ainda não disparam deploys: é necessário conectar/autorizar `pedizza/copartveiculos` nas configurações Git do projeto Vercel. Enquanto isso, publicar pela CLI autenticada com `vercel deploy --prod --project copartveiculos --scope pedizza`.

Defina `ADMIN_EMAIL` e `ADMIN_PASSWORD` no ambiente. Não existe senha administrativa padrão no código.

## APIs disponíveis

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
