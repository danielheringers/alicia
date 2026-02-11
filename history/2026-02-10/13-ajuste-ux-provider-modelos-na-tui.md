# Ajuste UX provider modelos na TUI

## Contexto

- Ao executar `pnpm dev`, a selecao de modelo aparentava ter apenas `local-echo-v1`.
- O comportamento ocorria porque os modelos sao filtrados por `provider`, e o default era `local`.

## Acoes

- Ajustado bootstrap para iniciar com `provider=openai` quando `OPENAI_API_KEY` (ou `OPEN_API_KEY`) estiver configurada.
- Mantido `local` como fallback quando nao houver chave.
- Melhorada a tela `/settings` com indicacao explicita de que o catalogo depende do provider.
- Adicionada exibicao da quantidade de modelos disponiveis no provider atual.

## Arquivos alterados

- `src/infrastructure/composition/bootstrap.ts`
- `src/interfaces/tui/components/chat-app.tsx`
- `history/2026-02-10/README.md`
- `history/2026-02-10/13-ajuste-ux-provider-modelos-na-tui.md`

## Validacao

- `pnpm typecheck` executado com sucesso.
