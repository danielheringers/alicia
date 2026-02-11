# migracao-openai-responses-api-no-provider-openai

Data: 2026-02-11
Criado em: 2026-02-11T12:22:54.387Z

## Contexto

- O provider `openai` da Alicia estava baseado no `@openai/agents` e precisava migrar para chamadas diretas da OpenAI Responses API para cobrir tools e casos gerais no mesmo fluxo.
- Era necessario manter compatibilidade com configuracoes atuais de runtime/settings e fallback quando modelos nao suportarem alguma tool.

## Ações executadas

- Criei `OpenAIResponsesAssistantAdapter` em `src/infrastructure/assistant/openai-responses-assistant.ts` com:
- chamada HTTP direta para `POST /v1/responses`,
- retry com backoff e timeout,
- loop de function calling (`function_call` -> `function_call_output`) ate limite de turnos,
- extracao robusta do texto final a partir de `output.message.content`.
- Criei `buildOpenAIResponsesTools` em `src/infrastructure/assistant/openai-responses-tooling.ts` para montar tools da Responses API com base nos flags de ambiente:
- `web_search`, `file_search`, `code_interpreter`, `image_generation`, `mcp`, `shell`, `apply_patch`, `computer_use_preview`, e `function` (`run_python_inline`).
- Mantive suporte a skills locais via hints de sistema quando `shell` + `skills` estiverem habilitados e selecionados em runtime.
- Troquei o bootstrap do provider `openai` para usar `OpenAIResponsesAssistantAdapter`.
- Atualizei exports da camada de infraestrutura.
- Ajustei README para refletir o uso de Responses API e removi referencia a `OPENAI_AGENTS_API`.

## Arquivos alterados

- `src/infrastructure/assistant/openai-responses-assistant.ts` (novo)
- `src/infrastructure/assistant/openai-responses-tooling.ts` (novo)
- `src/infrastructure/composition/bootstrap.ts`
- `src/infrastructure/index.ts`
- `README.md`
- `history/2026-02-11/07-migracao-openai-responses-api-no-provider-openai.md`
- `history/2026-02-11/README.md`

## Validação

- `pnpm typecheck` executado com sucesso.
