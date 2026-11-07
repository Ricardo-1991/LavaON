# Lava On

PWA de agendamentos para lava-jatos em React Web, TypeScript e Vite. Funciona em navegadores modernos de celulares, tablets e computadores. O layout original permanece centralizado, com largura máxima de 480 px.

## Agenda e reservas públicas

O proprietário pode criar um dia ou uma semana, escolhendo vagas e serviços diferentes para cada data. Em **Agenda → Link para seus clientes**, encontra o endereço público. O cliente escolhe o dia, serviço e informa nome, telefone e veículo, sem criar uma conta.

A solicitação fica pendente e já ocupa uma vaga. Aceitar mantém a ocupação; recusar ou cancelar libera a vaga. As vagas são compartilhadas entre os serviços do dia. Somente datas criadas explicitamente são publicadas; o funcionamento semanal serve como sugestão para criar novas agendas.

Há dois modos separados:

- **Demonstração local** (padrão): IndexedDB, exemplos comerciais e acesso simulado. Funciona offline após o primeiro carregamento. Os dados pertencem apenas àquele navegador.
- **Compartilhado** (`VITE_DATA_MODE=server`): funções Node.js na Vercel, autenticação por senha e PostgreSQL integrado pelo Neon. O proprietário e seus clientes acessam o mesmo banco, em dispositivos diferentes. Consultas e gravações precisam de internet; não há fila de reservas offline.

Os cadastros demonstrativos existentes são preservados no IndexedDB. Não são importados para o banco compartilhado. Neste último modo, crie uma conta com senha de pelo menos oito caracteres, configure o estabelecimento, cadastre os serviços e abra a agenda. Não existe conta demonstrativa de acesso ao servidor.

## Executar a demonstração local

Requisitos: Node.js 24 LTS e npm.

```bash
npm ci
npm run dev
```

Sem `VITE_DATA_MODE=server`, a conta preenchida é `joao@lavaon.com.br`, senha `demo`. Nesse modo a senha é apenas visual e a recuperação de acesso é simulada.

## Executar com PostgreSQL

Configure `.env.local` com `VITE_DATA_MODE=server`, `DATABASE_URL` e a origem do navegador em `APP_ORIGIN`, conforme `.env.example`. Credenciais do banco ficam exclusivamente no servidor. Não use prefixo `VITE_` em segredos.

```bash
npm run db:migrate
npm run dev:api
# Em outro terminal:
npm run dev
```

A API usa a porta 3001; o Vite encaminha `/api` para ela. Para usar outro destino, configure `LAVA_API_TARGET` no processo Vite. Consulte [docs/shared-booking.md](docs/shared-booking.md) para banco, autenticação, concorrência e limites.

## PWA

```bash
npm run build
npm run preview
```

O build estático fica em `dist`. O service worker exige HTTPS ou localhost e é habilitado no build de produção. Todas as telas entram no cache; respostas da API nunca são armazenadas nele. Na demonstração, o aviso **“Pronto para usar sem internet”** indica que o aplicativo pode operar com os dados locais. No modo compartilhado, a interface informa que consultas e reservas exigem conexão.

A instalação é opcional, conforme o navegador. No iPhone/iPad, use o menu Compartilhar do Safari → Adicionar à Tela de Início. Novas versões podem ser adiadas; gravações em andamento bloqueiam a atualização e formulários alterados exigem confirmação antes de recarregar.

## Verificações

```bash
npm run typecheck
npm run lint
npm test
npm run format:check
npm run build
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

Para testes de servidor e do fluxo público, use **um PostgreSQL local exclusivo**, banco `lavaon_test`. Esses testes apagam os dados desse banco de teste. A configuração recusa bancos remotos.

```bash
docker run --name lava-on-test-postgres -e POSTGRES_PASSWORD=lavaon-local-test -e POSTGRES_DB=lavaon_test -p 127.0.0.1:55432:5432 -d postgres:17-alpine
export TEST_DATABASE_URL=postgresql://postgres:lavaon-local-test@127.0.0.1:55432/lavaon_test
npm run test:server
npm run test:e2e:shared
```

Playwright cobre Chromium, Firefox e WebKit, larguras de 320/768/1440 px, proprietário e cliente em contextos separados, persistência, modo offline demonstrativo e atualização. Se necessário, configure `LAVA_WEBKIT_EXECUTABLE` para um lançador compatível com o ambiente. Resultados e conferência física pendente: [docs/validation.md](docs/validation.md).

## Publicação e estrutura

O projeto Vercel é `ricardo1991s-projects/lava-on`, endereço estável [lava-on.vercel.app](https://lava-on.vercel.app). A versão publicada usa PostgreSQL Neon compartilhado. Para começar, crie uma conta, configure o estabelecimento e cadastre os serviços. Depois abra a agenda e copie o link dos clientes. Instruções de configuração e novas publicações em [docs/hosting.md](docs/hosting.md).

- `src/app`, `src/features`, `src/shared`: navegação, telas e componentes com CSS Modules.
- `src/domain`: modelos, validações e regras independentes da interface.
- `src/data`: contratos de acesso, adaptadores HTTP e demonstração IndexedDB.
- `server`, `api`: autenticação, transações PostgreSQL e função Vercel.
- `src/pwa`, `public`: instalação, atualização, identidade e cache.
- `docs/visual-reference`: referências da migração original.

A arquitetura está em [docs/architecture.md](docs/architecture.md). `app.json`, `eas.json` e os assets anteriores do Expo foram preservados como referência histórica e não participam do build web. Pagamentos, notificações e recuperação real por e-mail continuam fora desta etapa; o aplicativo não promete envio de mensagens.
