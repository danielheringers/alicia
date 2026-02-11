# Padrao historico de tarefas

Data: 2026-02-10

## Contexto

- Solicitação para manter histórico consistente por tarefa no formato `history/{date}/{task_title}.md`.

## Ações executadas

- Criação de regra persistente em `AGENTS.md`.
- Criação de script para gerar entradas no padrão solicitado.
- Criação de documentação do padrão em `history/README.md`.

## Arquivos alterados

- `AGENTS.md`
- `scripts/new-history-entry.mjs`
- `package.json`
- `history/README.md`
- `history/2026-02-10/04-padrao-historico-de-tarefas.md`

## Validação

- Estrutura criada no caminho solicitado.
- Script disponível via `pnpm history:new`.
- `pnpm typecheck` executado com sucesso após as alterações.
