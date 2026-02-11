import {
  applyDiff,
  applyPatchTool,
  codeInterpreterTool,
  computerTool,
  fileSearchTool,
  hostedMcpTool,
  imageGenerationTool,
  shellTool,
  tool,
  webSearchTool,
  type Computer,
  type Editor,
  type Shell,
  type ShellAction,
  type Tool,
} from "@openai/agents";
import { spawn } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import { z } from "zod";

import { ProcessPythonRunner } from "../python/process-python-runner.js";

const DEFAULT_SHELL_TIMEOUT_MS = 30_000;
const DEFAULT_SHELL_MAX_OUTPUT_CHARS = 12_000;
const DEFAULT_LOCAL_SKILL_LIMIT = 128;
const SKILL_FILE_NAME_REGEX = /^skill\.md$/i;

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);
const FALSE_VALUES = new Set(["0", "false", "no", "off"]);

const parseBooleanFlag = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return fallback;
};

const parseInteger = (value: string | undefined, fallback: number, min = 1) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
};

const parseCsv = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const normalizeMcpApproval = (
  value: string | undefined,
): "never" | "always" => {
  const normalized = value?.trim().toLowerCase();
  return normalized === "always" ? "always" : "never";
};

const toMetadataName = (toolValue: Tool): string => {
  if ("name" in toolValue && typeof toolValue.name === "string") {
    return toolValue.name;
  }
  return toolValue.type;
};

const normalizePathForPrompt = (pathValue: string) =>
  pathValue.replace(/\\/g, "/");

const parseFrontmatterValue = (rawValue: string): string => {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};

const parseSkillFrontmatter = (
  content: string,
): { name?: string; description?: string } => {
  const frontmatterMatch = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    return {};
  }

  const fields = frontmatterMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let name: string | undefined;
  let description: string | undefined;
  for (const field of fields) {
    const separatorIndex = field.indexOf(":");
    if (separatorIndex < 0) {
      continue;
    }
    const key = field.slice(0, separatorIndex).trim().toLowerCase();
    const value = parseFrontmatterValue(field.slice(separatorIndex + 1));
    if (key === "name" && value) {
      name = value;
      continue;
    }
    if (key === "description" && value) {
      description = value;
    }
  }
  return { name, description };
};

const extractSkillBodyDescription = (content: string): string => {
  const body = content.replace(/^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/, "");
  const firstLine = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return (firstLine ?? "").slice(0, 180);
};

