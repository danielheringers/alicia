# Definicao stack e arquitetura

Data: 2026-02-10

## Contexto

- Definição da stack para um assistente de IA rodando localmente e em servidor.
- Requisitos incluíam Clean Architecture, integração com SDKs de mercado, suporte a scripts Python e concorrência.

## Ações executadas

- Escolha de TypeScript/Node.js como base de aplicação.
- Definição de Fastify como servidor por performance, tipagem e modelo de plugins.
- Definição de estratégia multi-provider com adapters para OpenAI, Anthropic e Google.
- Definição de execução de Python por serviço dedicado e modelo de concorrência com fila/workers.

## Arquivos alterados

- Sem alterações de código nesta etapa.

## Validação

- Direção arquitetural consolidada para implementação do projeto.
