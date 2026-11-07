# Publicar o Lava On

O projeto Vercel é `ricardo1991s-projects/lava-on`, com endereço estável **[https://lava-on.vercel.app](https://lava-on.vercel.app)**. A demonstração original foi publicada em 20/10/2026. Em 06/11/2026, o endereço passou a usar a agenda compartilhada, com PostgreSQL Neon gratuito na região São Paulo, autenticação por senha e reservas por link público.

## Vercel e PostgreSQL

A Vercel oferece PostgreSQL por integrações do Marketplace. Para este projeto, use Neon, plano gratuito `free_v3`, região São Paulo (`gru1`). As credenciais são conectadas pela integração como variáveis do servidor. A aceitação dos termos do provedor deve ser concluída pelo titular da conta quando a CLI solicitar.

```bash
npx vercel login
npx vercel link
npx vercel integration add neon --name lava-on-postgres --billing-plan free_v3 --meta region=gru1 --meta auth=false --no-env-pull --json
npx vercel env pull .env.local --environment=production
npm run db:migrate
```

Não copie o conteúdo de `.env.local` para o repositório. Confirme a origem do banco antes de executar comandos; a migração é aditiva e não importa/apaga cadastros demonstrativos. Não use scripts de teste no banco publicado.

Configure no projeto Vercel:

- `DATABASE_URL` ou `POSTGRES_URL`: fornecida pela integração, exclusivamente no servidor.
- `VITE_DATA_MODE=server`: variável pública que seleciona o adaptador compartilhado no build.
- `APP_ORIGIN=https://lava-on.vercel.app`: origem canônica opcional para a validação de requisições do navegador. Links de prévia também podem usar seu próprio host.

A autenticação de proprietário é implementada na API do aplicativo, por isso `auth=false` na integração evita criar outro sistema de acesso separado. A recuperação por e-mail e o envio de notificações ainda não estão configurados.

```bash
npx vercel deploy
# Após validar a prévia e o banco:
npx vercel deploy --prod
```

Use ambientes/bancos separados para desenvolvimento, prévia e produção quando passar dos testes iniciais. Caso conecte a mesma instância a vários ambientes, todos acessam os mesmos cadastros. Nunca exponha credenciais com prefixo `VITE_`.

## Build e rotas

`vercel.json` configura Vite, `npm ci`, `npm run build` e saída estática `dist/`. A pasta `api/` acrescenta funções Node.js; **o modo compartilhado exige essas funções e PostgreSQL**, além dos arquivos estáticos. Não basta copiar `dist` para um host estático nesse modo.

As rotas React retornam `index.html`, inclusive `/schedule/new`, `/schedule/new-week` e `/book/:establishmentId`. `/api/`, assets, ícones e arquivos inexistentes não são convertidos em HTML. A API só aceita `/api/app`; caminhos inválidos retornam erro. O service worker também exclui `/api/` do fallback.

HTML, manifest e service worker usam revalidação. `/assets/` usa nomes com hash e cache imutável por um ano. A API responde com `Cache-Control: private, no-store`; reservas, sessões e dados pessoais não entram no cache da PWA/CDN.

O vínculo `.vercel/` não é versionado. `.vercelignore` exclui arquivos de ambiente, testes, capturas e configurações nativas. `server/` e `api/` fazem parte do deploy. A migração é executada explicitamente antes da publicação, não a cada requisição.

## Demonstração estática

Sem `VITE_DATA_MODE=server`, `npm run build` gera uma demonstração que pode ser hospedada apenas com `dist/`. Não necessita de banco e mantém `joao@lavaon.com.br`/`demo`. Os dados continuam no IndexedDB da mesma origem. Não oferece reservas compartilhadas entre dispositivos.

## Conferir após publicação compartilhada

1. Abrir o endereço público em janela anônima, sem login Vercel.
2. Criar uma conta do proprietário, concluir onboarding, cadastrar serviço e abrir um dia/semana.
3. Copiar o link público e abrir em outro navegador/dispositivo sem sessão.
4. Solicitar uma reserva e verificar pendência e redução de vaga no proprietário.
5. Recusar e confirmar que a vaga voltou à página pública.
6. Reabrir o aplicativo e efetuar login em outro navegador para confirmar persistência compartilhada.
7. Testar acesso direto, arquivos ausentes, cache de API, instalação e aviso de necessidade de conexão.
8. Publicar uma atualização e conferir adiamento, proteção de formulários e preservação dos dados do banco.

A conferência em aparelhos físicos permanece necessária. Não remova proteção global de outros projetos para liberar esta aplicação; use as configurações específicas do Lava On.
