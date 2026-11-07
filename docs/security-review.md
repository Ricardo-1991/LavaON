# Revisão de segurança — Lava On

Data: 06/11/2026. Revisão realizada pelo agente dedicado `security_review`, com conferência adicional do agente principal sobre os cabeçalhos públicos e metadados da Vercel.

## Resultado e escopo

O ponto de maior prioridade é a configuração de credenciais PostgreSQL compartilhada entre produção, prévia e desenvolvimento. Também foram identificados abuso possível da capacidade por solicitações fictícias, custo insuficiente do hash de senha em relação à recomendação atual e dependências com avisos de segurança.

Não houve evidência de acesso anônimo às reservas privadas, quebra do isolamento entre proprietários ou injeção SQL nos caminhos examinados. A revisão não é uma certificação e não demonstra ausência de outras vulnerabilidades.

A aplicação, seus dados, configurações e deploy não foram alterados durante esta revisão. Este documento registra os resultados. As provas de comportamento foram executadas somente em memória, com dados sintéticos; as consultas ao ambiente publicado foram de leitura.

## Prioridades

| ID     | Prioridade                | Natureza                                                     | Ação recomendada                                           |
| ------ | ------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| SEC-01 | Alta                      | Risco operacional confirmado                                 | Separar credenciais e bancos/branches dos ambientes        |
| SEC-02 | Média                     | Abuso de negócio reproduzido em memória                      | Proteger reserva pública contra ocupação fictícia de vagas |
| SEC-03 | Média                     | Resistência a ataque offline                                 | Aumentar e versionar o custo do hash de senha              |
| SEC-04 | Atualização prioritária   | Dependência com aviso alto; exploração local não demonstrada | Atualizar Zod e revisar dependências transitivas           |
| SEC-05 | Antes de ampliar a coleta | Governança e operação                                        | Definir retenção, exclusão e recuperação dos dados         |

A prioridade operacional não equivale à classificação CVSS de uma vulnerabilidade explorável remotamente.

## SEC-01 — Configuração de banco compartilhada entre ambientes

**Evidência:** `vercel env ls` apresentou uma única entrada `DATABASE_URL`, assim como outras credenciais PostgreSQL, atribuída a `Production, Preview, Development`. Não foram listadas substituições específicas. Os valores secretos não foram exibidos em texto claro nem comparados por meio de consultas aos dados. `server/database.ts:4` seleciona essa configuração para abrir a conexão. `docs/hosting.md` já descreve o risco de compartilhar a instância.

**Cenário:** um processo local ou deploy de prévia que receba essa configuração pode alcançar o banco usado em produção. Um erro de desenvolvimento ou comprometimento desse ambiente amplia o alcance a cadastros reais. A validação de vínculo no aplicativo não cria uma fronteira entre ambientes que recebem acesso direto ao mesmo banco.

**Correção:** provisionar bancos ou branches isolados e atribuir credenciais diferentes por ambiente; confirmar a separação efetiva antes de liberar as conexões. Separar também a credencial de migração da credencial de execução, concedendo a esta apenas as permissões necessárias. Validar backups e restauração. Não remover ou rotacionar a credencial de produção sem preparar e conferir o novo vínculo.

**Limite:** a revisão não inspecionou privilégios SQL, configuração interna de branches, cópias de segurança ou políticas das contas Neon/Vercel.

## SEC-02 — Reservas fictícias podem esgotar a capacidade

**Evidência:** `server/http.ts:86` permite 25 tentativas de reserva por IP em quinze minutos. `src/domain/rules/public-booking.ts:77` cria o cliente a partir dos campos recebidos e a linha 98 cria uma reserva pendente. Nome, telefone e placa recebem validação de formato, sem comprovação de posse. `src/domain/rules/reservations.ts:51` considera pendências como ocupação. Não foi encontrada expiração automática para pendências abandonadas.

**Prova local:** quinze solicitações sintaticamente válidas, com placas diferentes, preencheram quinze vagas e permaneceram pendentes. Isso fica abaixo do limite atual de um único IP. A prova não utilizou banco nem rede.

**Impacto:** alguém pode impedir agendamentos legítimos com pedidos fictícios, exigindo intervenção do proprietário. A transação continua impedindo reservas acima da capacidade; o problema é a ocupação abusiva da capacidade permitida.

**Correção:** combinar proteção contra automação com limites por cliente/telefone e estabelecimento, sem confiar apenas no IP ou em um telefone digitado. Quando necessário, verificar a posse do contato. Definir com o proprietário uma política para pendências abandonadas e seu acompanhamento. Manter a regra legítima de que uma solicitação pendente ocupa vaga e que a recusa libera essa vaga. A ausência de CAPTCHA, isoladamente, não é o achado.

## SEC-03 — Custo do hash de senha abaixo da recomendação

