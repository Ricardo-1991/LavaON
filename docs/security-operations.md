# Operação segura e privacidade

Política definida pelo responsável em 07/11/2026: **dados pessoais são removidos somente por ação manual**, sem anonimização automática por prazo. Pendências também não expiram automaticamente. A decisão do proprietário continua necessária; recusar/cancelar libera a vaga.

## Remover dados de um cliente

Em Reservas, abra uma reserva já encerrada (concluída, recusada, cancelada ou falta). Use **Anonimizar dados pessoais** e confirme. O aplicativo remove nome, telefone, descrição e placa daquela reserva, incluindo o cadastro associado quando não houver outra reserva identificada usando o mesmo cadastro. Serviço, data, categoria, valor e status permanecem no histórico.

Reservas pendentes/confirmadas precisam ser encerradas antes dessa ação. O servidor valida proprietário e estabelecimento, não apenas a interface. Para uma solicitação referente a todo o histórico de um cliente, localize e trate cada reserva correspondente; anonimizar uma não remove dados de outras. O hash do conteúdo do envio idempotente também é inutilizado. A ação não pode ser desfeita pela interface.

Backups anteriores podem conter dados removidos. Registre as solicitações atendidas em controle operacional restrito e reaplique a anonimização após uma restauração, antes de reabrir o serviço. A exclusão manual da base ativa não equivale à eliminação imediata dos backups do provedor. Defina armazenamento e descarte das cópias externas antes de ampliar a coleta.

## Conta e incidente de acesso

Em **Ajustes → Minha conta**, o proprietário pode alterar a senha informando a atual. Novas senhas exigem 12 a 128 caracteres. A operação revoga todas as sessões anteriores e entrega uma nova sessão ao dispositivo atual. **Sair de todos os dispositivos** revoga inclusive a sessão atual. Sessões têm validade máxima de 30 dias.

Hashes antigos continuam verificáveis e são atualizados para scrypt versionado após login correto. O novo custo explícito é `N=65536, r=8, p=2`, com salt aleatório de 16 bytes e `maxmem=96 MiB`. Não há migração de senhas em texto nem necessidade de redefinição em massa. Referência: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html#scrypt).

A recuperação automática por e-mail continua desabilitada: não há provedor de envio configurado. Em perda total de acesso, o operador deve verificar a identidade e a titularidade do estabelecimento por canal já conhecido, independentemente do e-mail digitado na solicitação. Depois, em máquina confiável e com credencial administrativa do ambiente correto, use `scripts/recover-owner.ts`.

Prepare um arquivo de ambiente privado (permissão 0600), fora do repositório, com `DATABASE_URL`, `LAVA_DATABASE_ENV`, `LAVA_RECOVERY_EMAIL` e `LAVA_RECOVERY_PASSWORD`. Não coloque a senha na linha de comando ou no histórico do shell. Em seguida:

```bash
node --env-file=/caminho/privado/recuperacao.env --import tsx scripts/recover-owner.ts --identity-verified
```

O script confere a marca do banco, altera somente a conta informada, revoga suas sessões e não exibe a senha/e-mail. Entregue a nova senha por canal seguro, oriente troca imediata na conta e remova o arquivo temporário. O parâmetro registra a responsabilidade do operador; não constitui verificação automática de identidade.

## Abuso da agenda pública

O servidor verifica BotID Basic em cadastro, login e envio público na Vercel. Localmente, o SDK simula humano e os testes exercitam os dois vereditos com mock. O controle real deve ser conferido no domínio publicado, sem cookie/token de bypass Vercel.

Há limite global de 12 tentativas de reserva por IP a cada 15 minutos e limite de três novos envios por origem/estabelecimento no mesmo período. Um telefone pode ter até duas solicitações pendentes no estabelecimento. Um veículo pendente não pode ocupar outro dia enquanto aguarda decisão. A idempotência evita duplicação por repetição do mesmo envio. Rejeições por limite retornam HTTP 429 com orientação de espera. A consulta pública tem limite próprio de 120 leituras por minuto por origem.

