# Alicia

Assistente de IA com arquitetura clean e interface TUI em React via Ink.

## Stack inicial

- TypeScript + Node.js
- Ink (TUI React)
- Camadas clean em `src/domain`, `src/application`, `src/infrastructure`, `src/interfaces`
- Execução de Python inline com `/py`
- Concorrência com fila em memória (`p-queue`)
- Adapter OpenAI Responses API (`/v1/responses`) com fallback para provider local
- Provider `codex` via Codex CLI (`codex exec`) com autenticação de conta ChatGPT ou API key

## Executar

```bash
pnpm install
pnpm dev
```

Para usar provider OpenAI:

```powershell
# preferencial
$env:OPENAI_API_KEY="sk-..."

# compatibilidade legada suportada no projeto
$env:OPEN_API_KEY="sk-..."
```

### Tools OpenAI no provider `openai`

O adapter da Alicia suporta as tools oficiais do guia:

- `function calling` (`run_python_inline`)
- `web search`
- `file search`
- `image generation`
- `code interpreter`
- `remote MCP`
- `shell` (modo local)
- `apply patch` (modo local)
- `computer use` (quando houver implementação de `Computer`)
- `skills` (metadados de skills locais para uso com `shell`)

Variáveis de ambiente principais:

```powershell
# switches gerais
$env:ALICIA_OPENAI_ENABLE_FUNCTION_CALLING="true"
$env:ALICIA_OPENAI_ENABLE_WEB_SEARCH="true"
$env:ALICIA_OPENAI_ENABLE_FILE_SEARCH="false"
$env:ALICIA_OPENAI_ENABLE_IMAGE_GENERATION="true"
$env:ALICIA_OPENAI_ENABLE_CODE_INTERPRETER="true"
$env:ALICIA_OPENAI_ENABLE_REMOTE_MCP="false"
$env:ALICIA_OPENAI_ENABLE_SHELL="false"
$env:ALICIA_OPENAI_ENABLE_APPLY_PATCH="false"
$env:ALICIA_OPENAI_ENABLE_COMPUTER_USE="false"
$env:ALICIA_OPENAI_ENABLE_SKILLS="false"

# file search
$env:ALICIA_OPENAI_FILE_SEARCH_VECTOR_STORE_IDS="vs_123,vs_456"

# MCP remoto
$env:ALICIA_OPENAI_MCP_SERVER_LABEL="alicia-mcp"
$env:ALICIA_OPENAI_MCP_SERVER_URL="https://meu-mcp.example.com/sse"
$env:ALICIA_OPENAI_MCP_REQUIRE_APPROVAL="never" # ou "always"

# shell local
$env:ALICIA_OPENAI_SHELL_TIMEOUT_MS="30000"
$env:ALICIA_OPENAI_SHELL_MAX_OUTPUT_CHARS="12000"

# computer use (opcional)
$env:ALICIA_OPENAI_COMPUTER_DISPLAY_WIDTH="1440"
$env:ALICIA_OPENAI_COMPUTER_DISPLAY_HEIGHT="900"
$env:ALICIA_OPENAI_COMPUTER_ENVIRONMENT="browser"

# skills locais (paths separados por virgula)
$env:ALICIA_OPENAI_SKILL_PATHS="./src/skills"
$env:ALICIA_OPENAI_MAX_SKILLS="128"
```

Observação de segurança: `shell`, `apply_patch`, `skills`, `computer_use` e `remote_mcp` devem ser habilitados explicitamente no `.env` de acordo com sua política de segurança.

Para usar modelos Codex com autenticação de conta OpenAI/ChatGPT:

```bash
codex login
# ou
codex login --device-auth
```

Depois, na Alicia, abra `/settings` e selecione o provider `codex`.

Obs.: após autenticar, execute `/auth status` para sincronizar os modelos Codex disponíveis no seu login atual. A lista em `/settings` (provider `codex`) passa a exibir apenas os modelos autorizados para essa conta.

## Histórico de tarefas

- Padrão: `history/YYYY-MM-DD/<task_title>.md`
- Ordem cronológica via prefixo automático (`01-`, `02-`, ...).
- Gerar arquivo: `pnpm history:new -- --title "titulo da tarefa"`

## Contagem de tokens de contexto

- O script registra turnos (usuario + assistente) e calcula tokens acumulados por sessão.
- Arquivo de saída: `history/context/<session>.jsonl`.
- Observação: a contagem cobre apenas o que for registrado no script (nao inclui contexto interno oculto da plataforma).

```bash
# adiciona um turno e ja mostra acumulado
pnpm context:append -- --session codex-chat --user "meu prompt" --assistant "sua resposta"

# ou usando arquivos de texto
pnpm context:append -- --session codex-chat --user-file .tmp/user.txt --assistant-file .tmp/assistant.txt

# mostra o total atual da sessao
pnpm context:report -- --session codex-chat
```

## Comandos na TUI

- `/help`: mostra ajuda
- `/auth`: ajuda de autenticação Codex/OpenAI
- `/auth status`: mostra status atual e sincroniza os modelos Codex permitidos nesse login
- `/auth login`: inicia login ChatGPT no Codex CLI (OAuth no browser)
- `/auth device`: inicia login ChatGPT com device code
- `/auth api <OPENAI_API_KEY>`: autentica via API key (e carrega no processo atual)
- `/auth logout`: remove credenciais salvas do Codex CLI
- `/skills`: abre tabela interativa de skills (toggle com `Space`)
- `/skills enable <nome|indice|all>`: habilita skill(s)
- `/skills disable <nome|indice|all>`: desabilita skill(s)
- `/skills toggle <nome|indice>`: alterna skill
- `/settings`: abre a tela de configuração
- `/py print("olá")`: executa script Python inline
- `/exit`: encerra a aplicação

## Tela de configuração

- `↑` e `↓`: selecionam campo
- `←` e `→`: alteram valor
- `Enter`: salva alterações
- `Esc`: cancela alterações

## Tela de skills

- `Up` e `Down`: navegam entre as skills
- `Space`: habilita/desabilita a skill selecionada
- Digitação: filtra skills por nome/descrição em tempo real
- `Backspace`: apaga o filtro
- `Enter` ou `Esc`: volta ao chat
