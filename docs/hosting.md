# Publicar o Lava On

O projeto Vercel é `ricardo1991s-projects/lava-on`, com endereço estável **[https://lava-on.vercel.app](https://lava-on.vercel.app)**. A demonstração original foi publicada em 20/10/2026. Em 06/11/2026, o endereço passou a usar a agenda compartilhada, com PostgreSQL Neon gratuito na região São Paulo, autenticação por senha e reservas por link público.

## Vercel e PostgreSQL

A Vercel oferece PostgreSQL por integrações do Marketplace. Os recursos atuais usam Neon, plano gratuito `free_v3`, região São Paulo (`gru1`): `lava-on-postgres` (produção), `lava-on-preview` (prévia) e `lava-on-development` (desenvolvimento). As duas novas bases começaram vazias, sem cópia de dados pessoais de produção.

Cada banco tem uma marca em `lava_environment`. A API bloqueia operações caso ela não corresponda a `VERCEL_ENV` (ou `LAVA_DATABASE_ENV` local). A migração também recusa trocar essa marca. Nunca conecte o recurso de produção à prévia ou ao desenvolvimento. Nunca execute testes destrutivos nos bancos publicados.

Configure no projeto Vercel:

- `LAVA_DATABASE_URL`: credencial restrita de execução, diferente em cada ambiente, exclusivamente no servidor. O papel `lava_runtime` tem DML nas tabelas do aplicativo e somente leitura na marca de ambiente; não tem DDL ou privilégios administrativos. Produção/prévia usam variáveis Secret; desenvolvimento usa Config para permitir acesso local ao seu banco isolado.
- `VITE_DATA_MODE=server`: variável pública que seleciona o adaptador compartilhado no build.
- `APP_ORIGIN=https://lava-on.vercel.app`: origem canônica opcional para validação das requisições. Prévias podem usar seu próprio host.
- `CRON_SECRET`: segredo aleatório de produção, autentica a limpeza diária de sessões/contadores expirados. O cron não remove reservas nem dados de clientes.

`DATABASE_URL`/`POSTGRES_URL` administrativos são usados por `npm run db:migrate` e ferramentas de operação, fora dos deploys. Obtenha a credencial administrativa pelo painel do recurso apenas para essa finalidade, em arquivo privado fora do repositório. Não puxe o ambiente de produção para `.env.local` e não use prefixo `VITE_` em segredos.

Para um banco novo, `scripts/provision-runtime.ts` executa a migração e cria o papel restrito, gravando a URI em arquivo privado sem imprimi-la. Exige `DATABASE_URL`, `LAVA_DATABASE_ENV` e o caminho de saída. O script não rotaciona papéis existentes. Em migrações futuras, o administrador deve conceder explicitamente os privilégios necessários sobre novas tabelas.

Configure a URI restrita na Vercel antes de remover o vínculo que injeta variáveis administrativas. Valide uma prévia sem essas variáveis antes de repetir em produção. O recurso Neon permanece no Storage da equipe quando seu vínculo automático com o aplicativo é removido. Para reversão, reconecte o recurso **apenas ao ambiente correspondente**, migre se necessário e publique novamente:

```bash
npx vercel integration resource connect lava-on-preview lava-on --environment preview --yes
```

Não reverta para um build antigo com proteção inferior. Os valores de ambiente ficam gravados nos deploys anteriores: remover uma variável do projeto não a revoga nos deploys existentes. Rotação de credenciais administrativas e tratamento desses deploys precisam ser acompanhados pelo operador no provedor.

A autenticação do proprietário é implementada na API do aplicativo; `auth=false` na integração evita outro sistema separado. A recuperação por e-mail e as notificações continuam desabilitadas. Há recuperação operacional restrita, descrita em [security-operations.md](security-operations.md).

```bash
npx vercel login
npx vercel link
npx vercel deploy
# Após validar a prévia e o banco:
npx vercel deploy --prod
```

## Build e rotas

`vercel.json` configura Vite, `npm ci`, `VITE_BOT_PROTECTION=on npm run build` e saída estática `dist/`. A pasta `api/` acrescenta funções Node.js; **o modo compartilhado exige essas funções e PostgreSQL**, além dos arquivos estáticos. Não basta copiar `dist` para um host estático nesse modo.

O BotID usa o nível gratuito `basic`, configurado no cliente e servidor; não ativa Deep Analysis pago. A Vercel roteia os recursos do SDK automaticamente. Tokens de bypass da Vercel são acesso administrativo: eles também podem dispensar verificações de bots, e devem ser protegidos. Referências: [BotID](https://vercel.com/docs/botid), [bypass para automação](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation).

As rotas React retornam `index.html`, inclusive `/schedule/new`, `/schedule/new-week` e `/book/:establishmentId`. `/api/`, assets, ícones e arquivos inexistentes não são convertidos em HTML. A API comercial usa `/api/app`; a manutenção autenticada usa `/api/maintenance`. O service worker exclui `/api/` do fallback.

HTML, manifest e service worker usam revalidação. `/assets/` usa nomes com hash e cache imutável por um ano. A API responde com `Cache-Control: private, no-store`; reservas, sessões e dados pessoais não entram no cache da PWA/CDN. CSP, bloqueio de enquadramento, `nosniff`, política de referência e permissões são definidos em `vercel.json`.

O vínculo `.vercel/` não é versionado. `.vercelignore` exclui arquivos de ambiente, testes, capturas e configurações nativas. `server/` e `api/` fazem parte do deploy. A migração é executada explicitamente antes da publicação, não a cada requisição.

## Demonstração estática

Sem `VITE_DATA_MODE=server`, `npm run build` gera uma demonstração que pode ser hospedada apenas com `dist/`. Não necessita de banco e mantém `joao@lavaon.com.br`/`demo`. Os dados continuam no IndexedDB da mesma origem. Não oferece reservas compartilhadas entre dispositivos.

## Conferir após publicação compartilhada

1. Abrir o endereço público em janela anônima, sem login Vercel.
2. Criar uma conta, concluir onboarding, cadastrar serviço e abrir um dia/semana.
3. Copiar o link público e abrir em outro navegador/dispositivo sem sessão.
4. Solicitar reserva e verificar pendência e redução de vaga no proprietário.
5. Recusar e confirmar que a vaga voltou à página pública; testar anonimização manual da reserva encerrada.
6. Trocar a senha em Ajustes → Minha conta; conferir acesso com a nova senha e revogação das sessões anteriores.
7. Testar acesso direto, arquivos ausentes, cache de API, instalação e aviso de necessidade de conexão.
8. Publicar atualização e conferir adiamento, proteção de formulários e preservação dos dados.
9. Conferir que uma requisição sem desafio do BotID e sem bypass administrativo é negada.

A conferência em aparelhos físicos permanece necessária. Não remova proteção global de outros projetos para liberar esta aplicação.
