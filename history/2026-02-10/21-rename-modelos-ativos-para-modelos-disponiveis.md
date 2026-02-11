# rename-modelos-ativos-para-modelos-disponiveis

Data: 2026-02-10
Criado em: 2026-02-10T20:03:04.003Z

## Contexto

- Ajuste textual solicitado na TUI para clareza de UX.
- O indicador no painel Runtime mostrava `Modelos ativos`, mas o correto para o usuário é `Modelos disponíveis`.

## Ações executadas

- Alterado o rótulo exibido no painel Runtime de `Modelos ativos` para `Modelos disponíveis`.
- Mantido o mesmo valor calculado (`runtimeProviderModels.length`), mudando apenas a apresentação.

## Arquivos alterados

- `src/interfaces/tui/components/chat-app.tsx`
- `history/2026-02-10/21-rename-modelos-ativos-para-modelos-disponiveis.md`

## Validação

- `pnpm typecheck` (ok)
