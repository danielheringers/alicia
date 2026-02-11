# integracao-soul-core-no-runtime

Data: 2026-02-11
Criado em: 2026-02-11T13:37:32.936Z

## Contexto

- O arquivo `src/soul/SOUL.md` foi definido como contrato central de comportamento da Alicia.
- Era necessario garantir que as instrucoes do SOUL fossem aplicadas no runtime dos providers usados na conversa.

## Ações executadas

- Adicionado loader dedicado em `src/infrastructure/soul/load-soul-instructions.ts` para:
  - Resolver caminho via `ALICIA_SOUL_PATH` (quando configurado) ou fallback para `src/soul/SOUL.md`.
  - Remover frontmatter YAML antes de montar instrucoes enviadas aos modelos.
  - Falhar com erro explicito quando o arquivo estiver vazio.
- Atualizado `src/infrastructure/composition/bootstrap.ts` para carregar o SOUL no startup e injetar como `systemInstructions` nos adapters:
  - `OpenAIResponsesAssistantAdapter`
  - `CodexCliAssistantAdapter`
- Atualizado `src/infrastructure/assistant/openai-responses-assistant.ts` para compor:
  - `SOUL` + instrucoes default da Alicia (estilo/idioma/objetividade).
- Atualizado `src/infrastructure/assistant/openai-agents-assistant.ts` com a mesma composicao para manter paridade quando esse adapter for usado.
- Atualizado `src/infrastructure/assistant/codex-cli-assistant.ts` para incluir SOUL no prompt enviado ao `codex exec` como bloco `[system]`.
- Adicionada variavel `ALICIA_SOUL_PATH` em `.env` quando ausente, evitando path fixo inflexivel no codigo.

## Arquivos alterados

- `.env`
- `src/infrastructure/soul/load-soul-instructions.ts`
- `src/infrastructure/composition/bootstrap.ts`
- `src/infrastructure/assistant/openai-responses-assistant.ts`
- `src/infrastructure/assistant/openai-agents-assistant.ts`
- `src/infrastructure/assistant/codex-cli-assistant.ts`
- `history/2026-02-11/README.md`
- `history/2026-02-11/12-integracao-soul-core-no-runtime.md`

## Validação

- `pnpm typecheck` (ok)
