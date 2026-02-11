# Autenticacao OpenAI Codex e provider codex

## Contexto

- Necessidade de autenticar conta OpenAI/ChatGPT para uso de modelos Codex, conforme documentacao oficial de auth do Codex.
- Necessidade de operar esse fluxo dentro da Alicia sem depender de comandos externos manuais.

## Acoes

- Adicionada porta de autenticacao `CodexAuthPort` na camada de aplicacao.
- Implementado adapter `ProcessCodexAuthAdapter` na infraestrutura para executar:
  - `codex login`
  - `codex login --device-auth`
  - `codex login --with-api-key`
  - `codex login status`
  - `codex logout`
- Adicionado comando `/auth` no caso de uso de envio de mensagens com subcomandos:
  - `/auth help`
  - `/auth status`
  - `/auth login`
  - `/auth device`
  - `/auth api <OPENAI_API_KEY>`
  - `/auth logout`
- Aplicada sanitizacao de historico para `/auth api ...`, evitando persistir a chave em claro no chat.
- Criado provider `codex` no dominio com catalogo de modelos Codex e limites de contexto.
- Implementado `CodexCliAssistantAdapter` (infraestrutura) para responder via `codex exec` com modelo selecionado em runtime.
- Integrada composicao para rotear provider `codex` e injetar porta de autenticacao no caso de uso.
- Atualizada TUI para incluir `/auth` no autocomplete e na lista de comandos exibida.
- Atualizado README com fluxo de autenticacao e uso do provider `codex`.

## Arquivos alterados

- `src/application/ports/codex-auth-port.ts`
- `src/application/index.ts`
- `src/application/use-cases/send-message.ts`
- `src/domain/runtime-settings.ts`
- `src/infrastructure/auth/process-codex-auth.ts`
- `src/infrastructure/assistant/codex-cli-assistant.ts`
- `src/infrastructure/assistant/local-assistant.ts`
- `src/infrastructure/composition/bootstrap.ts`
- `src/infrastructure/index.ts`
- `src/interfaces/tui/components/chat-app.tsx`
- `README.md`
- `history/2026-02-10/README.md`
- `history/2026-02-10/16-autenticacao-openai-codex-e-provider-codex.md`

## Validacao

- `pnpm typecheck` executado com sucesso.
- Smoke test de `/auth status` via `ChatService` retornando status de autenticacao.
- Smoke test com provider `codex` e modelo `gpt-5-codex` retornando resposta.
