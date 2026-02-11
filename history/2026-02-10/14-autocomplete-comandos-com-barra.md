# Autocomplete comandos com barra

## Contexto

- Necessidade de autocomplete de comandos no chat da Alicia ao digitar `/`.
- Objetivo de mostrar comandos disponíveis e permitir seleção rápida no teclado.

## Acoes

- Adicionado catálogo de comandos da TUI (`/help`, `/settings`, `/py`, `/exit`) com descrição.
- Implementada lista de sugestões quando o input inicia com `/`.
- Implementada navegação de sugestões por `↑/↓` e `Tab`.
- Implementada confirmação por `Enter`:
  - se o texto ainda for parcial, o comando selecionado é completado no input;
  - se já estiver completo, mantém fluxo normal de execução.
- Mantida UX atual de `/settings` sem interferência do autocomplete.

## Arquivos alterados

- `src/interfaces/tui/components/chat-app.tsx`
- `history/2026-02-10/README.md`
- `history/2026-02-10/14-autocomplete-comandos-com-barra.md`

## Validacao

- `pnpm typecheck` executado com sucesso.
