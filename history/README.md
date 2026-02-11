# Histórico de tarefas

Padrão de registro:

- Caminho: `history/YYYY-MM-DD/<task_title>.md`
- Para manter ordem cronológica, prefixar o título com índice: `01-`, `02-`, `03-`...
- Exemplo: `history/2026-02-10/03-tela-configuracoes-tui.md`

Gerar novo arquivo:

```bash
pnpm history:new -- --title "titulo da tarefa"
```

O script gera automaticamente o próximo prefixo cronológico da data.
