# Cópia COPAR

Cópia local da Mega, criada em 14/10/2026. O visual e as funcionalidades de catálogo, painel administrativo, contratos, faturas, funcionários e rastreio foram preservados.

O catálogo atual foi exportado do banco de origem em modo somente leitura. Os 87 veículos, seus IDs, preços, descrições, publicação, destaques e galerias estão em `seed/catalog.json`. As imagens do catálogo estão em `public/catalogo-assets/`. Os pátios estão em `seed/yards.json`.

Não foram copiados clientes, funcionários, motoristas, sessões de login, faturas emitidas, contratos preenchidos nem rastreios existentes. Os modelos de contrato e os recursos para emitir novos documentos continuam disponíveis. Backups, PDFs de faturas, documento privado, histórico Git e vínculo Vercel antigo foram excluídos.

## Configurar o novo banco

1. Preencha `DATABASE_URL` e `DIRECT_URL` no `.env` com um banco PostgreSQL novo e vazio.
2. Confira `ADMIN_EMAIL` e `ADMIN_PASSWORD` no `.env`. Uma senha administrativa nova foi gerada para esta cópia, assim como novos segredos JWT.
3. Execute `npm run setup:copar`. Isso cria as tabelas, importa os veículos e pátios e cria apenas o novo administrador. O comando recusa banco com dados e não apaga registros.
4. Execute `npm start` e acesse `http://localhost:3000`.

Trocar apenas as URLs não importa os veículos: execute a inicialização antes de usar o sistema. A conexão com o banco original foi bloqueada na cópia.

## Publicar em outra empresa

Crie um projeto Vercel separado e cadastre as variáveis do `.env` nele. Ajuste `APP_URL`, `APP_DOMAIN`, `CORS_ORIGIN` e `NOWBANK_CALLBACK_URL` para o novo domínio.

Marca, CNPJ, endereço da empresa/pátio e modelos contratuais foram atualizados para COPART conforme os dados fornecidos. O logotipo é `public/copart.svg` e a foto da página Sobre é `public/patio.jpeg`. Instagram e links/botões de WhatsApp foram removidos. As credenciais de pagamento ficaram vazias: configure a conta de pagamento da nova empresa para emitir faturas. `vercel.json` mantém as rotas e não vincula a cópia ao projeto antigo.

A pasta original `mega` e seu banco não foram alterados.

## Revisão e configuração desta cópia

Consulte [docs/CONFIGURACAO-COPAR.md](./docs/CONFIGURACAO-COPAR.md) para o mapa de marca e contatos, configuração do projeto Vercel separado e validações realizadas. O modelo de produção está em `.env.production.example`; as credenciais de pagamento da COPAR ainda precisam ser definidas.

Publicado em 14/10/2026: [GitHub público](https://github.com/pedizza/copartveiculos) e [site Vercel](https://copartveiculos.vercel.app). O deploy foi feito pela CLI no novo projeto `pedizza/copartveiculos`. A integração automática com o repositório requer autorização/conexão nas configurações Git da Vercel; a tentativa de conexão foi recusada. Não foram alterados projetos da Mega.
