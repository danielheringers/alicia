# persistencia-runtime-settings-e-default-codex-com-auth

Data: 2026-02-10
Criado em: 2026-02-10T20:11:31.851Z

## Contexto

- Configurações de runtime (provider/model/concurrency) não persistiam após reiniciar a Alicia.
- Requisito de UX: com auth Codex ativo, o default no startup deve ser `codex` com `gpt-5.3-codex`, exceto quando houver escolha manual já persistida.

## Ações executadas

- Implementado adapter de runtime settings persistente em arquivo (`.alicia/runtime-settings.json`), mantendo normalização de provider/model/concurrency.
- Alterado bootstrap para inicialização assíncrona e cálculo de defaults com prioridade:
  1) configuração persistida em disco;
  2) se não houver persistência e houver auth Codex válido, usar provider `codex` e modelo `gpt-5.3-codex` (ou primeiro disponível);
  3) fallback existente para OpenAI key/defaults.
- Mantido startup rápido sem varredura de todos os modelos Codex no boot.
- Ajustado `ChatService.updateRuntimeSettings` para usar a configuração normalizada ao atualizar concorrência da fila.
- Incluído `.alicia` no `.gitignore` para evitar versionar arquivo de estado local.

## Arquivos alterados

- `src/infrastructure/runtime/persistent-runtime-settings.ts`
- `src/infrastructure/composition/bootstrap.ts`
- `src/interfaces/tui/main.tsx`
- `src/application/services/chat-service.ts`
- `src/infrastructure/index.ts`
- `.gitignore`
- `history/2026-02-10/22-persistencia-runtime-settings-e-default-codex-com-auth.md`

## Validação

- `pnpm typecheck` (ok)
- Smoke test de persistência com `PersistentRuntimeSettings` em arquivo temporário (ok):
  - escrita de `provider=codex`, `model=gpt-5.3-codex`, `concurrency=7`;
  - nova instância leu os mesmos valores.
- Smoke test com `createChatService` em duas reinicializações (ok):
  - set `openai/gpt-5.2/concurrency=5` e leitura persistida no restart;
  - set `codex/gpt-5.3-codex/concurrency=4` e leitura persistida no restart.
