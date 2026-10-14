# Configuração da COPAR

Revisão em 14/10/2026. As alterações se limitam a esta pasta COPAR. O layout foi preservado; a marca e os dados comerciais foram atualizados conforme os dados fornecidos.

## Marca e dados comerciais aplicados

- Marca exibida: COPART; razão social: Copart do Brasil Organização de Leilões Ltda.
- CNPJ: 14.517.191/0001-78.
- Empresa e pátio: Estrada Muranaka, 199 - Jardim Novo Horizonte, Itaquaquecetuba - SP, CEP 08597-230.
- Logotipo e favicon: `public/copart.svg`, copiado do arquivo fornecido na raiz. Imagem da página Sobre: `public/patio.jpeg`.
- Dados aplicados nos rodapés, modelos de contrato, vendedor dos contratos novos, perfil inicial do administrador e pátio no seed e no novo banco.
- Instagram e todos os botões/links de WhatsApp removidos, incluindo home, catálogo, detalhes, rodapés e botão flutuante. O telefone de cliente continua nos formulários como “Telefone”; os nomes internos dos campos da API foram preservados para manter cadastro e login compatíveis.
- Contatos WhatsApp dos 87 veículos limpos no novo banco e nos seeds; campo comercial removido do formulário de veículos.
- A razão social completa também é usada como assinatura do vendedor dos contratos novos. Não havia contratos preenchidos no banco na atualização.
- Corrigida a colisão de tokens que podia impedir dois logins no mesmo segundo. Nove testes unitários aprovados.

Continuam pendentes apenas domínio/URLs públicas e credenciais de pagamento. Não houve publicação Vercel.

## Banco e inicialização

`DATABASE_URL` e `DIRECT_URL` foram recebidas e gravadas no `.env` local, sem registrar seus valores nesta documentação. As duas devem identificar o mesmo banco. O bloqueio por impressão digital do banco original continua ativo. Uma consulta somente leitura confirmou zero tabelas em `public` antes da inicialização.

Use `npm run setup:copar` somente na primeira inicialização. O comando exige ambas as URLs, recusa registros em qualquer tabela de `public` e não apaga dados. Não execute os antigos scripts de importação/exportação da Mega para inicializar esta cópia.

O `.env` contém os segredos administrativos próprios desta cópia. Preserve-o: não sobrescreva com arquivos de exemplo. Os modelos `.env.example` e `.env.production.example` não contêm credenciais reais.

## Novo projeto Vercel

Criar um projeto independente, com repositório/pasta COPAR e nome próprio. Não selecionar o projeto da Mega nem reutilizar seu vínculo `.vercel`. Não foi feito deploy nesta revisão.

`vercel.json` define frontend estático em `public` e funções em `api`. A inicialização do banco é uma operação manual anterior ao deploy: nunca configurar `setup:copar` como Build Command. As rotas de catálogo apontam agora para uma função existente; a consulta pública de rastreio também tem função própria.

Cadastre as variáveis reais no novo projeto, usando `.env.production.example` como lista. Escolha o domínio antes de completar estes valores:

| Variável | Valor de produção |
| --- | --- |
| `APP_ENV` | `production` |
| `APP_URL` | `https://SEU_DOMINIO_COPAR` |
| `APP_DOMAIN` | `SEU_DOMINIO_COPAR`, sem protocolo ou caminho |
| `CORS_ORIGIN` | Origem HTTPS exata; múltiplas origens separadas por vírgula se necessárias |
| `NOWBANK_CALLBACK_URL` | `https://SEU_DOMINIO_COPAR/api/webhooks/nowbank` |

Configure as credenciais NowBank da nova empresa: `NOWBANK_CLIENT_ID`, `NOWBANK_CLIENT_SECRET`, `NOWBANK_WEBHOOK_TOKEN` e `NOWBANK_WEBHOOK_SECRET`. Não usar credenciais de pagamento da Mega. Não houve chamada para emitir cobranças durante a validação. O recebimento e a conciliação reais dependem dessas credenciais e do domínio público.

Cadastrar o mesmo callback na conta de pagamento da nova empresa. Se forem usados ambientes Preview, usar um banco de teste COPAR e callback correspondentes; não inicializar o banco de produção a cada preview.

