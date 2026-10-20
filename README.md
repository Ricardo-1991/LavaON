# Lava On

PWA demonstrativa do proprietário para administrar reservas, capacidade diária e serviços de lava-jatos. Funciona em navegadores modernos de celulares, tablets e computadores, com React Web, TypeScript e Vite. O layout original foi preservado e fica centralizado, com largura máxima de 480 px, em telas maiores.

## Executar

Requisitos: Node.js 22.13 ou superior e npm.

```bash
npm ci
npm run dev
```

Abra o endereço informado pelo Vite. A conta demonstrativa vem preenchida:

```text
E-mail: joao@lavaon.com.br
Senha: qualquer valor com 4 ou mais caracteres
```

É possível cadastrar outra conta e concluir as três etapas do onboarding. Login e recuperação de senha são simulados; nenhum e-mail é enviado. Não há backend ou autenticação real.

## PWA e modo offline

O service worker é habilitado no **build de produção**, não no servidor de desenvolvimento. Para testar instalação, cache e atualização:

```bash
npm run build
npm run preview
```

Acesse pelo endereço local informado, aguarde o aviso **“Pronto para usar sem internet”** e teste sem conexão. Todas as telas e operações atuais usam dados locais. O primeiro carregamento precisa de internet; o service worker precisa de HTTPS ou localhost.

A instalação é opcional. Em navegadores compatíveis, use **“Adicionar Lava On ao dispositivo”** ou o menu de instalação do navegador. No iPhone/iPad, abra o link no Safari e use Compartilhar → Adicionar à Tela de Início. Quando disponível, habilite “Abrir como App”. Em navegadores sem instalação, use o mesmo link normalmente.

Novas versões mostram um aviso. É possível adiar e encontrar a atualização em Ajustes. A atualização fica bloqueada durante gravações; alterações não salvas exigem confirmação antes da recarga.

Os cadastros ficam no IndexedDB daquela origem e perfil/instalação de navegador. **Não há sincronização entre aparelhos**, backup em servidor ou importação do aplicativo nativo. A navegação privada pode limitar a persistência, e limpar os dados do site pode remover os cadastros. Falhas de armazenamento são exibidas sem substituir silenciosamente dados existentes. Mantenha a mesma origem ao publicar novas versões para preservar o banco local.

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

Playwright serve o build de produção e testa Chromium, Firefox e WebKit em larguras de 320, 768 e 1440 px. O teste de atualização gera dois builds em uma pasta temporária e roda uma vez em Chromium; esse cenário é omitido intencionalmente nas outras duas engines. Os testes unitários cobrem regras comerciais, transações, recuperação de sessão, diálogos e proteção de atualizações.

Se usar um executável de WebKit preparado em outro ambiente, configure `LAVA_WEBKIT_EXECUTABLE` com o caminho do lançador. A documentação de [validação](docs/validation.md) registra os resultados e a conferência física pendente.

## Hospedagem

O projeto está configurado para publicação na Vercel com HTTPS, rotas internas e cache da PWA. Instruções de publicação, rotas e cache estão em [docs/hosting.md](docs/hosting.md).

Versão de testes publicada: [https://lava-on.vercel.app](https://lava-on.vercel.app). Use a conta demonstrativa acima; cada navegador mantém seus próprios cadastros.

## Estrutura

- `src/app`: navegação web, proteção de rotas e estrutura do aplicativo.
- `src/features`: telas e componentes por funcionalidade, com CSS Modules.
- `src/domain`: modelos, contratos e regras puras.
- `src/data`: consultas, repositórios e banco demonstrativo IndexedDB.
- `src/providers`: sessão e composição de estado.
- `src/shared`: tema, componentes acessíveis, ícones e utilitários.
- `src/pwa`: instalação, conexão e atualização segura.
- `public`: identidade e ícones instaláveis.
- `docs/visual-reference`: capturas da implementação original e da conversão web.

A arquitetura está em [docs/architecture.md](docs/architecture.md). `app.json`, `eas.json` e os antigos assets do Expo foram preservados como referência histórica, incluindo as alterações locais anteriores à migração; eles não participam do build web.
