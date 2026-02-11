# tabela-interativa-para-comando-skills

Data: 2026-02-11
Criado em: 2026-02-11T11:54:18.547Z

## Contexto

- O comando `/skills` estava retornando uma lista textual longa, com leitura ruim no terminal.
- Precisávamos de uma experiência navegável na TUI, com descrição resumida por linha e toggle rápido de skill via teclado.

## Ações executadas

- Adicionei um modo dedicado `skills` na `HomeScreen`, aberto quando o usuário envia `/skills`.
- Criei o componente `SkillsTable` para renderização em tabela com colunas (`#`, `Status`, `Skill`, `Descricao`), descrições resumidas em uma linha e recorte por largura.
- Implementei navegação por `Up/Down` e alternância de status com `Space`, persistindo imediatamente no runtime settings.
- Adicionei paginação visual da tabela por altura de terminal (`maxRows`) para manter legibilidade em listas maiores.
- Expus o catálogo de skills no `ChatService` para a interface consultar as skills disponíveis sem parsing de texto.

## Arquivos alterados

- `src/interfaces/tui/screens/HomeScreen.tsx`
- `src/interfaces/tui/components/SkillsTable.tsx`
- `src/application/services/chat-service.ts`
- `src/infrastructure/composition/bootstrap.ts`
- `history/2026-02-11/05-tabela-interativa-para-comando-skills.md`

## Validação

- `pnpm typecheck` executado com sucesso.
- Fluxo validado em código:
  - `/skills` abre tela de tabela.
  - `Up/Down` movimenta seleção.
  - `Space` habilita/desabilita e persiste em runtime settings.
  - `Enter/Esc` fecha a tela e volta ao chat.