const listSkillFiles = (roots: readonly string[], maxCount: number) => {
  const collected: string[] = [];
  const visited = new Set<string>();
  const queue = [...roots];

  while (queue.length > 0 && collected.length < maxCount) {
    const next = queue.shift();
    if (!next) continue;
    const resolvedPath = resolve(next);
    if (visited.has(resolvedPath)) continue;
    visited.add(resolvedPath);

    if (!existsSync(resolvedPath)) continue;

    if (SKILL_FILE_NAME_REGEX.test(basename(resolvedPath))) {
      collected.push(resolvedPath);
      continue;
    }

    let entries;
    try {
      entries = readdirSync(resolvedPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (collected.length >= maxCount) break;
      const fullPath = resolve(resolvedPath, entry.name);
      if (entry.isDirectory()) {
        if (
          entry.name === ".git" ||
          entry.name === "node_modules" ||
          entry.name === "dist"
        ) {
          continue;
        }
        queue.push(fullPath);
        continue;
      }
      if (entry.isFile() && SKILL_FILE_NAME_REGEX.test(entry.name)) {
        collected.push(fullPath);
      }
    }
  }

  return collected;
};

export interface LocalSkillDefinition {
  name: string;
  description: string;
  path: string;
}

const discoverLocalSkills = (
  roots: readonly string[],
  maxCount: number,
): readonly LocalSkillDefinition[] => {
  if (maxCount <= 0 || roots.length === 0) {
    return [];
  }

  const skillFiles = listSkillFiles(roots, maxCount);
  const skills: LocalSkillDefinition[] = [];
  const dedupe = new Set<string>();

  for (const skillFile of skillFiles) {
    if (skills.length >= maxCount) break;

    let content = "";
    try {
      content = readFileSync(skillFile, "utf8");
    } catch {
      continue;
    }

    const skillDir = dirname(skillFile);
    const { name: frontmatterName, description: frontmatterDescription } =
      parseSkillFrontmatter(content);
    const name = frontmatterName || basename(skillDir);
    const description =
      frontmatterDescription ||
      extractSkillBodyDescription(content) ||
      "Sem descricao";
    const dedupeKey = `${name.toLowerCase()}::${skillDir.toLowerCase()}`;
    if (dedupe.has(dedupeKey)) {
      continue;
    }
    dedupe.add(dedupeKey);

    skills.push({
      name,
      description,
      path: skillDir,
    });
  }

  return skills;
};

const formatSkillsSystemHint = (skills: readonly LocalSkillDefinition[]) => {
  if (skills.length === 0) return "";
  const lines = [
    "Skills locais disponiveis para uso via shell tool.",
    "Se precisar de uma skill, abra o arquivo SKILL.md no path informado antes de executar comandos.",
    ...skills.map(
      (skill, index) =>
        `${index + 1}. name=${JSON.stringify(skill.name)} description=${JSON.stringify(skill.description)} path=${JSON.stringify(normalizePathForPrompt(skill.path))}`,
    ),
  ];
  return lines.join("\n");
};

const appendTruncationNotice = (
  text: string,
  maxOutputLength: number,
  truncated: boolean,
) => {
  if (!truncated) return text;
  const suffix = `\n[saida truncada para ${maxOutputLength} caracteres]`;
  return text ? `${text}${suffix}` : suffix.trim();
};

class LocalProcessShell implements Shell {
  constructor(
    private readonly workspaceRoot: string,
    private readonly defaultTimeoutMs: number,
    private readonly defaultMaxOutputChars: number,
  ) {}

  async run(action: ShellAction) {
    const timeoutMs =
      typeof action.timeoutMs === "number" && action.timeoutMs > 0
        ? Math.trunc(action.timeoutMs)
        : this.defaultTimeoutMs;
    const maxOutputLength =
      typeof action.maxOutputLength === "number" && action.maxOutputLength > 0
        ? Math.trunc(action.maxOutputLength)
        : this.defaultMaxOutputChars;

    const output = [];
    for (const command of action.commands) {
      const result = await this.runCommand(command, timeoutMs, maxOutputLength);
      output.push(result);
      if (result.outcome.type === "timeout") {
        break;
      }
    }

    return {
      output,
      maxOutputLength,
    };
  }

  private runCommand(
    command: string,
    timeoutMs: number,
    maxOutputLength: number,
  ) {
    return new Promise<{
      stdout: string;
      stderr: string;
      outcome: { type: "timeout" } | { type: "exit"; exitCode: number | null };
    }>((resolveCommand) => {
      const child = spawn(command, {
        cwd: this.workspaceRoot,
        env: process.env,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";
      let totalChars = 0;
      let truncated = false;
      let timedOut = false;
      let settled = false;

      const appendChunk = (
        chunk: Buffer | string,
        target: "stdout" | "stderr",
      ) => {
        const text = chunk.toString();
        if (!text) return;
        if (totalChars >= maxOutputLength) {
          truncated = true;
          return;
        }

        const remaining = maxOutputLength - totalChars;
        const accepted = text.slice(0, remaining);
        if (accepted.length < text.length) {
          truncated = true;
        }

        totalChars += accepted.length;
        if (target === "stdout") {
          stdout += accepted;
          return;
        }
        stderr += accepted;
      };

      const finalize = (
        outcome:
          | { type: "timeout" }
          | { type: "exit"; exitCode: number | null },
      ) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        resolveCommand({
          stdout,
          stderr: appendTruncationNotice(stderr, maxOutputLength, truncated),
          outcome,
        });
      };

      const timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill();
        setTimeout(() => {
          if (!settled) {
            child.kill("SIGKILL");
          }
        }, 500).unref();
      }, timeoutMs);

      child.stdout.on("data", (chunk: Buffer | string) => {
        appendChunk(chunk, "stdout");
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        appendChunk(chunk, "stderr");
      });

      child.on("error", (error) => {
        const message = error instanceof Error ? error.message : String(error);
        stderr = appendTruncationNotice(
          `${stderr}${stderr ? "\n" : ""}${message}`,
          maxOutputLength,
          truncated,
        );
        finalize({ type: "exit", exitCode: 127 });
      });

      child.on("close", (code) => {
        if (timedOut) {
          finalize({ type: "timeout" });
          return;
        }
        finalize({ type: "exit", exitCode: code ?? null });
      });
    });
  }
}

class WorkspacePatchEditor implements Editor {
  constructor(private readonly workspaceRoot: string) {}

