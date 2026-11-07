# Agenda pública compartilhada

## Uso

1. Crie a conta do proprietário na versão compartilhada e conclua o onboarding.
2. Cadastre ao menos um serviço ativo em Ajustes → Serviços.
3. Em Agenda, escolha Novo dia ou Nova semana. Defina a data inicial, os dias abertos, suas vagas e os serviços oferecidos em cada dia.
4. Salve e copie o Link público na Agenda. O link permanece o mesmo quando outras semanas são publicadas.
5. O cliente acessa `/book/:establishmentId`, escolhe data e serviço, informa seus dados e envia a solicitação. Recebe protocolo, data, serviço, preço e indicação de pendência.
6. O proprietário analisa o pedido em Reservas. A recusa devolve a vaga imediatamente. O cliente pode consultar novamente a disponibilidade ou contatar o telefone do estabelecimento para acompanhar a aprovação.

Não há horários individuais: uma reserva representa um veículo e uma vaga no dia. A capacidade é compartilhada entre todos os serviços daquele dia. O serviço determina a categoria do veículo e o preço; esses dados são copiados para a reserva e preservados mesmo se o cadastro do serviço mudar.

Só `scheduleDays` publicados explicitamente entram na página pública. Dias fechados, passados ou ainda não publicados não podem ser reservados. Serviços desativados deixam de ser oferecidos. O padrão de funcionamento semanal continua sendo usado nas previsões do proprietário e como sugestão ao criar uma semana; não abre automaticamente a agenda pública.

A criação de uma semana é atômica: datas já publicadas ou capacidades conflitantes rejeitam o período inteiro. Alterar o padrão semanal não altera as datas publicadas. A edição/reabertura de uma data já publicada não faz parte deste fluxo de criação; a tela informa a duplicidade, preservando reservas e configuração anterior.

## Banco e transações

A função `/api/app` executa exclusivamente no servidor. O PostgreSQL pode ser conectado pelo Neon no Marketplace Vercel; use `DATABASE_URL` ou `POSTGRES_URL` apenas no ambiente do servidor.

`server/database.ts` contém uma migração aditiva, executada por `npm run db:migrate`. As tabelas são `lava_owners`, `lava_states`, `lava_sessions`, `lava_public_links`, `lava_booking_requests` e `lava_rate_limits`. A migração usa um advisory lock e nunca recria os cadastros.

Os dados comerciais existentes são representados por um documento JSONB versionado por proprietário. Os contratos e regras são compartilhados com o adaptador IndexedDB. Cada alteração obtém `SELECT ... FOR UPDATE` na linha daquele proprietário e realiza a leitura, validação da capacidade, alteração e commit na mesma conexão/transação. Isso também serializa a criação pública com recusas, cancelamentos e mudanças feitas pelo proprietário. Estabelecimentos de proprietários diferentes usam linhas independentes. Esse modelo atende os testes iniciais; para maior volume por conta, será necessário decompor o documento em tabelas e reduzir o escopo dos bloqueios.

Pendentes, confirmadas e concluídas ocupam vagas. Recusadas, canceladas e faltas não ocupam. Aceitar uma pendência muda apenas o estado, sem ocupar outra vaga. A solicitação pública sempre cria uma reserva pendente. Vagas são verificadas novamente no servidor, independentemente dos números exibidos no navegador.

Cada envio público tem uma chave UUID. A chave e o hash do conteúdo são salvos com o protocolo na mesma transação: repetir um envio após uma falha de rede devolve o mesmo resultado, inclusive se a última vaga já foi ocupada. Reutilizar a chave com outros dados é rejeitado. Um veículo com reserva que ocupa vaga não pode abrir outra na mesma data. Não há reservas em fila offline.

## Acesso e privacidade

O proprietário se autentica com e-mail e senha. Senhas recebem scrypt com salt aleatório; tokens de sessão são aleatórios, ficam em cookie HttpOnly/SameSite=Lax/Secure em produção e têm apenas seu hash no banco. A sessão expira em trinta dias e sair invalida o token. O servidor restaura a identidade pelo cookie e valida a associação ao estabelecimento em cada operação privada.

A API aceita somente operações e formatos validados por Zod. Verifica origem nas gravações, aplica limites persistidos de tentativas por IP/e-mail no acesso e por IP na reserva pública, e limita o tamanho das solicitações. Não inclui segredos em variáveis `VITE_*` nem registra os dados pessoais de solicitações em logs de falha.

A leitura pública contém apenas estabelecimento, serviços oferecidos e disponibilidade. Não expõe reservas, nomes, telefones ou placas dos clientes, contas ou sessões. O protocolo não permite consultar dados de outras reservas. Não há envio de confirmação por e-mail/WhatsApp ou recuperação automática de senha nesta etapa.

## Conexão e PWA

A interface é armazenada no cache da PWA; `/api/` é excluído do fallback do service worker e as respostas têm `Cache-Control: private, no-store`. O modo compartilhado precisa de conexão para restaurar a sessão, consultar dados e gravar. Não usa IndexedDB como alternativa silenciosa quando o servidor falha. O formulário público permanece preenchido em falhas; o envio fica desabilitado quando o navegador detecta ausência de conexão.

A disponibilidade é consultada novamente a cada quinze segundos, ao retornar à janela e após enviar/alterar uma reserva. Essa atualização periódica não substitui a validação atômica no servidor. Atualizações da PWA respeitam os formulários públicos alterados e as gravações HTTP em andamento.

## Testar

Use `TEST_DATABASE_URL` apontando a `lavaon_test` em localhost. `npm run test:server` cobre concorrência real, idempotência, persistência após migração e nova sessão, isolamento, autenticação, disponibilidade por dia e liberações. `npm run test:e2e:shared` serve o build compartilhado e a API local e percorre criação de conta, onboarding, serviços, semana, link público em outro contexto, envio, indisponibilidade e recusa, nos três navegadores.
