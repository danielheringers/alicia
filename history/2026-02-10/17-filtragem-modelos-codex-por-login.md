# Filtragem modelos codex por login

## Contexto

- Necessidade de listar no provider `codex` apenas os modelos realmente disponíveis para o login atual (OAuth/API key), em vez de sempre mostrar catálogo fixo.

## Acoes

- Adicionada porta `CodexModelDiscoveryPort` na camada de aplicacao.
- Implementado `ProcessCodexModelDiscoveryAdapter` para validar modelos via `codex exec` e detectar os autorizados no login atual.
- Evoluido o dominio de runtime settings para suportar lista de modelos ativa por provider (`getModelsByProvider`, `setModelsByProvider`, `resetModelsByProvider`), mantendo catálogo padrão como base.
- Ajustado `InMemoryRuntimeSettings` para usar lista ativa e fallback seguro quando provider ficar sem modelos.
- Atualizado fluxo `/auth` para sincronizar modelos Codex:
  - `/auth status` sincroniza e mostra a lista ativa.
  - `/auth login`, `/auth device`, `/auth api ...` sincronizam automaticamente após autenticar.
  - `/auth logout` restaura catálogo padrão.
- Atualizada TUI para ler lista dinâmica de modelos por provider e lidar com cenário sem modelos.
- Atualizado README com orientação de sincronização e comportamento do `/auth status`.

## Arquivos alterados

- `src/application/ports/codex-model-discovery-port.ts`
- `src/application/index.ts`
- `src/application/use-cases/send-message.ts`
- `src/domain/runtime-settings.ts`
- `src/infrastructure/auth/process-codex-model-discovery.ts`
- `src/infrastructure/runtime/in-memory-runtime-settings.ts`
- `src/infrastructure/composition/bootstrap.ts`
- `src/infrastructure/assistant/codex-cli-assistant.ts`
- `src/infrastructure/index.ts`
- `src/interfaces/tui/components/chat-app.tsx`
- `README.md`
- `history/2026-02-10/README.md`
- `history/2026-02-10/17-filtragem-modelos-codex-por-login.md`

## Validacao

- `pnpm typecheck` executado com sucesso.
- Smoke test via `ChatService`:
  - `before=6` modelos Codex (catalogo padrão)
  - `after=5` após `/auth status` (filtrados por login atual)
  - resposta de status confirmou sincronização de modelos ativos.