  async createFile(
    operation: Extract<
      Parameters<Editor["createFile"]>[0],
      { type: "create_file" }
    >,
  ) {
    const absolutePath = this.resolveWorkspacePath(operation.path);
    const nextContent = applyDiff("", operation.diff, "create");
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, nextContent, "utf8");
    return {
      status: "completed" as const,
      output: `Arquivo criado: ${operation.path}`,
    };
  }

  async updateFile(
    operation: Extract<
      Parameters<Editor["updateFile"]>[0],
      { type: "update_file" }
    >,
  ) {
    const absolutePath = this.resolveWorkspacePath(operation.path);
    const currentContent = await readFile(absolutePath, "utf8");
    const nextContent = applyDiff(currentContent, operation.diff, "default");
    await writeFile(absolutePath, nextContent, "utf8");
    return {
      status: "completed" as const,
      output: `Arquivo atualizado: ${operation.path}`,
    };
  }

  async deleteFile(
    operation: Extract<
      Parameters<Editor["deleteFile"]>[0],
      { type: "delete_file" }
    >,
  ) {
    const absolutePath = this.resolveWorkspacePath(operation.path);
    await rm(absolutePath, { recursive: false, force: false });
    return {
      status: "completed" as const,
      output: `Arquivo removido: ${operation.path}`,
    };
  }

  private resolveWorkspacePath(inputPath: string) {
    const normalized = inputPath.replace(/\\/g, "/");
    const absolutePath = resolve(this.workspaceRoot, normalized);
    const relativePath = relative(this.workspaceRoot, absolutePath);
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
      throw new Error(`Caminho fora do workspace: ${inputPath}`);
    }
    return absolutePath;
  }
}

export interface OpenAIToolingConfig {
  workspaceRoot: string;
  enableWebSearch: boolean;
  enableFileSearch: boolean;
  fileSearchVectorStoreIds: readonly string[];
  enableCodeInterpreter: boolean;
  enableImageGeneration: boolean;
  enableRemoteMcp: boolean;
  mcpServerLabel: string;
  mcpServerUrl?: string;
  mcpConnectorId?: string;
  mcpAuthorization?: string;
  mcpRequireApproval: "never" | "always";
  enableShell: boolean;
  enableApplyPatch: boolean;
  enableFunctionCalling: boolean;
  enableComputerUse: boolean;
  enableSkills: boolean;
  localSkillSearchRoots: readonly string[];
  localSkills: readonly LocalSkillDefinition[];
  enabledSkillNames: readonly string[];
  shellTimeoutMs: number;
  shellMaxOutputChars: number;
  shell?: Shell;
  editor?: Editor;
  computer?: Computer;
}

export interface OpenAIToolingBuildResult {
  tools: Tool[];
  toolNames: string[];
  capabilityNames: string[];
  systemHints: string[];
  warnings: string[];
}

