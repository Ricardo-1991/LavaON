# Arquitetura do Lava On Web

O Lava On usa React DOM, TypeScript, Vite, React Router e CSS Modules. A migração preserva as telas e os tokens visuais do aplicativo Expo, com layout de 320 até 480 px, centralizado em telas maiores. Há suporte a toque, mouse, teclado, áreas seguras e instalação opcional em navegadores modernos.

## Organização

Telas usam React Hook Form, Zod e hooks TanStack Query. Contratos de repositório e regras de domínio são compartilhados entre dois adaptadores: demonstração IndexedDB e API HTTP com PostgreSQL. `src/data/repositories/index.ts` seleciona o modo explicitamente no build por `VITE_DATA_MODE=server`. Falhas no servidor não mudam o modo nem criam dados demonstrativos silenciosamente.

React Router protege telas privadas após restaurar a sessão. Erros de restauração oferecem nova tentativa. A rota `/book/:establishmentId` permanece acessível sem sessão do proprietário e independentemente de falhas ao restaurá-la. `/schedule/new` e `/schedule/new-week` criam disponibilidade datada.

Consultas locais usam `networkMode: 'always'`. Operações HTTP também tentam imediatamente e apresentam falhas de conexão, sem manter gravações pendentes em uma fila offline. Consultas de agenda e reservas compartilhadas são revalidadas periodicamente.

## Persistência local

O banco IndexedDB `lava-on-demo` mantém versão 1, store `state`, chave `database` e documento com `schemaVersion: 1`. Ao faltar a chave, recebe exemplos comerciais com datas relativas. A extensão `scheduleDays` é aditiva; não substitui contas e reservas existentes.

Cada gravação lê, valida e modifica o documento dentro de uma transação `readwrite`. A promessa só resolve após commit; falhas abortam a transação e preservam dados anteriores. Payload incompatível é exibido como erro e nunca substituído automaticamente.

A sessão e a senha desse modo continuam simuladas. Cadastros ficam no navegador daquela origem e não são importados para o servidor.

## Persistência compartilhada

A função Node.js `api/app.ts` delega ao servidor, autentica o proprietário e valida uma lista fechada de operações. Credenciais e sessão ficam fora do documento comercial. PostgreSQL armazena um documento versionado por proprietário e tabelas auxiliares de sessão, links, idempotência e limites de tentativas. As mesmas regras e a mesma fábrica de repositórios executam sobre o estado lido na transação PostgreSQL.

Toda alteração bloqueia a linha comercial do proprietário até o commit, incluindo reservas públicas. Isso impede que pedidos simultâneos ultrapassem a capacidade. Não há importação dos exemplos locais ou acesso privado com e-mail sem senha. O modelo de dados, limites e regras de acesso são detalhados em [shared-booking.md](shared-booking.md).

## Regras

- Uma reserva representa um veículo, um serviço e uma vaga diária, compartilhada entre os serviços oferecidos naquele dia.
- Pendentes, confirmadas e concluídas consomem capacidade; canceladas, recusadas e faltas não consomem.
- Reservas futuras não podem ser concluídas nem marcadas como falta; pendências antigas não podem ser aceitas.
- Funcionamento semanal não pode invalidar reservas existentes e não altera capacidades datadas.
- O proprietário publica um dia ou sete dias consecutivos, com vagas e serviços por data. Datas abertas precisam de serviços ativos do estabelecimento.
- A criação do período é atômica; datas duplicadas ou capacidade insuficiente rejeitam a operação inteira.
- A página pública só oferece datas explicitamente publicadas, abertas e não passadas.
- Valores ficam em centavos; datas usam `YYYY-MM-DD`; o fuso padrão é `America/Sao_Paulo`.

## PWA

`vite-plugin-pwa` gera manifest e service worker com Workbox. Todas as telas entram no precache. Navegações offline retornam `index.html`; `/api/` é excluído. Atualizações aguardam ação explícita e podem ser adiadas.

A interface informa conexão e disponibilidade offline conforme o modo. Atualizações ficam bloqueadas durante transações IndexedDB e chamadas HTTP de gravação. Formulários do proprietário e do cliente marcam alterações não salvas; a recarga exige confirmação. A limpeza de caches antigos não limpa IndexedDB nem o banco PostgreSQL.

A demonstração local permanece funcional offline. No modo compartilhado, somente os recursos da interface são armazenados; sessão, consultas e gravações precisam de internet. Recuperação de senha por e-mail, pagamentos, notificações e horários individuais permanecem fora desta etapa.
