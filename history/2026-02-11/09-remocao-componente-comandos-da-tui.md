# remocao-componente-comandos-da-tui

Data: 2026-02-11
Criado em: 2026-02-11T12:44:22.063Z

## Contexto

- Foi solicitado remover o componente visual `Comandos` da tela principal da TUI para reduzir ruido na interface.
- O autocomplete de comandos deveria continuar disponivel sem manter um painel fixo lateral.

## Ações executadas

- Removi o card `Comandos` do layout de chat em `HomeScreen`.
- Mantive o painel de `Autocomplete` apenas quando existir sugestao ativa.
- Ajustei o layout para nao reservar coluna lateral quando nao houver sugestoes.

## Arquivos alterados

- `src/interfaces/tui/screens/HomeScreen.tsx`
- `history/2026-02-11/09-remocao-componente-comandos-da-tui.md`
- `history/2026-02-11/README.md`

## Validação

- `pnpm typecheck` executado com sucesso.
