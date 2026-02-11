# Tela de configuracoes tui

Data: 2026-02-10

## Contexto

- Evolução da TUI para incluir tela de configuração operacional.
- Requisitos: configurar provider, model e concorrência diretamente na interface.

## Ações executadas

- Criação do domínio de `RuntimeSettings` com opções de providers e modelos.
- Criação de porta de configuração e store em memória.
- Extensão do `ChatService` para ler/aplicar configurações em runtime.
- Extensão da fila para permitir ajuste de concorrência dinâmico.
- Atualização do adapter local para refletir configurações atuais.
- Implementação da tela `/settings` com navegação por teclado (`↑/↓`, `←/→`, `Enter`, `Esc`).
- Atualização da documentação no `README.md`.

## Arquivos alterados

- `src/domain/runtime-settings.ts`
- `src/domain/index.ts`
- `src/application/ports/runtime-settings-port.ts`
- `src/application/ports/task-queue-port.ts`
- `src/application/services/chat-service.ts`
- `src/application/index.ts`
- `src/infrastructure/runtime/in-memory-runtime-settings.ts`
- `src/infrastructure/concurrency/pqueue-task-queue.ts`
- `src/infrastructure/assistant/local-assistant.ts`
- `src/infrastructure/composition/bootstrap.ts`
- `src/infrastructure/index.ts`
- `src/interfaces/tui/components/chat-app.tsx`
- `README.md`

## Validação

- `pnpm typecheck` executado com sucesso.
- `pnpm build` executado com sucesso.
- Teste de normalização de runtime settings executado com sucesso.
