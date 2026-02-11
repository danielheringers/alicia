# runtime-em-linha-entre-chat-e-input

Data: 2026-02-11
Criado em: 2026-02-11T12:38:53.386Z

## Contexto

- A TUI exibia os detalhes de runtime em um card lateral, separado da area principal de conversa.
- Foi solicitado mover o runtime para uma linha entre o chat e o input, com truncamento para impedir quebra de linha.

## Ações executadas

- Atualizei `HomeScreen` para montar um resumo de runtime em texto unico (`runtimeSummary`) com provider, modelo, contexto in/out, concorrencia, skills ON e quantidade de modelos disponiveis.
- Inseri um novo bloco de runtime entre o painel `Conversa` e o campo de input.
- Apliquei truncamento com `wrap="truncate-end"` para manter a linha em uma unica linha mesmo em larguras menores.
- Removi o card lateral de runtime para evitar duplicacao da mesma informacao.

## Arquivos alterados

- `src/interfaces/tui/screens/HomeScreen.tsx`
- `history/2026-02-11/08-runtime-em-linha-entre-chat-e-input.md`
- `history/2026-02-11/README.md`

## Validação

- `pnpm typecheck` executado com sucesso.
