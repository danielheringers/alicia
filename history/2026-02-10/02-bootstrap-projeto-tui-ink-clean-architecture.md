# Bootstrap projeto tui ink clean architecture

Data: 2026-02-10

## Contexto

- Início da implementação do projeto Alicia com interface TUI em Ink.
- Objetivo de montar estrutura clean e fluxo funcional inicial.

## Ações executadas

- Criação da base Node.js/TypeScript com `package.json` e `tsconfig.json`.
- Implementação das camadas `domain`, `application`, `infrastructure` e `interfaces`.
- Criação da TUI com Ink e input interativo.
- Implementação de caso de uso de envio de mensagem e histórico de sessão.
- Implementação de comando `/py` para executar script Python inline.
- Implementação de concorrência com `p-queue`.
- Criação de documentação inicial no `README.md`.

## Arquivos alterados

- `package.json`
- `tsconfig.json`
- `README.md`
- `src/domain/chat-message.ts`
- `src/domain/chat-session.ts`
- `src/domain/index.ts`
- `src/application/ports/assistant-port.ts`
- `src/application/ports/python-runner-port.ts`
- `src/application/ports/task-queue-port.ts`
- `src/application/use-cases/send-message.ts`
- `src/application/services/chat-service.ts`
- `src/application/index.ts`
- `src/infrastructure/assistant/local-assistant.ts`
- `src/infrastructure/python/process-python-runner.ts`
- `src/infrastructure/concurrency/pqueue-task-queue.ts`
- `src/infrastructure/composition/bootstrap.ts`
- `src/infrastructure/index.ts`
- `src/interfaces/tui/hooks/use-chat-controller.ts`
- `src/interfaces/tui/components/chat-app.tsx`
- `src/interfaces/tui/main.tsx`

## Validação

- `pnpm install` executado com sucesso.
- `pnpm typecheck` executado com sucesso.
- `pnpm build` executado com sucesso.
- Smoke test de envio de mensagem e comando `/py` executado com sucesso.
