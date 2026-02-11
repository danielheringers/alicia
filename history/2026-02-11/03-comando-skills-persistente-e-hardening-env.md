# comando-skills-persistente-e-hardening-env

Data: 2026-02-11
Criado em: 2026-02-11T11:33:45.555Z

## Contexto

- Evitar defaults inseguros para recursos sensíveis da OpenAI (`shell`, `apply_patch`, `skills`, `computer_use`, `remote_mcp`) quando não configurados no `.env`.
- Implementar gerenciamento de skills via comando `/skills` com persistência em runtime settings.
- Padronizar catálogo de skills locais na pasta `src/skills`, com uma pasta por skill e `SKILL.md`.

## Ações executadas

- Estendi `RuntimeSettings` com `enabledSkills` e adaptei normalização/persistência (`in-memory` e `persistent`) para manter a lista habilitada entre reinicializações.
- Criei a porta `SkillsCatalogPort` e o adapter `LocalSkillsCatalogAdapter` para listar skills locais descobertas.
- Atualizei `openai-tooling` para:
  - usar `src/skills` como raiz padrão de skills,
  - adicionar `enabledSkillNames` na configuração,
  - filtrar hints de skills apenas para as skills habilitadas no runtime,
  - trocar defaults de ferramentas sensíveis para `false` quando não configuradas explicitamente no `.env`.
- Atualizei `OpenAIAgentsAssistantAdapter` para injetar `enabledSkills` do runtime no build de tools a cada resposta.
- Implementei no `SendMessageUseCase` o comando `/skills` com subcomandos:
  - `list` / padrão,
  - `help`,
  - `enable <nome|indice|all>`,
  - `disable <nome|indice|all>`,
  - `toggle <nome|indice>`.
- Atualizei TUI e help local para expor `/skills` no autocomplete/comandos.
- Adicionei variáveis de segurança no `.env` e documentação no `README`.
- Criei `src/skills/README.md` para orientar o layout de skills por pasta.

## Arquivos alterados

- `.env`
- `README.md`
- `src/domain/runtime-settings.ts`
- `src/application/index.ts`
- `src/application/ports/skills-catalog-port.ts`
- `src/application/use-cases/send-message.ts`
- `src/infrastructure/assistant/local-assistant.ts`
- `src/infrastructure/assistant/openai-agents-assistant.ts`
- `src/infrastructure/assistant/openai-tooling.ts`
- `src/infrastructure/composition/bootstrap.ts`
- `src/infrastructure/index.ts`
- `src/infrastructure/runtime/in-memory-runtime-settings.ts`
- `src/infrastructure/runtime/persistent-runtime-settings.ts`
- `src/infrastructure/skills/local-skills-catalog.ts`
- `src/interfaces/tui/screens/HomeScreen.tsx`
- `src/skills/README.md`
- `history/2026-02-11/03-comando-skills-persistente-e-hardening-env.md`

## Validação

- `pnpm typecheck` (ok)
