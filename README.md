# Lava On

Aplicativo mobile do proprietário para administrar reservas, capacidade diária e serviços de lava-jatos. Esta etapa usa dados fictícios persistidos no aparelho e não depende de backend.

## Executar

Requisitos: Node.js 22.13 ou superior e Expo Go compatível com SDK 57.

```bash
npm install
npm run android
```

No login, a conta demonstrativa já aparece preenchida:

```text
joao@lavaon.com.br
senha: qualquer valor com 4 ou mais caracteres
```

Também é possível criar uma conta nova e concluir o onboarding. Os dados ficam no AsyncStorage do aplicativo.

## Verificações

```bash
npm run typecheck
npm run lint
npm test
npm run format:check
```

## Estrutura

- `src/app`: rotas e layouts do Expo Router.
- `src/features`: telas e componentes por funcionalidade.
- `src/domain`: modelos, contratos e regras puras.
- `src/data`: consultas, repositórios e banco mock persistente.
- `src/providers`: composição de sessão e estado global mínimo.
- `src/shared`: tokens, componentes visuais e utilitários.

As decisões arquiteturais e os limites desta etapa estão em [docs/architecture.md](docs/architecture.md).
