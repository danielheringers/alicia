import { ProcessPythonRunner } from "../python/process-python-runner.js";
import type { OpenAIToolingConfig } from "./openai-tooling.js";

const DEFAULT_COMPUTER_DISPLAY_WIDTH = 1440;
const DEFAULT_COMPUTER_DISPLAY_HEIGHT = 900;
const DEFAULT_COMPUTER_ENVIRONMENT = "browser";

export interface OpenAIResponsesFunctionCall {
  callId: string;
  name: string;
  rawArguments: string;
}

export type OpenAIResponsesToolDefinition = Record<string, unknown> & {
  type: string;
};

export interface OpenAIResponsesToolingBuildResult {
  tools: OpenAIResponsesToolDefinition[];
  toolNames: string[];
  capabilityNames: string[];
  systemHints: string[];
  warnings: string[];
  executeFunctionCall(call: OpenAIResponsesFunctionCall): Promise<string>;
}

type FunctionCallHandler = (args: unknown) => Promise<string>;

const normalizeSkillName = (value: string) => value.trim().toLowerCase();

const normalizePathForPrompt = (value: string) => value.replace(/\\/g, "/");

const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  if (!value) return fallback;
  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const toToolName = (tool: OpenAIResponsesToolDefinition) => {
  const candidate = tool.name;
  if (typeof candidate === "string" && candidate.trim()) {
    return candidate;
  }
  return tool.type;
};

const selectEnabledSkills = (
  config: OpenAIToolingConfig,
  enabledSkillNames: readonly string[],
) => {
  const normalizedEnabled = new Set(
    enabledSkillNames.map((name) => normalizeSkillName(name)),
  );

  return config.localSkills.filter((skill) =>
    normalizedEnabled.has(normalizeSkillName(skill.name)),
  );
};

const formatSkillsSystemHint = (
  skills: readonly OpenAIToolingConfig["localSkills"][number][],
) => {
  if (skills.length === 0) return "";

  const lines = [
    "Skills locais disponiveis para uso via shell tool.",
    "Antes de usar uma skill, abra o arquivo SKILL.md no path informado.",
    ...skills.map(
      (skill, index) =>
        `${index + 1}. name=${JSON.stringify(skill.name)} description=${JSON.stringify(
          skill.description,
        )} path=${JSON.stringify(normalizePathForPrompt(skill.path))}`,
    ),
  ];

  return lines.join("\n");
};

const parseFunctionArguments = (rawArguments: string): unknown => {
  const trimmed = rawArguments.trim();
  if (!trimmed) return {};

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return {
      _raw: rawArguments,
    };
  }
};

const buildRunPythonInlineHandler = (): FunctionCallHandler => {
  const pythonRunner = new ProcessPythonRunner();

  return async (args: unknown) => {
    const code =
      typeof args === "object" &&
      args !== null &&
      "code" in args &&
      typeof (args as { code?: unknown }).code === "string"
        ? (args as { code: string }).code
        : "";

    if (!code.trim()) {
      return "python_exit_code=2\nstderr=Parametro `code` ausente ou invalido.";
    }

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

    return stdout || "(sem saida)";
  };
};

