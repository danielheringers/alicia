# filtro-interativo-no-gerenciador-de-skills

Data: 2026-02-11
Criado em: 2026-02-11T11:58:43.430Z

## Contexto

- Após a introdução da tabela interativa em `/skills`, faltava um jeito rápido de filtrar listas grandes.
- A necessidade era filtrar por digitação no próprio modo skills, sem sair da tela.

## Ações executadas

- Adicionei estado de filtro (`skillsFilter`) na `HomeScreen`.
- Implementei filtro em tempo real por nome e descrição (`filteredSkillsCatalog`).
- Atualizei o modo de teclado da tela skills:
  - `Space` alterna ON/OFF na skill selecionada.
  - Digitação adiciona caracteres ao filtro.
  - `Backspace/Delete` remove caracteres do filtro.
  - `Up/Down` navegam somente entre skills filtradas.
- Ajustei o render para mostrar:
  - valor atual do filtro,
  - quantidade exibida vs total,
  - estado vazio quando nenhum item casar com o filtro.
- Documentei os novos atalhos na seção "Tela de skills" do README.

## Arquivos alterados

- `src/interfaces/tui/screens/HomeScreen.tsx`
- `README.md`
- `history/2026-02-11/06-filtro-interativo-no-gerenciador-de-skills.md`

## Validação

- `pnpm typecheck` executado com sucesso.
