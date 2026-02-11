# reordenacao-sidebar-em-tela-menor

Data: 2026-02-10
Criado em: 2026-02-10T20:21:09.637Z

## Contexto

- Ajuste de usabilidade solicitado para terminais menores.
- Em layout estreito, `Runtime` e `Comandos` estavam abaixo do bloco de conversa, prejudicando leitura do estado e uso do input.

## Ações executadas

- Refatorado o bloco de renderização da tela de chat para extrair `chatColumn` e `sidebarColumn`.
- Implementada ordem condicional:
  - layout estreito: `sidebar` primeiro (abaixo do header), depois `chat + input`;
  - layout largo: mantém `chat` à esquerda e `sidebar` à direita.
- Mantidos os mesmos conteúdos e comportamentos (autocomplete, status, comandos e input).

## Arquivos alterados

- `src/interfaces/tui/components/chat-app.tsx`
- `history/2026-02-10/23-reordenacao-sidebar-em-tela-menor.md`

## Validação

- `pnpm typecheck` (ok)
