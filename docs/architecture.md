# Arquitetura do Lava On Web

O Lava On usa React DOM 19.2, TypeScript, Vite, React Router e CSS Modules. A interface foi convertida de React Native/Expo preservando os fluxos do proprietário e os tokens visuais. O software atende navegadores modernos em Android, iOS/iPadOS, Windows, macOS e Linux; instalação como PWA depende dos recursos do navegador e o acesso por link continua disponível.

## Organização

As telas usam hooks de aplicação e contratos de repositório. O domínio não depende da plataforma de interface. React Hook Form e Zod mantêm as validações; TanStack Query mantém consultas e invalidações. Consultas e mutações usam `networkMode: 'always'`, pois não precisam de rede. O gerenciamento de foco utiliza o comportamento web do TanStack Query.

React Router preserva as URLs de acesso, agenda, reservas, serviços e ajustes. A configuração inicial usa `/onboarding`. A restauração da sessão antecede os redirecionamentos. Erros de acesso ao armazenamento aparecem com opção de tentar novamente. Rotas de negócio exigem sessão e estabelecimento; links diretos de detalhes têm retorno à listagem quando não há histórico interno. A proteção é parte da demonstração, sem segurança de autenticação de servidor.

Componentes compartilhados usam HTML, formulários, rótulos, botões, controles de switch e diálogos nativos acessíveis. A navegação permite teclado, toque e mouse. O layout ocupa a largura disponível a partir de 320 px, com limite de 480 px. Áreas seguras, altura dinâmica e teclado virtual são considerados. Ícones do Ionicons são SVGs locais; os ícones instaláveis derivam da gota e da cor já utilizadas na tela de acesso.

## Persistência

O banco `lava-on-demo`, versão IndexedDB 1, contém a object store `state` e a chave `database`. O payload mantém `MockDatabaseState` com `schemaVersion: 1`. Na ausência da chave, o banco recebe os mesmos exemplos comerciais do aplicativo anterior, com datas relativas ao dia atual.

Cada operação lê o estado persistido. Gravações fazem leitura, validação e alteração dentro de uma única transação `readwrite`, evitando que duas abas sobrescrevam alterações concorrentes com um estado antigo. A promessa resolve após o commit. Exceções abortam a transação e preservam o estado anterior. Dados incompatíveis geram erro e não são substituídos por novos exemplos.

Os contratos de repositório não mudaram e não existe API HTTP. Cada operação comercial continua validando o vínculo com o estabelecimento. Uma futura implementação HTTP pode cumprir os mesmos contratos.

## Regras preservadas

- Uma reserva representa um veículo, um serviço e uma unidade de capacidade diária.
- Pendentes, confirmadas e concluídas consomem capacidade; canceladas, recusadas e faltas não consomem.
- Reservas futuras não podem ser concluídas nem marcadas como falta.
- Pendências antigas não podem ser aceitas.
- Alterações de funcionamento não podem invalidar reservas que ainda consomem capacidade.
- Valores monetários ficam em centavos; datas de atendimento usam `YYYY-MM-DD`.
- O fuso padrão do estabelecimento é `America/Sao_Paulo`.

## PWA

`vite-plugin-pwa` gera manifest e service worker com Workbox. Todas as telas são empacotadas e seus recursos entram no precache. Navegações offline retornam `index.html`, permitindo abrir rotas ainda não visitadas. `clientsClaim` controla o primeiro carregamento após ativação; atualizações posteriores aguardam uma ação explícita.

A interface informa preparação offline, conexão e novas versões. Atualizações ficam bloqueadas durante operações de gravação e mutações; campos alterados exigem confirmação de descarte. O estado de edição é marcado por eventos de formulário e mudanças de categoria. Transações salvas e mudanças de tela limpam esse estado. A tentativa de fechar/recarregar a página também usa o aviso padrão do navegador quando há edição ou gravação pendente.

Os dados permanecem no IndexedDB; limpar caches antigos da PWA não limpa o banco. Não existe sincronização ou migração de dados do AsyncStorage. Publicar sob outra origem cria outro armazenamento local.

## Limites

Esta etapa não inclui backend, autenticação real, banco remoto, página pública, pagamentos, horários, funcionários, boxes ou notificações. O armazenamento contém dados demonstrativos e os dispositivos não compartilham cadastros.
