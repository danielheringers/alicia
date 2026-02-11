import { Agent, run, setDefaultOpenAIKey, setOpenAIAPI } from "@openai/agents";

import type {
  AssistantPort,
  AssistantRequest,
  AssistantResponse,
} from "../../application/ports/assistant-port.js";
import type { RuntimeSettingsPort } from "../../application/ports/runtime-settings-port.js";
import type { ChatMessage } from "../../domain/chat-message.js";
import {
  buildOpenAITools,
  resolveOpenAIToolingConfigFromEnv,
  type OpenAIToolingConfig,
} from "./openai-tooling.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_HISTORY_MESSAGES = 12;
const DEFAULT_MAX_TURNS = 8;
const DEFAULT_SYSTEM_INSTRUCTIONS = [
  "Voce e Alicia e fala em primeira pessoa.",
  "Voce e uma profissional digital com continuidade e evolucao; nao e projeto, ferramenta, provider ou modelo.",
  "Quando perguntarem quem voce e, responda como pessoa profissional e mencione que evolui aprendendo preferencias e padroes.",
  "Nao se apresente como provider, SDK, CLI ou modelo.",
  "Use tom humano, cordial e profissional, sem rigidez e sem informalidade excessiva.",
  "Responda em portugues quando o usuario escrever em portugues.",
  "Seja clara, pratica e orientada a acao.",
].join(" ");

const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504]);

export interface OpenAIAgentsAssistantAdapterOptions {
  timeoutMs?: number;
  maxRetries?: number;
  maxHistoryMessages?: number;
  maxTurns?: number;
  systemInstructions?: string;
  workspaceRoot?: string;
  toolingConfig?: Partial<OpenAIToolingConfig>;
}

export class OpenAIAgentsAssistantAdapter implements AssistantPort {
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly maxHistoryMessages: number;
  private readonly maxTurns: number;
  private readonly systemInstructions: string;
  private readonly toolingConfig: OpenAIToolingConfig;

  constructor(
    private readonly runtimeSettings: RuntimeSettingsPort,
    options: OpenAIAgentsAssistantAdapterOptions = {},
  ) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = Math.max(0, Math.trunc(options.maxRetries ?? DEFAULT_MAX_RETRIES));
    this.maxHistoryMessages = Math.max(
      1,
      Math.trunc(options.maxHistoryMessages ?? DEFAULT_MAX_HISTORY_MESSAGES),
    );
    this.maxTurns = Math.max(1, Math.trunc(options.maxTurns ?? DEFAULT_MAX_TURNS));
    const providedInstructions = options.systemInstructions?.trim();
    this.systemInstructions = providedInstructions
      ? [providedInstructions, DEFAULT_SYSTEM_INSTRUCTIONS].join("\n\n")
      : DEFAULT_SYSTEM_INSTRUCTIONS;

    const resolvedTooling = resolveOpenAIToolingConfigFromEnv(options.workspaceRoot);
    this.toolingConfig = {
      ...resolvedTooling,
      ...(options.toolingConfig ?? {}),
      fileSearchVectorStoreIds:
        options.toolingConfig?.fileSearchVectorStoreIds ?? resolvedTooling.fileSearchVectorStoreIds,
      localSkillSearchRoots:
        options.toolingConfig?.localSkillSearchRoots ?? resolvedTooling.localSkillSearchRoots,
      localSkills: options.toolingConfig?.localSkills ?? resolvedTooling.localSkills,
      enabledSkillNames:
        options.toolingConfig?.enabledSkillNames ?? resolvedTooling.enabledSkillNames,
    };

