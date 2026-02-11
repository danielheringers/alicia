# Catalogo OpenAI com contexto na selecao

## Contexto

- Necessidade de disponibilizar na Alicia todos os modelos OpenAI listados na documentacao oficial para escolha em runtime.
- Necessidade de ordenar os modelos do mais recente para o mais antigo e mostrar, para cada modelo selecionado, limites de contexto de input e output.

## Acoes

- Coletado o catalogo de modelos em `https://developers.openai.com/api/docs/models` e os limites por modelo em `https://developers.openai.com/api/docs/models/<model_id>`.
- Expandido `runtime-settings` para manter catalogo por provider com metadados de limites de contexto.
- Atualizada a lista `openai` para incluir todos os modelos documentados no indice oficial, em ordem de recencia da pagina de modelos.
- Implementada funcao `getModelContextLimits(provider, model)` para consulta de limites em toda a aplicacao.
- Atualizada a TUI para exibir:
  - contexto de input/output do modelo atual no cabecalho;
  - posicao do modelo na lista durante `/settings`;
  - limites de input/output do modelo selecionado na tela de configuracoes.
- Atualizado o `LocalAssistantAdapter` para retornar o modelo atual com limites de contexto no texto de status.

## Arquivos alterados

- `src/domain/runtime-settings.ts`
- `src/interfaces/tui/components/chat-app.tsx`
- `src/infrastructure/assistant/local-assistant.ts`
- `history/2026-02-10/README.md`
- `history/2026-02-10/12-catalogo-openai-com-contexto-na-selecao.md`

## Validacao

- `pnpm typecheck` executado com sucesso.
