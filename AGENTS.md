# Regras do Projeto Alicia

## Stack oficial do projeto

- Runtime principal: `Node.js` + `TypeScript` (ESM).
- Interface local: `Ink` (TUI baseada em React no terminal).
- Servidor HTTP/API: `Fastify` (modo server para expor os mesmos casos de uso do núcleo).
- Validação de contratos no backend: `zod` (schemas de entrada/saída).
- Observabilidade no backend: `pino` (logs estruturados).
- Orquestração de concorrência: `p-queue`.
- Execução de scripts Python: subprocesso (`python` com fallback `py`).
- Integrações de IA: `OpenAI Agents SDK` em TypeScript (slice inicial implementado) e outros providers via adaptadores de infraestrutura.
- Gerenciador de pacotes: `pnpm`.

## Arquitetura definida (Clean Architecture)

- `src/domain`: entidades e regras de negócio puras (mensagens, sessão, runtime settings).
- `src/application`: casos de uso e portas (`AssistantPort`, `PythonRunnerPort`, `TaskQueuePort`, `RuntimeSettingsPort`).
- `src/infrastructure`: implementações concretas das portas (assistant local, fila, runner Python, composição).
- `src/interfaces`: camada de entrada/saída (TUI em Ink e controladores).

Diretrizes:

- Dependências apontam para dentro: `interfaces` -> `application` -> `domain`.
- `domain` não depende de framework.
- Integrações externas (OpenAI SDK, banco, filas externas, HTTP) entram somente em `infrastructure`.
- Casos de uso não conhecem detalhes de UI nem SDK específico.

## Escopo do projeto (para manter foco)

Objetivo central:

- Construir um assistente de IA que rode localmente (terminal) e possa operar também em servidor, mantendo o mesmo núcleo de domínio e aplicação.

Escopo funcional atual:

- Chat via TUI.
- Comandos de sistema (`/help`, `/settings`, `/py`, `/exit`).
- Configuração de provider/modelo/concorrência em tempo de execução.
- Execução de Python inline com retorno de stdout/stderr.
- Controle de concorrência no processamento de tarefas.
- Roteamento de provider em infraestrutura (`local` e `openai`) preservando `AssistantPort`.
- Integração inicial com `OpenAI Agents SDK` (modelo dinâmico por runtime settings, timeout e retry).

Escopo de evolução (próximas entregas):

- Hardening do adapter `OpenAI Agents SDK` (persistência de sessão, telemetria e testes de integração).
- Modo servidor com `Fastify` reutilizando os mesmos casos de uso.
- Persistência de sessões/mensagens.
- Observabilidade (logs estruturados, métricas, tracing).
- Estratégia de testes por camada (domínio, casos de uso, integração).

Critérios para não nos perdermos:

- Toda nova feature deve declarar: camada alvo, porta afetada, implementação de infraestrutura e validação.
- Evitar lógica de negócio na TUI.
- Evitar acoplamento direto a um único provider no núcleo da aplicação.

## Histórico obrigatório

- Para toda tarefa executada, criar um arquivo em `history/YYYY-MM-DD/<task_title>.md`.
- `<task_title>` deve ser um slug em minúsculas com hífens e prefixo cronológico (`01-`, `02-`, ...).
- Cada arquivo deve registrar: contexto, ações, arquivos alterados e validação.