export const resolveOpenAIToolingConfigFromEnv = (
  workspaceRoot = process.cwd(),
): OpenAIToolingConfig => {
  const fileSearchVectorStoreIds = parseCsv(
    process.env.ALICIA_OPENAI_FILE_SEARCH_VECTOR_STORE_IDS,
  );
  const configuredSkillRoots = parseCsv(
    process.env.ALICIA_OPENAI_SKILL_PATHS,
  ).map((root) => resolve(workspaceRoot, root));
  const defaultSkillRoot = resolve(workspaceRoot, "src", "skills");
  const localSkillSearchRoots = [
    ...new Set(
      (configuredSkillRoots.length > 0
        ? configuredSkillRoots
        : [defaultSkillRoot]
      ).map((root) => resolve(root)),
    ),
  ];
  const localSkillLimit = parseInteger(
    process.env.ALICIA_OPENAI_MAX_SKILLS,
    DEFAULT_LOCAL_SKILL_LIMIT,
    1,
  );
  const localSkills = discoverLocalSkills(
    localSkillSearchRoots,
    localSkillLimit,
  );
  const hasMcpEndpoint = Boolean(
    process.env.ALICIA_OPENAI_MCP_SERVER_URL?.trim() ||
    process.env.ALICIA_OPENAI_MCP_CONNECTOR_ID?.trim(),
  );

  return {
    workspaceRoot,
    enableWebSearch: parseBooleanFlag(
      process.env.ALICIA_OPENAI_ENABLE_WEB_SEARCH,
      true,
    ),
    enableFileSearch: parseBooleanFlag(
      process.env.ALICIA_OPENAI_ENABLE_FILE_SEARCH,
      fileSearchVectorStoreIds.length > 0,
    ),
    fileSearchVectorStoreIds,
    enableCodeInterpreter: parseBooleanFlag(
      process.env.ALICIA_OPENAI_ENABLE_CODE_INTERPRETER,
      true,
    ),
    enableImageGeneration: parseBooleanFlag(
      process.env.ALICIA_OPENAI_ENABLE_IMAGE_GENERATION,
      true,
    ),
    enableRemoteMcp: parseBooleanFlag(
      process.env.ALICIA_OPENAI_ENABLE_REMOTE_MCP,
      hasMcpEndpoint,
    ),
    mcpServerLabel:
      process.env.ALICIA_OPENAI_MCP_SERVER_LABEL?.trim() || "alicia-mcp",
    mcpServerUrl: process.env.ALICIA_OPENAI_MCP_SERVER_URL?.trim() || undefined,
    mcpConnectorId:
      process.env.ALICIA_OPENAI_MCP_CONNECTOR_ID?.trim() || undefined,
    mcpAuthorization:
      process.env.ALICIA_OPENAI_MCP_AUTHORIZATION?.trim() || undefined,
    mcpRequireApproval: normalizeMcpApproval(
      process.env.ALICIA_OPENAI_MCP_REQUIRE_APPROVAL,
    ),
    enableShell: parseBooleanFlag(process.env.ALICIA_OPENAI_ENABLE_SHELL, false),
    enableApplyPatch: parseBooleanFlag(
      process.env.ALICIA_OPENAI_ENABLE_APPLY_PATCH,
      false,
    ),
    enableFunctionCalling: parseBooleanFlag(
      process.env.ALICIA_OPENAI_ENABLE_FUNCTION_CALLING,
      true,
    ),
    enableComputerUse: parseBooleanFlag(
      process.env.ALICIA_OPENAI_ENABLE_COMPUTER_USE,
      false,
    ),
    enableSkills: parseBooleanFlag(
      process.env.ALICIA_OPENAI_ENABLE_SKILLS,
      false,
    ),
    localSkillSearchRoots,
    localSkills,
    enabledSkillNames: [],
    shellTimeoutMs: parseInteger(
      process.env.ALICIA_OPENAI_SHELL_TIMEOUT_MS,
      DEFAULT_SHELL_TIMEOUT_MS,
      250,
    ),
    shellMaxOutputChars: parseInteger(
      process.env.ALICIA_OPENAI_SHELL_MAX_OUTPUT_CHARS,
      DEFAULT_SHELL_MAX_OUTPUT_CHARS,
      512,
    ),
  };
};

export const resolveLocalSkillsCatalogFromEnv = (
  workspaceRoot = process.cwd(),
): readonly LocalSkillDefinition[] =>
  resolveOpenAIToolingConfigFromEnv(workspaceRoot).localSkills;

const buildRunPythonTool = () => {
  const pythonRunner = new ProcessPythonRunner();
  return tool({
    name: "run_python_inline",
    description:
      "Executa código Python inline no ambiente local e retorna stdout/stderr para auxiliar a resposta.",
    parameters: z.object({
      code: z.string().min(1),
    }),
    execute: async ({ code }) => {
      const result = await pythonRunner.runInlineScript(code);
      const stdout = result.stdout.trim();
      const stderr = result.stderr.trim();

      if (result.exitCode !== 0) {
        return [
          `python_exit_code=${result.exitCode}`,
          `stderr=${stderr || "(sem detalhes)"}`,
          stdout ? `stdout=${stdout}` : "",
        ]
          .filter(Boolean)
          .join("\n");
      }

      return stdout || "(sem saída)";
    },
  });
};

