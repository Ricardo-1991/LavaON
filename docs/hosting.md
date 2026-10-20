# Publicar o Lava On

O resultado de `npm run build` está em `dist/`. Publique todos os arquivos, preservando os nomes gerados. Não é necessário servidor Node.js em produção.

## Vercel

Publicado em 20/10/2026: **[https://lava-on.vercel.app](https://lava-on.vercel.app)**, no projeto `ricardo1991s-projects/lava-on`. Esse é o endereço estável para compartilhar com o cliente e instalar a PWA. O acesso foi verificado sem autenticação Vercel.

O projeto inclui `vercel.json` com framework Vite, instalação por `npm ci`, build por `npm run build` e saída em `dist`. As URLs do aplicativo retornam `index.html`, enquanto arquivos e os diretórios de assets e ícones mantêm seu tratamento estático. O HTML e o service worker são revalidados; arquivos com hash em `/assets/` usam cache imutável.

Para publicar pela CLI com sua conta Vercel:

```bash
npx vercel login
npx vercel link
npx vercel deploy --prod
```

Na primeira publicação, crie ou selecione o projeto `lava-on` e use o domínio estável `*.vercel.app` atribuído pela Vercel para os testes do cliente. Confira o acesso em uma janela anônima para garantir que ele não exija uma conta Vercel. Se houver proteção de acesso, ajuste-a somente no projeto de demonstração ou disponibilize um link de compartilhamento.

Nas publicações seguintes, mantenha o mesmo projeto e domínio para conservar o IndexedDB. O vínculo local da conta/projeto em `.vercel/` não é versionado. `.vercelignore` evita enviar documentação, capturas, testes, configurações nativas e arquivos de ambiente para o build remoto. Nenhuma variável de ambiente é necessária para a demonstração.

A conta de demonstração é `joao@lavaon.com.br`, com senha `demo`. Os dados são locais a cada navegador e não são compartilhados entre os dispositivos do cliente.

## Requisitos

- HTTPS para uso do service worker fora de localhost.
- Aplicativo servido na raiz da origem (`/`). O manifest, escopo e fallback usam essa base.
- Retornar `index.html` para URLs de telas que não correspondam a arquivos existentes, incluindo `/reservations/:id`, `/schedule/:date`, `/services/:id` e `/settings/*`.
- Servir JavaScript, CSS, manifest e PNGs com os MIME types correspondentes. O manifest usa `application/manifest+json`.
- Não devolver `index.html` como substituto de assets inexistentes; preserve as versões anteriores dos arquivos com hash durante a transição.

Exemplo Nginx, a adaptar ao domínio e diretório do provedor:

```nginx
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache";
}
location /assets/ {
    try_files $uri =404;
    add_header Cache-Control "public, max-age=31536000, immutable";
}
location = /sw.js {
    add_header Cache-Control "no-cache";
}
location = /manifest.webmanifest {
    default_type application/manifest+json;
    add_header Cache-Control "no-cache";
}
```

HTML, service worker e manifest devem ser revalidados, sem cache permanente. Arquivos de `/assets/` possuem hash e podem usar cache imutável. Demais arquivos sem hash devem ser revalidados. Publique o conjunto completo de forma atômica e mantenha a versão anterior disponível para rollback.

## Conferência após publicação

1. Abrir o link e efetuar login demonstrativo.
2. Abrir diretamente uma rota de detalhe e recarregá-la.
3. Aguardar o aviso de preparação offline, desligar a conexão e usar uma tela ainda não visitada.
4. Criar/editar um serviço e reabrir para verificar persistência.
5. Instalar onde houver suporte e conferir ícone, nome e abertura independente.
6. Publicar outra versão e confirmar que o aviso de atualização aparece sem descartar formulários automaticamente.

Conserve a mesma origem nas atualizações para manter os dados locais. Não há backend, coleta de erros ou monitoramento remoto nesta demonstração. A publicação para testes utiliza a Vercel; domínio personalizado e backend continuam fora desta etapa.
