# Atualizacao catalogo codex models oficial

## Contexto

- Foi identificado que alguns modelos presentes em `https://developers.openai.com/codex/models` nao estavam no catalogo do provider `codex` da Alicia.

## Acoes

- Atualizado `CODEX_MODEL_CATALOG` para alinhar com os modelos documentados na pagina oficial de modelos do Codex.
- Incluidos modelos faltantes:
  - `gpt-5.3-codex`
  - `gpt-5.2`
  - `gpt-5.1`
  - `gpt-5`
- Mantidos modelos Codex anteriores para compatibilidade (`gpt-5.2-codex`, `gpt-5.1-codex-max`, `gpt-5.1-codex-mini`, `gpt-5.1-codex`, `gpt-5-codex`, `codex-mini-latest`).
- Executada validacao de sincronizacao por login com `/auth status` para confirmar filtragem dinamica de modelos disponiveis.

## Arquivos alterados

- `src/domain/runtime-settings.ts`
- `history/2026-02-10/README.md`
- `history/2026-02-10/18-atualizacao-catalogo-codex-models-oficial.md`

## Validacao

- `pnpm typecheck` executado com sucesso.
- Smoke test:
  - catalogo codex base: `before=10`
  - apos sincronizacao por login: `after=9`
  - modelos retornados no login atual: `gpt-5.3-codex`, `gpt-5.2-codex`, `gpt-5.1-codex-max`, `gpt-5.1-codex-mini`, `gpt-5.1-codex`, `gpt-5-codex`, `gpt-5.2`, `gpt-5.1`, `gpt-5`
