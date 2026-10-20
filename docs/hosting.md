# Publicar o Lava On

O resultado de `npm run build` está em `dist/`. Publique todos os arquivos, preservando os nomes gerados. Não é necessário servidor Node.js em produção.

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

Conserve a mesma origem nas atualizações para manter os dados locais. Não há backend, coleta de erros ou monitoramento remoto nesta demonstração. A seleção do provedor, domínio e publicação não fazem parte da migração.