**Evidência:** `server/auth.ts:11` e `server/auth.ts:16` usam scrypt sem opções explícitas de custo. Salt aleatório e comparação em tempo constante estão presentes. Os padrões do Node 24 são `N=16384, r=8, p=1`. [Documentação Node.js](https://nodejs.org/docs/latest-v24.x/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback).

A recomendação OWASP para essa quantidade de memória usa `p=5`; outra combinação indicada é `N=2^17, r=8, p=1`. [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).

**Impacto:** tentativas offline custam menos caso os hashes sejam obtidos por outro comprometimento. Não foi demonstrada quebra de senha nem desvio remoto de autenticação.

**Correção:** medir o custo adequado no ambiente Vercel, configurar os parâmetros explicitamente, ajustar `maxmem` conforme necessário e armazenar algoritmo/versão/parâmetros com o hash. Preservar a verificação dos registros existentes e atualizar seu hash após login bem-sucedido. Não invalidar contas ao trocar o formato.

## SEC-04 — Dependências com avisos conhecidos

**Evidência:** `npm audit --omit=dev --json` identificou Zod 4.6.4, usado diretamente nas validações da API, e fast-uri 3.1.8 no caminho transitivo `@hookform/resolvers → ajv`. As versões efetivamente instaladas estão no lockfile; a faixa do Zod em `package.json:14` permite receber uma correção compatível após atualizar o lockfile.

O aviso GHSA-mrhx-c7xc-m3w5 classifica como alto o consumo excessivo de memória em validações de coleções e informa correção em Zod 4.6.6. [Aviso revisado no GitHub](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5).

**Exposição específica:** o limite HTTP de 16 KB em `server/http.ts:7` reduz materialmente a entrada disponível ao atacante. Uma prova em memória com 7.600 elementos e 15.285 bytes foi rejeitada em aproximadamente 16 ms, com acréscimo aproximado de 4 MB no heap. Não foi demonstrado esgotamento de memória dentro do limite atual. Para fast-uri, a aplicação usa o adaptador Zod; não foi identificado caminho que forneça URIs não confiáveis ao código vulnerável.

**Correção:** atualizar Zod para uma versão corrigida e compatível, atualizar a dependência transitiva quando aplicável, repetir a auditoria e os testes. Manter limites de tamanho e coleção. A severidade publicada da dependência não deve ser apresentada como prova de exploração prática deste aplicativo.

## SEC-05 — Retenção, exclusão e recuperação de dados

`src/domain/rules/public-booking.ts:111` acrescenta clientes, veículos e reservas ao documento comercial. Recusar ou cancelar preserva nome, telefone e placa. Não foram encontradas rotina de anonimização/exclusão ou política de retenção no código e na documentação examinados. O documento inteiro é persistido em `server/application.ts:44` e `server/database.ts:22`.

Definir quais dados são necessários, seus prazos de retenção, o tratamento de solicitações de exclusão e a relação desses procedimentos com backups. Criar rotinas verificáveis e acesso administrativo restrito. Trata-se de risco de exposição acumulada e governança, sem conclusão de infração legal.

Sessões e contadores respeitam os vencimentos para decidir acesso/limites, mas as linhas expiradas não são removidas automaticamente. Programar limpeza em lotes. A recuperação de senha por e-mail está explicitamente desabilitada; definir também como o proprietário recupera o acesso e revoga sessões em caso de comprometimento. Não foram verificados backups, restauração ou um procedimento operacional de resposta a incidentes.

## Endurecimento adicional

### Cabeçalhos do site

Consultas HTTP públicas a `/` e `/login` confirmaram ausência de `Content-Security-Policy`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e `X-Content-Type-Options`. A API possui `nosniff` e `Cache-Control: private, no-store`. HSTS está presente no domínio.

Adicionar CSP compatível com a aplicação, incluindo `frame-ancestors`, e os demais cabeçalhos adequados. Planejar a introdução de CSP sem quebrar scripts, ícones, PWA ou estilos. Não foi demonstrado clickjacking autenticado: `SameSite=Lax` e a rejeição de `Sec-Fetch-Site: cross-site` reduzem o cenário. [OWASP Clickjacking Defense](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html).

### Consulta pública e crescimento

O GET da disponibilidade em `server/http.ts:43` não tem limitação própria e carrega o estado comercial completo no servidor antes de filtrar a resposta pública, conforme `server/application.ts:151`. Para maior volume ou abuso de consultas, limitar frequência e separar uma projeção pública dos dados privados. O documento crescente por proprietário também amplia o custo de leitura e das gravações serializadas. Não foi executado teste de carga em produção.

## Controles presentes e verificados na leitura

- Tokens aleatórios; somente seus hashes no banco; cookie HttpOnly/Secure/SameSite e invalidação do token no logout.
- Identidade recuperada no servidor e verificação de vínculo com o estabelecimento nas operações privadas.
- Allowlist de operações e validação de conteúdo/origem em chamadas JSON.
- SQL parametrizado, transação na mesma conexão, bloqueio do estado por proprietário e idempotência das reservas.
- Resposta pública sem dados dos clientes e erros sem detalhes pessoais.
- API excluída do fallback/cache da PWA e resposta publicada com `private, no-store`.

Não foi alegada falsificação de IP apenas pelo uso de `x-vercel-forwarded-for`: a Vercel documenta a sobrescrita dos cabeçalhos usados para impedir spoofing. Essa premissa precisa ser revista caso a aplicação passe a outra hospedagem ou proxy. [Documentação Vercel](https://vercel.com/docs/headers/request-headers).

## Validação e limites

O agente executou os quarenta testes unitários, todos aprovados, auditoria npm, leitura de código/configuração/testes e provas em memória. O agente principal consultou metadados Vercel e cabeçalhos públicos, sem criação de contas ou reservas nesta revisão.

Não houve teste invasivo, exploração ou carga em produção. Não foram examinados registros de clientes, valores secretos, privilégios SQL reais, backups/restauração, regras efetivas de firewall ou a segurança das contas Vercel/Neon. Não surgiram achados críticos verificados dentro desse escopo.

Ordem sugerida: isolar ambientes e atualizar dependências; proteger a reserva pública e versionar o hash de senha; implementar retenção, recuperação e rotinas operacionais; adicionar cabeçalhos e monitoramento compatíveis com a PWA. Cada correção deve ter validação própria antes de novo deploy.