Referências oficiais: [configuração Vercel](https://vercel.com/docs/project-configuration/vercel-json) e [variáveis por ambiente](https://vercel.com/docs/environment-variables).

## Locais para trocar quando chegarem os dados

| Informação | Arquivos e locais |
| --- | --- |
| Nome, títulos, descrições, texto institucional, rodapé | `public/index.html`, `sobre.html`, `catalogo.html`, `detalhe.html`, `login.html`, `cadastro.html`, `rastreio.html`, `admin.html`, `contrato.html`, `fatura.html`, `edital.html`, `plano-safra.html` |
| Logotipo e favicon | `public/copart.svg` e referências `brand-logo`, `footer-logo`, `rel="icon"` nos HTML; `src/contracts/template.js` para o documento contratual |
| WhatsApp comercial | Removido do site; campos comerciais dos veículos vazios no seed, no catálogo de referência e no banco |
| Instagram | Removido da home e dos rodapés |
| Razão social, CNPJ, endereço e dados comerciais | Rodapés dos HTML; texto institucional em `public/sobre.html`; condições em `public/edital.html` e `public/plano-safra.html`; entidade vendedora e endereço em `src/contracts/template.js` |
| Vendedor dos contratos novos | `contractSellerName` em `api/admin.js`; texto e logotipo em `src/contracts/template.js` |
| Identificação do administrador | `ADMIN_EMAIL` no `.env`/Vercel mantido para preservar o acesso; nome e endereço do perfil atualizados no novo banco e no perfil inicial em `ensureDefaultAdminUser`, `src/admin/repository.js` |
| Pátios | `seed/yards.json` e registros correspondentes no novo banco (nome, endereço, contato, observações) |
| Aparência e dimensões da marca | `public/styles.css`; preservar regras de layout e ajustar o arquivo de logo à área existente |

Os links técnicos de veículos, faturas e contratos usam a origem da COPAR, sem forçar o domínio antigo. A atualização comercial descrita acima substitui a marca anterior; os canais WhatsApp/Instagram foram removidos por solicitação do usuário.

## Validação

`npm run setup:copar` executado com sucesso no banco definitivo. Conferência posterior: 87 veículos, um pátio, um usuário com papel administrador, zero motoristas, zero rastreios, zero faturas e zero contratos. Não existem usuários clientes ou funcionários. Login administrativo e dashboard aprovados com as credenciais do `.env`, sem exibi-las; a sessão de validação foi encerrada. O token de atualização administrativo revogado pode permanecer como registro técnico novo de sessão.

No banco definitivo também foram verificadas as páginas públicas, catálogo, detalhe, leitura administrativa de contratos e faturas vazios, ausência de rastreio antigo e funções serverless de catálogo/rastreio. Os testes que criam, editam ou excluem fixtures foram executados exclusivamente no banco temporário, nunca no definitivo. A aparência não foi redesenhada; esta revisão não inclui uma auditoria visual completa em navegador nem um deploy Vercel.

As conexões `DATABASE_URL` e `DIRECT_URL` foram aprovadas. No banco temporário também passaram cadastro público, login/perfil de cliente, dashboard de rastreio e bloqueio do acesso administrativo por cliente. Para repetir essa validação isolada nesta máquina: `node scripts/validate-copar-local.mjs` (requer os binários PostgreSQL locais). Todos os arquivos JavaScript revisados passaram na verificação de sintaxe e todos os destinos API de `vercel.json` existem.

- 87 veículos, IDs e slugs únicos, todos publicados; um pátio no seed.
- Todas as 202 imagens referenciadas existem, têm conteúdo e foram decodificadas sem erro.
- Oito testes unitários aprovados: pagamentos em contratos, leitura de PIX, domínio dos links, callback e identificação de banco.
- Em PostgreSQL temporário local: inicialização, recusa da segunda execução, nove páginas HTTP, 87 detalhes, 202 imagens, login e dashboard administrativo aprovados.
- Testes existentes de cadastro/edição/exclusão de catálogo e isolamento de funcionários aprovados somente no banco temporário. Incluem contratos, faturas locais sem gateway, rastreio, autorização e clientes. Nenhum cliente de teste ou documento foi importado para o banco definitivo.
- Validação de cobrança e callback reais fica pendente até configurar a conta de pagamento e o domínio da COPAR. A configuração Vercel foi revisada localmente, sem executar build/deploy remoto.
