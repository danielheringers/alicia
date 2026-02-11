# ajuste-layout-conversa-acima-input

Data: 2026-02-10
Criado em: 2026-02-10T19:58:51.426Z

## Contexto

- Ajuste de UX solicitado: o painel `Conversa` deve ficar imediatamente acima do input.
- No layout anterior, o input estava fora da coluna principal e aparecia após todo o bloco de chat/sidebar.

## Ações executadas

- Reestruturada a área de chat para uma coluna principal com `Conversa` + input acoplado no final da coluna.
- Mantida a sidebar (Runtime/Comandos/Autocomplete) sem alterar o comportamento de comandos.
- Removido o bloco global de input no rodapé e preservado o aviso de retorno ao chat apenas na tela de configurações.

## Arquivos alterados

- `src/interfaces/tui/components/chat-app.tsx`
- `history/2026-02-10/20-ajuste-layout-conversa-acima-input.md`

## Validação

- `pnpm typecheck` (ok)