export const buildOpenAIResponsesTools = (
  config: OpenAIToolingConfig,
  enabledSkillNames: readonly string[],
): OpenAIResponsesToolingBuildResult => {
  const tools: OpenAIResponsesToolDefinition[] = [];
  const warnings: string[] = [];
  const systemHints: string[] = [];
  const functionCallHandlers = new Map<string, FunctionCallHandler>();
  let hasActiveSkills = false;

  if (config.enableWebSearch) {
    tools.push({ type: "web_search" });
  }

  if (config.enableFileSearch) {
    if (config.fileSearchVectorStoreIds.length === 0) {
      warnings.push(
        "file_search habilitado sem `ALICIA_OPENAI_FILE_SEARCH_VECTOR_STORE_IDS`; tool ignorada.",
      );
    } else {
      tools.push({
        type: "file_search",
        vector_store_ids: [...config.fileSearchVectorStoreIds],
      });
    }
  }

  if (config.enableCodeInterpreter) {
    tools.push({
      type: "code_interpreter",
      container: { type: "auto" },
    });
  }

  if (config.enableImageGeneration) {
    tools.push({ type: "image_generation" });
  }

  if (config.enableRemoteMcp) {
    if (config.mcpServerUrl) {
      tools.push({
        type: "mcp",
        server_label: config.mcpServerLabel,
        server_url: config.mcpServerUrl,
        authorization: config.mcpAuthorization,
        require_approval: config.mcpRequireApproval,
      });
    } else if (config.mcpConnectorId) {
      tools.push({
        type: "mcp",
        server_label: config.mcpServerLabel,
        connector_id: config.mcpConnectorId,
        authorization: config.mcpAuthorization,
        require_approval: config.mcpRequireApproval,
      });
    } else {
      warnings.push(
        "mcp habilitado sem `ALICIA_OPENAI_MCP_SERVER_URL` ou `ALICIA_OPENAI_MCP_CONNECTOR_ID`; tool ignorada.",
      );
    }
  }

  if (config.enableShell) {
    tools.push({
      type: "shell",
      container: { type: "auto" },
    });
  }

  if (config.enableApplyPatch) {
    tools.push({ type: "apply_patch" });
  }

  if (config.enableComputerUse) {
    tools.push({
      type: "computer_use_preview",
      display_width: parsePositiveInteger(
        process.env.ALICIA_OPENAI_COMPUTER_DISPLAY_WIDTH,
        DEFAULT_COMPUTER_DISPLAY_WIDTH,
      ),
      display_height: parsePositiveInteger(
        process.env.ALICIA_OPENAI_COMPUTER_DISPLAY_HEIGHT,
        DEFAULT_COMPUTER_DISPLAY_HEIGHT,
      ),
      environment:
        process.env.ALICIA_OPENAI_COMPUTER_ENVIRONMENT?.trim() ||
        DEFAULT_COMPUTER_ENVIRONMENT,
    });
  }

  if (config.enableFunctionCalling) {
    functionCallHandlers.set("run_python_inline", buildRunPythonInlineHandler());
    tools.push({
      type: "function",
      name: "run_python_inline",
      description:
        "Executa codigo Python inline no ambiente local e retorna stdout/stderr para auxiliar a resposta.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          code: {
            type: "string",
            description: "Codigo Python para executar inline.",
          },
        },
        required: ["code"],
      },
    });
  }

  if (config.enableSkills) {
    if (!config.enableShell) {
      warnings.push(
        "skills habilitadas sem `shell`; skills locais exigem shell ativo.",
      );
    } else if (config.localSkills.length === 0) {
      warnings.push(
        `skills habilitadas, mas nenhum SKILL.md encontrado nos paths: ${config.localSkillSearchRoots.map(normalizePathForPrompt).join(", ") || "(nenhum)"}.`,
      );
    } else {
      const enabledSkills = selectEnabledSkills(config, enabledSkillNames);
      if (enabledSkills.length === 0) {
        warnings.push(
          "skills habilitadas, mas nenhuma skill foi ativada via `/skills`.",
        );
      } else {
        const hint = formatSkillsSystemHint(enabledSkills);
        if (hint) {
          systemHints.push(hint);
          hasActiveSkills = true;
        }
      }
    }
  }

  const toolNames = [...new Set(tools.map(toToolName))];
  const capabilityNames = [
    ...toolNames,
    ...(config.enableSkills && config.enableShell && hasActiveSkills
      ? ["skills"]
      : []),
  ];

  return {
    tools,
    toolNames,
    capabilityNames: [...new Set(capabilityNames)],
    systemHints,
    warnings,
    async executeFunctionCall(call) {
      const handler = functionCallHandlers.get(call.name);
      if (!handler) {
        return `tool_error=Function '${call.name}' nao implementada.`;
      }
      const args = parseFunctionArguments(call.rawArguments);
      return handler(args);
    },
  };
};
