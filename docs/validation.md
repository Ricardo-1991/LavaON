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

## Conferência física pendente

Nenhum aparelho físico está conectado a este ambiente. Antes de disponibilizar ao cliente, conferir Android, iPhone/iPad e computador: instalação pelo navegador, modo independente, teclado virtual, áreas seguras, orientação horizontal, modo avião e encerramento/reabertura. A automação em WebKit não equivale a um teste real do Safari no iOS.
