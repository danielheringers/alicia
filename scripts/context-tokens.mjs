import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { encodingForModel, getEncoding, getEncodingNameForModel } from "js-tiktoken";

const USAGE = `Uso:
  pnpm context:append -- --user "texto do usuario" --assistant "texto do assistente" [--session codex-chat] [--model gpt-5]
  pnpm context:append -- --user-file ./tmp/user.txt --assistant-file ./tmp/assistant.txt [--session codex-chat] [--model gpt-5]
  pnpm context:report -- [--session codex-chat] [--json]
`;

const rawArgs = process.argv.slice(2);
const command = rawArgs[0] && !rawArgs[0].startsWith("--") ? rawArgs[0] : "append";
const args = command === rawArgs[0] ? rawArgs.slice(1) : rawArgs;

const getArgValue = (flag) => {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;

  const value = args[index + 1];
  if (!value || value.startsWith("--")) return undefined;
  return value;
};

const hasFlag = (flag) => args.includes(flag);

const sanitizeSessionName = (value) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "default";
};

const session = sanitizeSessionName(getArgValue("--session") ?? "default");
const model = getArgValue("--model") ?? "gpt-5";
const outputJson = hasFlag("--json");

const historyDir = path.join(process.cwd(), "history", "context");
const historyFile = path.join(historyDir, `${session}.jsonl`);

const resolveTokenizer = (modelName) => {
  try {
    const encodingName = getEncodingNameForModel(modelName);
    return { tokenizer: encodingForModel(modelName), encodingName };
  } catch {
    return { tokenizer: getEncoding("o200k_base"), encodingName: "o200k_base" };
  }
};

const { tokenizer, encodingName } = resolveTokenizer(model);

const countTokens = (text) => tokenizer.encode(text).length;

const readTextInput = async ({ textFlag, fileFlag, label }) => {
  const textValue = getArgValue(textFlag);
  const fileValue = getArgValue(fileFlag);

  if (textValue && fileValue) {
    console.error(`Use apenas ${textFlag} ou ${fileFlag} para ${label}, nao ambos.`);
    process.exit(1);
  }

  if (fileValue) {
    const absolutePath = path.resolve(process.cwd(), fileValue);
    try {
      return await fs.readFile(absolutePath, "utf8");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      console.error(`Nao foi possivel ler ${label} em ${absolutePath}: ${message}`);
      process.exit(1);
    }
  }

  if (typeof textValue === "string") {
    return textValue;
  }

  console.error(`Faltando entrada para ${label}. Informe ${textFlag} ou ${fileFlag}.`);
  process.exit(1);
};

const loadEntries = async () => {
  try {
    const raw = await fs.readFile(historyFile, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    return lines.map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : String(cause);
        throw new Error(`Linha JSON invalida em ${historyFile}:${index + 1} (${message})`);
      }
    });
  } catch (cause) {
    if (typeof cause === "object" && cause && "code" in cause && cause.code === "ENOENT") {
      return [];
    }
    throw cause;
  }
};

const summarize = (entries) => {
  const summary = {
    turns: entries.length,
    userTokens: 0,
    assistantTokens: 0,
    totalTokens: 0,
    lastTurnTokens: 0,
    startedAt: null,
    updatedAt: null,
  };

  for (const entry of entries) {
    summary.userTokens += Number(entry?.user?.tokens ?? 0);
    summary.assistantTokens += Number(entry?.assistant?.tokens ?? 0);
    summary.totalTokens += Number(entry?.turnTokens ?? 0);
  }

  if (entries.length > 0) {
    summary.lastTurnTokens = Number(entries[entries.length - 1]?.turnTokens ?? 0);
    summary.startedAt = entries[0]?.createdAt ?? null;
    summary.updatedAt = entries[entries.length - 1]?.createdAt ?? null;
  }

  return summary;
};

const printSummary = (summary) => {
  const payload = {
    session,
    model,
    encoding: encodingName,
    historyFile,
    ...summary,
  };

  if (outputJson) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log(`Sessao: ${payload.session}`);
  console.log(`Modelo: ${payload.model}`);
  console.log(`Tokenizer: ${payload.encoding}`);
  console.log(`Arquivo: ${payload.historyFile}`);
  console.log(`Turnos: ${payload.turns}`);
  console.log(`Tokens usuario: ${payload.userTokens}`);
  console.log(`Tokens assistente: ${payload.assistantTokens}`);
  console.log(`Tokens totais: ${payload.totalTokens}`);
  console.log(`Tokens ultimo turno: ${payload.lastTurnTokens}`);
  if (payload.startedAt) console.log(`Inicio: ${payload.startedAt}`);
  if (payload.updatedAt) console.log(`Ultima atualizacao: ${payload.updatedAt}`);
};

const appendTurn = async () => {
  const userText = await readTextInput({
    textFlag: "--user",
    fileFlag: "--user-file",
    label: "usuario",
  });
  const assistantText = await readTextInput({
    textFlag: "--assistant",
    fileFlag: "--assistant-file",
    label: "assistente",
  });

  const entry = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    model,
    encoding: encodingName,
    user: {
      text: userText,
      tokens: countTokens(userText),
    },
    assistant: {
      text: assistantText,
      tokens: countTokens(assistantText),
    },
  };
  entry.turnTokens = entry.user.tokens + entry.assistant.tokens;

  await fs.mkdir(historyDir, { recursive: true });
  await fs.appendFile(historyFile, `${JSON.stringify(entry)}\n`, "utf8");

  const entries = await loadEntries();
  printSummary(summarize(entries));
};

const report = async () => {
  const entries = await loadEntries();
  printSummary(summarize(entries));
};

if (hasFlag("--help") || hasFlag("-h")) {
  console.log(USAGE);
  process.exit(0);
}

if (command === "append") {
  await appendTurn();
  process.exit(0);
}

if (command === "report") {
  await report();
  process.exit(0);
}

console.error(`Comando invalido: ${command}\n`);
console.error(USAGE);
process.exit(1);
