# refatoracao-ui-tui-por-camadas

Data: 2026-02-10
Criado em: 2026-02-10T21:13:35.823Z

## Contexto

- Solicitação para refatorar a camada de UI da TUI visando maior manutenibilidade.
- Estrutura alvo proposta: `App`, `components`, `screens`, `hooks`.
- Necessário preservar os fluxos atuais de chat/comandos/settings e comportamento responsivo.

## Ações executadas

- Criado `App.tsx` para orquestrar estados globais da UI (`loading`, `ready`, `error`) e bootstrap assíncrono do chat service.
- Criadas telas dedicadas:
  - `LoadingScreen` para inicialização;
  - `HomeScreen` com toda a interação principal;
  - `ErrorScreen` para falha de bootstrap.
- Extraídos componentes reutilizáveis:
  - `Header`;
  - `Footer`;
  - `ProgressBar`;
  - `StatusLine`.
- Criado hook `useTimer` para animações temporizadas (loading/spinner).
- Introduzido `index.tsx` da TUI e simplificado `main.tsx` para delegar ao novo entrypoint.
- Removido componente monolítico antigo (`components/chat-app.tsx`), movendo sua lógica para `screens/HomeScreen.tsx`.
- Mantidos comportamentos existentes:
  - autocomplete com `/`;
  - comandos (`/help`, `/auth`, `/settings`, `/py`, `/exit`);
  - tela de settings;
  - layout responsivo com sidebar no topo em telas menores.

## Arquivos alterados

- `src/interfaces/tui/main.tsx`
- `src/interfaces/tui/index.tsx`
- `src/interfaces/tui/App.tsx`
- `src/interfaces/tui/components/Header.tsx`
- `src/interfaces/tui/components/Footer.tsx`
- `src/interfaces/tui/components/ProgressBar.tsx`
- `src/interfaces/tui/components/StatusLine.tsx`
- `src/interfaces/tui/screens/LoadingScreen.tsx`
- `src/interfaces/tui/screens/HomeScreen.tsx`
- `src/interfaces/tui/screens/ErrorScreen.tsx`
- `src/interfaces/tui/hooks/useTimer.ts`
- `src/interfaces/tui/components/chat-app.tsx` (removido)
- `history/2026-02-10/24-refatoracao-ui-tui-por-camadas.md`

## Validação

- `pnpm typecheck` (ok)
- `pnpm dev` (ok): loading screen exibida e transição para HomeScreen com layout e comandos funcionais.
