# integracao-openai-agents-sdk

Data: 2026-02-10
Criado em: 2026-02-10T18:12:15.964Z

## Contexto

- Usuario pediu para seguir com a demanda de proximo passo: integrar `OpenAI Agents SDK` no fluxo atual.
- O projeto ja estava com clean architecture, TUI em Ink, execucao Python e fila de concorrencia.
- Era necessario manter o `application` sem acoplamento ao provider e preservar fallback local.

## Ações executadas

- Instalado `@openai/agents` e `dotenv`.
- Criado `OpenAIAgentsAssistantAdapter` em `src/infrastructure/assistant/openai-agents-assistant.ts`.
- Implementado timeout, retry para erros transientes e validacao de chave (`OPENAI_API_KEY` com fallback `OPEN_API_KEY`).
- Criado `RoutedAssistantAdapter` em `src/infrastructure/assistant/routed-assistant.ts` para rotear por provider (`local`/`openai`) mantendo fallback.
- Atualizado `createChatService` em `src/infrastructure/composition/bootstrap.ts` para compor adapters por provider.
- Atualizado `src/infrastructure/index.ts` para exportar novos adapters.
- Atualizado `src/interfaces/tui/main.tsx` com `import "dotenv/config"` para carregar ambiente no modo TUI.
- Atualizado documentacao em `README.md` e alinhado escopo em `AGENTS.md`.

## Arquivos alterados

- `src/infrastructure/assistant/openai-agents-assistant.ts`
- `src/infrastructure/assistant/routed-assistant.ts`
- `src/infrastructure/composition/bootstrap.ts`
- `src/infrastructure/index.ts`
- `src/interfaces/tui/main.tsx`
- `README.md`
- `AGENTS.md`
- `package.json`
- `pnpm-lock.yaml`
- `history/2026-02-10/11-integracao-openai-agents-sdk.md`

## Validação

- `pnpm typecheck` concluido com sucesso.
- `pnpm build` concluido com sucesso.
- Smoke test local via `pnpm tsx` confirmou resposta do provider `local`.
- Smoke test com provider `openai` sem chave confirmou erro claro de configuracao.
- Smoke test com provider `openai` em `/help` confirmou fallback para comando local.
