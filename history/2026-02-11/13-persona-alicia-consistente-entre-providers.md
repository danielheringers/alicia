# persona-alicia-consistente-entre-providers

Data: 2026-02-11
Criado em: 2026-02-11T13:48:09.715Z

## Contexto

- O comportamento percebido na TUI passava a impressao de que o provider era a identidade da resposta (ex.: `codex-cli` no cabecalho da mensagem).
- Foi solicitado que, em qualquer provider/modelo, a persona que interage seja sempre a Alicia.

## Ações executadas

- Criado modulo de instrucoes de persona em `src/infrastructure/soul/alicia-persona-instructions.ts` com regras explicitas:
  - Alicia como identidade fixa.
  - Provider/modelo/SDK/CLI como meio tecnico.
  - Proibicao de autoapresentacao como provider/modelo.
- Atualizado `src/infrastructure/composition/bootstrap.ts` para compor `SOUL.md` + regras de persona e injetar essa instrucao base para:
  - `OpenAIResponsesAssistantAdapter`
  - `CodexCliAssistantAdapter`
- Reforcadas instrucoes default dos adapters OpenAI:
  - `src/infrastructure/assistant/openai-responses-assistant.ts`
  - `src/infrastructure/assistant/openai-agents-assistant.ts`
- Atualizado `src/infrastructure/assistant/codex-cli-assistant.ts` para sempre aplicar fallback de instrucoes de persona, mesmo sem injecao externa.
- Ajustada resposta do provider local em `src/infrastructure/assistant/local-assistant.ts` para manter a identidade textual da Alicia.
- Ajustada exibicao de metadata na TUI em `src/interfaces/tui/screens/HomeScreen.tsx`:
  - Para mensagens da assistente, o metadado agora aparece como `via <provider>`, evitando confundir o canal com a identidade.

## Arquivos alterados

- `src/infrastructure/soul/alicia-persona-instructions.ts`
- `src/infrastructure/composition/bootstrap.ts`
- `src/infrastructure/assistant/openai-responses-assistant.ts`
- `src/infrastructure/assistant/openai-agents-assistant.ts`
- `src/infrastructure/assistant/codex-cli-assistant.ts`
- `src/infrastructure/assistant/local-assistant.ts`
- `src/interfaces/tui/screens/HomeScreen.tsx`
- `history/2026-02-11/README.md`
- `history/2026-02-11/13-persona-alicia-consistente-entre-providers.md`

## Validação

- `pnpm typecheck` (ok)