Esses controles reduzem automação e ocupação concentrada, mas não comprovam a posse do telefone nem impedem fraude humana/distribuída. O proprietário deve acompanhar pendências e recusar solicitações indevidas; não automatizamos a recusa ou a liberação de vagas. Verificação de telefone poderá ser acrescentada com um provedor escolhido posteriormente.

A consulta pública usa uma projeção separada, atualizada na mesma transação das gravações, e não precisa carregar os dados privados dos clientes. Nunca registrar payloads de reservas, senhas, cookies ou URIs de banco em logs de erro.

## Rotina de manutenção

O cron da Vercel chama `/api/maintenance` diariamente às 06:00 UTC (03:00 de São Paulo), autenticado por `CRON_SECRET`. Remove, por execução, até mil sessões vencidas e mil contadores vencidos há mais de um dia. Tokens expirados já são recusados independentemente dessa limpeza. Se houver acúmulo, acompanhe as contagens operacionais e ajuste a frequência/plano conscientemente.

Esse processo **não apaga clientes, veículos, reservas ou histórico comercial**. A rota recusa acesso sem Bearer correto, usa comparação em tempo constante e não retorna detalhes dos registros.

## Backup e restauração

Há ferramenta de cópia criptografada, adequada ao volume inicial de até 32 MiB de JSON. `scripts/backup.ts` usa snapshot transacional consistente, AES-256-GCM com autenticação e IV aleatório. Exporta contas/hashes de senha, estados comerciais, links, projeções públicas e idempotência. Não copia sessões, credenciais de infraestrutura ou contadores transitórios. Após restaurar, todos precisam fazer login novamente.

Use arquivo de ambiente privado com a conexão do banco correto, `LAVA_DATABASE_ENV` e `LAVA_BACKUP_KEY`: uma chave aleatória de **32 bytes em base64**. Guarde a chave separada do arquivo criptografado, em cofre fora do aplicativo. Perder a chave impede a recuperação. Nunca a grave em variável pública, Git ou logs. A ferramenta cria o arquivo com permissão 0600 e se recusa a sobrescrever arquivos existentes.

```bash
node --env-file=/caminho/privado/backup.env --import tsx scripts/backup.ts export /destino/privado/copia.lava-backup
```

Para restaurar: provisione **outro banco vazio**, migre seu esquema com a marca do ambiente de destino e prepare a conexão/chave em arquivo privado. Defina `LAVA_RESTORE_EMPTY=yes` nesse arquivo. A ferramenta verifica a autenticação do arquivo antes de gravar e recusa banco com cadastros/sessões, sem truncar ou substituir dados.

```bash
node --env-file=/caminho/privado/restauracao.env --import tsx scripts/backup.ts restore /destino/privado/copia.lava-backup
```

Confirme contagens, vínculos, disponibilidade e login no banco restaurado, reaplique exclusões posteriores ao backup e só então planeje a troca da conexão publicada. Não restaure dados pessoais de produção nos ambientes de prévia/desenvolvimento.

A restauração foi exercitada com dados sintéticos em um segundo PostgreSQL local vazio, incluindo chave incorreta, arquivo alterado, preservação dos dados e recusa de sobrescrita. **Não foi executada restauração de produção nem configurado backup externo automático.** Escolha destino, acesso, frequência e retenção das cópias antes de depender delas como recuperação operacional. Verifique também no painel Neon a janela de restauração efetivamente contratada; não presuma uma janela do plano gratuito.

## Ambientes e credenciais antigas

Produção, prévia e desenvolvimento têm recursos independentes. A execução usa papel restrito; migrações exigem administrador em processo separado. Antes de remover uma conexão automática da integração, configure a URI restrita, confirme permissões e teste deploy sem variáveis administrativas. A remoção do vínculo não apaga o banco.

Deploys antigos guardam seus próprios valores de ambiente. Rotacionar/revogar credenciais administrativas antigas exige procedimento no provedor e atualização do acesso de manutenção; remover a variável no projeto não basta. Não publique um rollback que volte a distribuir credenciais administrativas ou usar hashes/regras antigas. Em suspeita de vazamento, priorize revogação, troca da senha da conta afetada, preservação de evidências sem dados pessoais em logs e comunicação pelo responsável.
