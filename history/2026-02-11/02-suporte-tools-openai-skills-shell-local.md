# suporte-tools-openai-skills-shell-local

Data: 2026-02-11
Criado em: 2026-02-11T11:03:04.175Z

## Contexto

- Expandir o suporte do provider `openai` para cobrir todas as tools listadas no guia oficial (`tools`), fechando o gap de `skills` no fluxo local com Agents SDK.
- Manter compatibilidade com a arquitetura atual (OpenAI Agents SDK + shell/apply_patch locais) sem quebrar fallback nem seleção de tools já implementadas.

## Ações executadas

- Consultei a documentação oficial via skill `openai-docs` (`tools`, `tools-shell`, `tools-skills`, `tools-apply-patch`, `tools-computer-use`) para confirmar a lista de capacidades e limites.
- Atualizei `openai-tooling.ts` para:
  - adicionar descoberta de skills locais via `SKILL.md` (parse de frontmatter e descrição),
  - adicionar configuração por env (`ALICIA_OPENAI_ENABLE_SKILLS`, `ALICIA_OPENAI_SKILL_PATHS`, `ALICIA_OPENAI_MAX_SKILLS`),
  - gerar `systemHints` para o modelo com `name`, `description` e `path` das skills em modo shell local,
  - expor `capabilityNames` além de `toolNames`, mantendo warnings de configuração.
- Atualizei `openai-agents-assistant.ts` para:
  - compor `instructions` com os `systemHints` de tooling (skills),
  - refletir capacidades ativas em `metadata.capabilities`,
  - ajustar metadados nos caminhos de fallback (`without-local-tools` e `without-tools`).
- Atualizei o `README.md` com seção de configuração de tools OpenAI e variáveis de ambiente relevantes (incluindo skills locais).

## Arquivos alterados

- `src/infrastructure/assistant/openai-tooling.ts`
- `src/infrastructure/assistant/openai-agents-assistant.ts`
- `README.md`
- `history/2026-02-11/02-suporte-tools-openai-skills-shell-local.md`

## Validação

- `pnpm typecheck` (ok)