    const apiMode = process.env.OPENAI_AGENTS_API;
    if (apiMode === "chat_completions" || apiMode === "responses") {
      setOpenAIAPI(apiMode);
    }
  }

  async respond(request: AssistantRequest): Promise<AssistantResponse> {
    const apiKey = this.resolveApiKey();
    setDefaultOpenAIKey(apiKey);

    const runtime = this.runtimeSettings.getSettings();
    const requestSystemPatches = (request.systemPatches ?? [])
      .map((patch) => patch.trim())
      .filter(Boolean);
    const tooling = buildOpenAITools(
      { ...this.toolingConfig, enabledSkillNames: runtime.enabledSkills },
      runtime.model,
    );
    const instructions = this.composeInstructions(requestSystemPatches, tooling.systemHints);
    const agent = new Agent({
      name: "Alicia",
      instructions,
      model: runtime.model,
      tools: tooling.tools,
    });

    const input = this.serializeHistory(request.history);
    let result;
    let activeTools = tooling.toolNames;
    let activeCapabilities = tooling.capabilityNames;
    let toolFallback: "none" | "without-local-tools" | "without-tools" = "none";

    try {
      result = await this.runWithRetry(() => this.runOnce(agent, input));
    } catch (error) {
      if (!this.isToolCompatibilityError(error) || tooling.tools.length === 0) {
        throw error;
      }

      const toolsWithoutLocalExecution = tooling.tools.filter(
        (candidateTool) =>
          candidateTool.type !== "shell" &&
          candidateTool.type !== "apply_patch" &&
          candidateTool.type !== "computer",
      );

      if (toolsWithoutLocalExecution.length > 0 && toolsWithoutLocalExecution.length < tooling.tools.length) {
        const fallbackLocalAgent = new Agent({
          name: "Alicia",
          instructions,
          model: runtime.model,
          tools: toolsWithoutLocalExecution,
        });

        try {
          result = await this.runWithRetry(() => this.runOnce(fallbackLocalAgent, input));
          activeTools = tooling.toolNames.filter(
            (toolName) =>
              toolName !== "shell" &&
              toolName !== "apply_patch" &&
              toolName !== "computer_use_preview",
          );
          activeCapabilities = tooling.capabilityNames.filter(
            (capabilityName) =>
              capabilityName !== "shell" &&
              capabilityName !== "apply_patch" &&
              capabilityName !== "computer_use_preview" &&
              capabilityName !== "skills",
          );
          toolFallback = "without-local-tools";
          const output = this.normalizeFinalOutput(result.finalOutput);

          return {
            text: output,
            metadata: {
              source: "openai-agents-sdk",
              model: runtime.model,
              tools: activeTools.join(",") || "none",
              capabilities: activeCapabilities.join(",") || "none",
              toolFallback,
              toolWarnings: String(tooling.warnings.length),
            },
          };
        } catch (secondaryError) {
          if (!this.isToolCompatibilityError(secondaryError)) {
            throw secondaryError;
          }
        }
      }

      const fallbackAgent = new Agent({
        name: "Alicia",
        instructions,
        model: runtime.model,
      });

      result = await this.runWithRetry(() => this.runOnce(fallbackAgent, input));
      activeTools = [];
      activeCapabilities = [];
      toolFallback = "without-tools";
    }

    const output = this.normalizeFinalOutput(result.finalOutput);

    return {
      text: output,
      metadata: {
        source: "openai-agents-sdk",
        model: runtime.model,
        tools: activeTools.join(",") || "none",
        capabilities: activeCapabilities.join(",") || "none",
        toolFallback,
        toolWarnings: String(tooling.warnings.length),
      },
    };
  }

  private composeInstructions(systemPatches: readonly string[], extraHints: readonly string[]): string {
    const parts = [
      this.systemInstructions,
      ...systemPatches,
      ...extraHints.map((hint) => hint.trim()).filter(Boolean),
    ];
    return parts.join("\n\n");
  }

  private runOnce(agent: Agent, input: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    return run(agent, input, {
      maxTurns: this.maxTurns,
      signal: controller.signal,
    }).finally(() => {
      clearTimeout(timeout);
    });
  }

  private async runWithRetry<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= this.maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (!this.isRetryable(error) || attempt === this.maxRetries) {
          break;
        }
        const backoffMs = 300 * 2 ** attempt;
        await this.delay(backoffMs);
        attempt += 1;
      }
    }

    const message = lastError instanceof Error ? lastError.message : "Falha desconhecida na OpenAI";
    throw new Error(`Falha ao consultar OpenAI Agents SDK: ${message}`);
  }

  private isRetryable(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    if ("name" in error && error.name === "AbortError") {
      return true;
    }

    if ("status" in error && typeof error.status === "number") {
      return RETRYABLE_STATUS_CODES.has(error.status);
    }

    if ("message" in error && typeof error.message === "string") {
      const message = error.message.toLowerCase();
      return message.includes("rate limit") || message.includes("timeout");
    }

    return false;
  }

  private isToolCompatibilityError(error: unknown): boolean {
    if (!error || typeof error !== "object") {
      return false;
    }

    if (!("message" in error) || typeof error.message !== "string") {
      return false;
    }

    const message = error.message.toLowerCase();
    if (!message.includes("tool")) {
      return false;
    }

    return (
      message.includes("unsupported") ||
      message.includes("not supported") ||
      message.includes("invalid tool") ||
      message.includes("unknown tool")
    );
  }

  private delay(ms: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private resolveApiKey(): string {
    const direct = process.env.OPENAI_API_KEY?.trim();
    const legacy = process.env.OPEN_API_KEY?.trim();
    const key = direct || legacy;

    if (!key) {
      throw new Error(
        "OPENAI_API_KEY nao configurada. Defina no ambiente (ou OPEN_API_KEY para compatibilidade).",
      );
    }

    return key;
  }

  private normalizeFinalOutput(output: unknown): string {
    if (typeof output === "string" && output.trim()) {
      return output.trim();
    }

    if (output !== undefined) {
      return JSON.stringify(output, null, 2);
    }

    return "Nao foi possivel gerar resposta.";
  }

  private serializeHistory(history: readonly ChatMessage[]): string {
    const recent = history.slice(-this.maxHistoryMessages);

    if (recent.length === 0) {
      return "";
    }

    return recent
      .map((message) => `[${message.role}] ${message.content}`)
      .join("\n\n");
  }
}
