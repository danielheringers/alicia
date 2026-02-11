import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const args = process.argv.slice(2);

const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  return args[index + 1];
};

const toSlug = (value) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const title = getArgValue("--title");
const customDate = getArgValue("--date");

if (!title) {
  console.error("Uso: pnpm history:new -- --title \"titulo da tarefa\" [--date YYYY-MM-DD]");
  process.exit(1);
}

const now = new Date();
const date = customDate ?? now.toISOString().slice(0, 10);
const slug = toSlug(title);

if (!slug) {
  console.error("Titulo invalido para gerar slug.");
  process.exit(1);
}

const historyDir = path.join(process.cwd(), "history", date);
await fs.mkdir(historyDir, { recursive: true });

const existingEntries = await fs.readdir(historyDir).catch(() => []);
const nextIndex =
  existingEntries
    .map((entry) => {
      const match = entry.match(/^(\d+)-.+\.md$/);
      return match ? Number(match[1]) : 0;
    })
    .reduce((max, current) => Math.max(max, current), 0) + 1;

const indexPrefix = String(nextIndex).padStart(2, "0");
const fileName = `${indexPrefix}-${slug}.md`;
const targetFile = path.join(historyDir, fileName);

const template = `# ${title}

Data: ${date}
Criado em: ${now.toISOString()}

## Contexto

- 

## Ações executadas

- 

## Arquivos alterados

- 

## Validação

- 
`;

try {
  await fs.access(targetFile);
  console.error(`Arquivo já existe: ${targetFile}`);
  process.exit(1);
} catch {
  await fs.writeFile(targetFile, template, "utf8");
  console.log(targetFile);
}
