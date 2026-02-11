# Hot reload no dev com tsx watch

## Contexto

- Necessidade de evitar reiniciar manualmente o processo em desenvolvimento a cada alteração de código.

## Acoes

- Alterado script `dev` para executar com watcher do `tsx`.
- Script atualizado de `tsx src/interfaces/tui/main.tsx` para `tsx watch src/interfaces/tui/main.tsx`.

## Arquivos alterados

- `package.json`
- `history/2026-02-10/README.md`
- `history/2026-02-10/15-hot-reload-no-dev-com-tsx-watch.md`

## Validacao

- `pnpm typecheck` executado com sucesso.