export const buildOpenAITools = (
  config: OpenAIToolingConfig,
  _model: string,
): OpenAIToolingBuildResult => {
  const tools: Tool[] = [];
  const systemHints: string[] = [];
  const warnings: string[] = [];
  let hasActiveSkills = false;

  if (config.enableWebSearch) {
    tools.push(webSearchTool());
  }

  if (config.enableFileSearch) {
    if (config.fileSearchVectorStoreIds.length === 0) {
      warnings.push(
        "file_search habilitado sem `ALICIA_OPENAI_FILE_SEARCH_VECTOR_STORE_IDS`; tool ignorada.",
      );
    } else {
      tools.push(fileSearchTool([...config.fileSearchVectorStoreIds]));
    }
  }

  if (config.enableCodeInterpreter) {
    tools.push(codeInterpreterTool());
  }

  if (config.enableImageGeneration) {
    tools.push(imageGenerationTool());
  }

  if (config.enableRemoteMcp) {
    if (config.mcpServerUrl) {
      if (config.mcpRequireApproval === "always") {
        tools.push(
          hostedMcpTool({
            serverLabel: config.mcpServerLabel,
            serverUrl: config.mcpServerUrl,
            authorization: config.mcpAuthorization,
            requireApproval: "always",
          }),
        );
      } else {
        tools.push(
          hostedMcpTool({
            serverLabel: config.mcpServerLabel,
            serverUrl: config.mcpServerUrl,
            authorization: config.mcpAuthorization,
            requireApproval: "never",
          }),
        );
      }
    } else if (config.mcpConnectorId) {
      if (config.mcpRequireApproval === "always") {
        tools.push(
          hostedMcpTool({
            serverLabel: config.mcpServerLabel,
            connectorId: config.mcpConnectorId,
            authorization: config.mcpAuthorization,
            requireApproval: "always",
          }),
        );
      } else {
        tools.push(
          hostedMcpTool({
            serverLabel: config.mcpServerLabel,
            connectorId: config.mcpConnectorId,
            authorization: config.mcpAuthorization,
            requireApproval: "never",
          }),
        );
      }
    } else {
      warnings.push(
        "mcp habilitado sem `ALICIA_OPENAI_MCP_SERVER_URL` ou `ALICIA_OPENAI_MCP_CONNECTOR_ID`; tool ignorada.",
      );
    }
  }

  if (config.enableFunctionCalling) {
    tools.push(buildRunPythonTool());
  }

  if (config.enableShell) {
    const shell = config.shell
      ? config.shell
      : new LocalProcessShell(
          config.workspaceRoot,
          config.shellTimeoutMs,
          config.shellMaxOutputChars,
        );
    tools.push(
      shellTool({
        shell,
        needsApproval: false,
      }),
    );
  }

  if (config.enableApplyPatch) {
    const editor = config.editor
      ? config.editor
      : new WorkspacePatchEditor(config.workspaceRoot);
    tools.push(
      applyPatchTool({
        editor,
        needsApproval: false,
      }),
    );
  }

  if (config.enableComputerUse) {
    if (config.computer) {
      tools.push(
        computerTool({
          name: "computer_use_preview",
          computer: config.computer,
          needsApproval: false,
        }),
      );
    } else {
      warnings.push(
        "computer_use habilitado sem implementação de `Computer`; tool ignorada nesta execução.",
      );
    }
  }

  if (config.enableSkills) {
    const normalizedEnabledSkillNames = [
      ...new Set(
        config.enabledSkillNames
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean),
      ),
    ];
    const enabledLookup = new Set(normalizedEnabledSkillNames);
    const enabledSkills = config.localSkills.filter((skill) =>
      enabledLookup.has(skill.name.trim().toLowerCase()),
    );

    if (!config.enableShell) {
      warnings.push(
        "skills habilitadas sem `shell`; skills locais exigem shell local ativo.",
      );
    } else if (config.localSkills.length === 0) {
      warnings.push(
        `skills habilitadas, mas nenhum SKILL.md encontrado nos paths: ${config.localSkillSearchRoots.map(normalizePathForPrompt).join(", ") || "(nenhum)"}.`,
      );
    } else if (enabledSkills.length === 0) {
      warnings.push(
        "skills habilitadas, mas nenhuma skill foi ativada via `/skills`.",
      );
    } else {
      const hint = formatSkillsSystemHint(enabledSkills);
      if (hint) {
        systemHints.push(hint);
        hasActiveSkills = true;
      }

      const enabledNames = new Set(
        enabledSkills.map((skill) => skill.name.trim().toLowerCase()),
      );
      const missingEnabledNames = normalizedEnabledSkillNames.filter(
        (name) => !enabledNames.has(name),
      );
      if (missingEnabledNames.length > 0) {
        warnings.push(
          `skills ativas no runtime nao encontradas no catalogo local: ${missingEnabledNames.join(", ")}.`,
        );
      }
    }
  }

  const toolNames = [...new Set(tools.map(toMetadataName))];
  const capabilityNames = [
    ...toolNames,
    ...(config.enableSkills &&
    config.enableShell &&
    hasActiveSkills
      ? ["skills"]
      : []),
  ];
  return {
    tools,
    toolNames,
    capabilityNames: [...new Set(capabilityNames)],
    systemHints,
    warnings,
  };
};
