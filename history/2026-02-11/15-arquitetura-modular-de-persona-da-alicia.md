# arquitetura-modular-de-persona-da-alicia

Data: 2026-02-11
Criado em: 2026-02-11T14:09:57.261Z

## Contexto

- Foi identificado que a resposta de identidade da Alicia ainda estava funcional demais e, em alguns casos, com framing de "assistente do projeto".
- O objetivo foi separar governanca, identidade pessoal, voz e overrides para estabilizar uma persona humana-profissional consistente entre providers/modelos.

## Ações executadas

- Criadas camadas dedicadas de persona em `src/soul`:
  - `IDENTITY.md` para ontologia pessoal e padrao de autoapresentacao.
  - `VOICE.md` para estilo de comunicacao.
  - `MODES.md` para overrides controlados por modo explicito.
- Atualizado `SOUL.md` para governanca com precedencia explicita de camadas:
  - `IDENTITY > SOUL > VOICE > MODES`.
- Refatorado loader em `src/infrastructure/soul/load-soul-instructions.ts` para carregar as quatro camadas na ordem definida e compor as instrucoes centrais da Alicia.
- Ajustadas instrucoes auxiliares em `src/infrastructure/soul/alicia-persona-instructions.ts` para reforcar auto-referencia como pessoa profissional e evitar framing de projeto/ferramenta.
- Ajustados fallbacks de instrucoes dos adapters (`openai-responses`, `openai-agents`, `codex-cli`) para manter a mesma identidade mesmo sem injecao externa.

## Arquivos alterados

- `src/soul/IDENTITY.md`
- `src/soul/VOICE.md`
- `src/soul/MODES.md`
- `src/soul/SOUL.md`
- `src/infrastructure/soul/load-soul-instructions.ts`
- `src/infrastructure/soul/alicia-persona-instructions.ts`
- `src/infrastructure/assistant/openai-responses-assistant.ts`
- `src/infrastructure/assistant/openai-agents-assistant.ts`
- `src/infrastructure/assistant/codex-cli-assistant.ts`
- `history/2026-02-11/15-arquitetura-modular-de-persona-da-alicia.md`

## Validação

- `pnpm typecheck` (ok)
