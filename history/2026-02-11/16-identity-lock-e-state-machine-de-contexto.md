# identity-lock-e-state-machine-de-contexto

Data: 2026-02-11
Criado em: 2026-02-11T14:29:05.759Z

## Contexto

- Foi proposta uma melhoria estrutural para reduzir drift de identidade ("projeto Alicia") e tornar o comportamento mais previsivel por turno.
- A direcao escolhida foi: `Identity Lock` com precedencia alta + state machine comportamental curta, injetada como `system patch` sem poluir o historico.

## Ações executadas

- Estendido o contrato `AssistantRequest` para aceitar contexto adicional sem alterar o historico:
  - `behaviorState?: BehavioralState`
  - `systemPatches?: readonly string[]`
- Implementada state machine heuristica no `SendMessageUseCase` com 6 estados:
  - `idle`, `advisory`, `execution`, `public-facing`, `high-risk`, `recovery`
- Adicionada classificacao deterministica por palavras-chave/padroes e geracao de patch curto por estado.
- Injetado `behaviorState` + `systemPatches` no `assistant.respond` antes da chamada ao provider.
- Reforcado o `Identity Lock` na composicao de instrucoes core da Alicia com regras proibitivas explicitas contra framing de projeto/ferramenta/modelo.
- Propagada leitura de `systemPatches` para os 3 adapters:
  - OpenAI Responses API
  - OpenAI Agents SDK
  - Codex CLI
  de forma que o patch seja concatenado no bloco de instrucoes de sistema em cada turno.

## Arquivos alterados

- `src/application/ports/assistant-port.ts`
- `src/application/use-cases/send-message.ts`
- `src/infrastructure/soul/alicia-persona-instructions.ts`
- `src/infrastructure/assistant/openai-responses-assistant.ts`
- `src/infrastructure/assistant/openai-agents-assistant.ts`
- `src/infrastructure/assistant/codex-cli-assistant.ts`
- `history/2026-02-11/16-identity-lock-e-state-machine-de-contexto.md`

## Validação

- `pnpm typecheck` (ok)
