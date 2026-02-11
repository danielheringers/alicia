# habilitacao-tools-openai-no-adapter

Data: 2026-02-11
Criado em: 2026-02-11T10:52:47.539Z

## Contexto

- Solicitação para a Alicia suportar as ferramentas disponíveis no guia oficial da OpenAI (`/docs/guides/tools`) no provider OpenAI.
- Necessidade de manter o núcleo de aplicação inalterado e concentrar implementação em infraestrutura.

## Ações executadas

- Criação do módulo `src/infrastructure/assistant/openai-tooling.ts` com:
- Registro de tools habilitáveis via ambiente para `web_search`, `file_search`, `code_interpreter`, `image_generation`, `mcp`, `shell`, `apply_patch`, `computer_use` e function calling local (`run_python_inline`).
- Leitura de configuração por variáveis `ALICIA_OPENAI_*` (flags, vector stores, MCP e limites de shell).
- Implementação de executor local de shell (`LocalProcessShell`) com timeout, truncamento de saída e execução sequencial de comandos.
- Implementação de editor de patch (`WorkspacePatchEditor`) com proteção para impedir caminhos fora do workspace e aplicação de diff via `applyDiff`.
- Integração do registry de tools no adapter `OpenAIAgentsAssistantAdapter` com:
- Resolução dinâmica por modelo.
- Inclusão de metadados de tools ativas na resposta.
- Fallback em dois níveis para erro de compatibilidade: primeiro remove tools locais (`shell`, `apply_patch`, `computer`), depois tenta sem tools.
- Adição da dependência `zod` (já prevista na stack do projeto) para schema tipado do function tool.

## Arquivos alterados

- `src/infrastructure/assistant/openai-tooling.ts`
- `src/infrastructure/assistant/openai-agents-assistant.ts`
- `package.json`
- `pnpm-lock.yaml`
- `history/2026-02-11/01-habilitacao-tools-openai-no-adapter.md`

## Validação

- `pnpm typecheck` executado com sucesso após as alterações.
