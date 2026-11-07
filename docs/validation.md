# Validação da migração

## Referências visuais

Capturas registradas em 10/10/2026, com viewport de 390 × 844 px, estão em `visual-reference/native/` e `visual-reference/web/`. Foram comparadas as 18 telas/etapas: login, cadastro, recuperação, dashboard, agenda, reservas, ajustes, detalhes de reserva e dia, listagem/criação/edição de serviços, estabelecimento, funcionamento, conta e três etapas do onboarding.

As capturas originais foram feitas na implementação Expo renderizada na web, antes de modificar as telas. Elas preservam a referência existente, mas não substituem capturas de aparelhos nativos. O seed usa datas relativas ao dia da captura. O arquivo `schedule-2026-10-10.png` corresponde ao detalhe do dia registrado.

A conversão mantém a paleta, espaçamentos, cartões, conteúdo e iconografia. Cabeçalhos passaram a usar a família de fontes do aplicativo em vez da fonte padrão do cabeçalho Expo Web; campos têm fonte mínima de 16 px. Botões, switches e diálogos adaptam-se aos padrões web de acessibilidade.

## Testes automatizados

- Domínio: transições válidas/inválidas, reservas passadas/futuras e cálculo de capacidade.
- Repositórios: isolamento de estabelecimentos e recálculo após ações.
- IndexedDB: restauração, concorrência entre instâncias, rollback, falha de gravação e payload incompatível sem perda dos dados anteriores.
- Componentes/sessão: rótulos, erros, foco dos diálogos, falha de restauração e tentativa novamente.
- Atualização: bloqueio durante gravação e confirmação de descarte de formulário.
- Playwright em Chromium, Firefox e WebKit: todos os fluxos comerciais, persistência, acesso direto, URLs inválidas, Enter, instruções de instalação, modo offline e larguras de 320/768/1440 px.
- Dois builds: atualização real de service worker em Chromium, adiamento, formulário protegido e preservação do IndexedDB. Esse teste é executado uma vez, sendo omitido em Firefox/WebKit.

O ambiente Linux precisou de bibliotecas adicionais para o WebKit. Elas foram extraídas em uma pasta temporária e um lançador local foi passado por `LAVA_WEBKIT_EXECUTABLE`; os pacotes do sistema não foram alterados.

## Resultado em 10/10/2026

Typecheck, lint, formatação, build e verificação de espaços do diff aprovados. Vitest: 20 testes aprovados em 6 arquivos. Playwright: 25 testes aprovados e 2 omissões intencionais do cenário de atualização nas engines Firefox/WebKit. Os testes por toque também passaram nos três navegadores, incluindo orientação horizontal.

## Publicação na Vercel em 20/10/2026

O endereço público [https://lava-on.vercel.app](https://lava-on.vercel.app) foi validado por requisições HTTP sem credenciais e em uma sessão nova do Chromium. Passaram: login demonstrativo, links diretos, manifest e ícones, service worker em HTTPS, cache de assets, resposta 404 para arquivos inexistentes, criação e persistência de serviço offline, atualização de reserva após recarga offline e layout centralizado em desktop. Não houve erros JavaScript nessa conferência. Typecheck, lint, os 20 testes unitários e o build também passaram antes da publicação.

## Conferência física pendente

Nenhum aparelho físico está conectado a este ambiente. Antes de disponibilizar ao cliente, conferir Android, iPhone/iPad e computador: instalação pelo navegador, modo independente, teclado virtual, áreas seguras, orientação horizontal, modo avião e encerramento/reabertura. A automação em WebKit não equivale a um teste real do Safari no iOS.

## Agenda compartilhada — 06/11/2026

A abertura de dia/semana inclui capacidade e serviços por data, publicação por link e reserva pendente sem login de cliente. O servidor usa PostgreSQL e autenticação do proprietário com senha. O banco de testes é PostgreSQL 17 em container local, separado de qualquer banco publicado.

- Vitest local: 40 testes aprovados, incluindo regras de capacidade, IndexedDB, sessão, validação de períodos, isolamento e proteção de formulário/gravação HTTP.
- PostgreSQL: 9 testes de integração aprovados. Vinte solicitações simultâneas para duas vagas geraram exatamente duas reservas. Reenvios simultâneos com a mesma chave geraram um único protocolo. Aprovação não duplicou ocupação; recusa e cancelamento liberaram vagas. Serviços/datas inválidos e acessos privados de outro proprietário foram rejeitados.
- Persistência compartilhada: reserva preservada após nova migração e novo login; criação de período conflitante revertida integralmente.
- Playwright da demonstração: 25 testes aprovados e 2 omissões intencionais da atualização em Firefox/WebKit. As novas rotas de criação também foram conferidas em 320/768/1440 px.
- Playwright compartilhado: fluxo completo aprovado em Chromium, Firefox e WebKit. Cadastro, onboarding, serviços, abertura de semana com serviços diferentes, link público em contexto separado, bloqueio sem conexão, solicitação pendente, recusa/liberação e criação de dia avulso.
- Capturas adicionais em `visual-reference/shared/`: formulário de semana em 320 px e página pública em 320/768/1440 px. A interface conserva cores, cartões, tipografia e o limite de largura existente.
- Typecheck, lint e formatação aprovados. Builds local e de prévia Vercel gerados. A função ESM da Vercel usa imports explícitos e Node.js 24 LTS; sua inicialização na prévia foi verificada e retorna a mensagem esperada de banco ainda não conectado.

Após a autorização do titular, o PostgreSQL Neon gratuito (`lava-on-postgres`, região `gru1`) foi conectado ao projeto. A migração aditiva foi aplicada e a versão compartilhada publicada em [https://lava-on.vercel.app](https://lava-on.vercel.app), deployment `dpl_3uUf2WuB5mktvDm6pVsqENeGbozr`, com Node.js 24 LTS. A API pública respondeu HTTP 200 sem login Vercel e com `Cache-Control: private, no-store`. Não foi feita validação física em Android/iPhone/iPad.

### Conferência em produção — 06/11/2026

O fluxo foi executado no endereço público, sem credenciais Vercel, com uma conta sintética exclusiva. Passaram cadastro, autenticação, onboarding, serviços, publicação da semana com capacidade e serviços por data, acesso anônimo pelo link, envio por Enter, pendência ocupando vaga e recusa liberando a vaga. Cinco solicitações simultâneas para duas vagas no Neon/Vercel geraram exatamente duas reservas e três respostas de capacidade esgotada.

Um novo login em Firefox/desktop recuperou os mesmos cadastros e reservas. O link público também foi conferido em WebKit com toque. Passaram cookies HttpOnly/Secure/SameSite, bloqueio de consultas privadas sem sessão, ausência de dados pessoais de clientes na disponibilidade pública, cache de API, manifest e resposta 404 para endpoints/assets ausentes. Não houve erros JavaScript.

Firefox e WebKit utilizaram `ignoreHTTPSErrors` exclusivamente no teste remoto por causa da confiança de certificados do ambiente de automação. Chromium e a consulta HTTP nativa acessaram o HTTPS normalmente. Isso não modifica o aplicativo nem a configuração de certificados publicada.

A limpeza executada em `finally` verificou a conta sintética por e-mail exclusivo, senha aleatória e data de criação antes de removê-la com seus serviços, agenda, sessões e reservas. A remoção foi confirmada; os cadastros de outros proprietários não foram alterados. As credenciais de produção utilizadas na migração/conferência ficaram em arquivo temporário protegido, removido após concluir o trabalho.
