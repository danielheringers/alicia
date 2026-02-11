import type {
  AssistantPort,
  AssistantRequest,
  AssistantResponse,
} from "../../application/ports/assistant-port.js";
import type { RuntimeSettingsPort } from "../../application/ports/runtime-settings-port.js";
import type { ChatMessage } from "../../domain/chat-message.js";
import {
  buildOpenAIResponsesTools,
  type OpenAIResponsesFunctionCall,
  type OpenAIResponsesToolingBuildResult,
} from "./openai-responses-tooling.js";
import {
  resolveOpenAIToolingConfigFromEnv,
  type OpenAIToolingConfig,
} from "./openai-tooling.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_MAX_HISTORY_MESSAGES = 12;
const DEFAULT_MAX_TURNS = 8;
const RESPONSES_API_URL = "https://api.openai.com/v1/responses";
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

interface ResponsesApiError {
  message?: string;
}

interface ResponsesApiOutputTextPart {
  type?: string;
  text?: string;
  refusal?: string;
}

interface ResponsesApiMessageOutputItem {
  type?: string;
  content?: ResponsesApiOutputTextPart[];
}

interface ResponsesApiFunctionCallItem {
  type?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
}

type ResponsesApiOutputItem =
  | ResponsesApiMessageOutputItem
  | ResponsesApiFunctionCallItem
  | Record<string, unknown>;

interface ResponsesApiResponse {
  id?: string;
  output?: ResponsesApiOutputItem[];
  error?: ResponsesApiError | null;
}

class OpenAIResponsesHttpError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "OpenAIResponsesHttpError";
  }
}

export interface OpenAIResponsesAssistantAdapterOptions {
  timeoutMs?: number;
  maxRetries?: number;
  maxHistoryMessages?: number;
  maxTurns?: number;
  systemInstructions?: string;
  workspaceRoot?: string;
  toolingConfig?: Partial<OpenAIToolingConfig>;
}

export class OpenAIResponsesAssistantAdapter implements AssistantPort {
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly maxHistoryMessages: number;
  private readonly maxTurns: number;
  private readonly systemInstructions: string;
  private readonly toolingConfig: OpenAIToolingConfig;

  constructor(
    private readonly runtimeSettings: RuntimeSettingsPort,
    options: OpenAIResponsesAssistantAdapterOptions = {},
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
  }

  async respond(request: AssistantRequest): Promise<AssistantResponse> {
    const apiKey = this.resolveApiKey();
    const runtime = this.runtimeSettings.getSettings();
    const input = this.serializeHistory(request.history);
    const enabledSkills = runtime.enabledSkills;
    const requestSystemPatches = (request.systemPatches ?? [])
      .map((patch) => patch.trim())
      .filter(Boolean);

    const primaryTooling = buildOpenAIResponsesTools(this.toolingConfig, enabledSkills);
    const primaryInstructions = this.composeInstructions(
      requestSystemPatches,
      primaryTooling.systemHints,
    );
    let activeTooling = primaryTooling;
    let activeInstructions = primaryInstructions;
    let toolFallback: "none" | "without-local-tools" | "without-tools" = "none";

    let response: ResponsesApiResponse;

    try {
      response = await this.runWithRetry(() =>
        this.runConversation(apiKey, runtime.model, input, activeInstructions, activeTooling),
      );
    } catch (error) {
      if (!this.isToolCompatibilityError(error) || primaryTooling.tools.length === 0) {
        throw error;
      }

      const withoutLocalToolingConfig = this.withoutLocalExecutionTools(this.toolingConfig);
      const withoutLocalTooling = buildOpenAIResponsesTools(withoutLocalToolingConfig, enabledSkills);
      const withoutLocalInstructions = this.composeInstructions(
        requestSystemPatches,
        withoutLocalTooling.systemHints,
      );

      if (
        withoutLocalTooling.tools.length > 0 &&
        withoutLocalTooling.tools.length < primaryTooling.tools.length
      ) {
        try {
          response = await this.runWithRetry(() =>
            this.runConversation(
              apiKey,
              runtime.model,
              input,
              withoutLocalInstructions,
              withoutLocalTooling,
            ),
          );
          activeTooling = withoutLocalTooling;
          activeInstructions = withoutLocalInstructions;
          toolFallback = "without-local-tools";
        } catch (secondaryError) {
          if (!this.isToolCompatibilityError(secondaryError)) {
            throw secondaryError;
          }

          const withoutToolsConfig = this.withoutAllTools(this.toolingConfig);
          const withoutToolsTooling = buildOpenAIResponsesTools(withoutToolsConfig, enabledSkills);
          const withoutToolsInstructions = this.composeInstructions(
            requestSystemPatches,
            withoutToolsTooling.systemHints,
          );

          response = await this.runWithRetry(() =>
            this.runConversation(
              apiKey,
              runtime.model,
              input,
              withoutToolsInstructions,
              withoutToolsTooling,
            ),
          );
          activeTooling = withoutToolsTooling;
          activeInstructions = withoutToolsInstructions;
          toolFallback = "without-tools";
        }
      } else {
        const withoutToolsConfig = this.withoutAllTools(this.toolingConfig);
        const withoutToolsTooling = buildOpenAIResponsesTools(withoutToolsConfig, enabledSkills);
        const withoutToolsInstructions = this.composeInstructions(
          requestSystemPatches,
          withoutToolsTooling.systemHints,
        );

        response = await this.runWithRetry(() =>
          this.runConversation(
            apiKey,
            runtime.model,
            input,
            withoutToolsInstructions,
            withoutToolsTooling,
          ),
        );
        activeTooling = withoutToolsTooling;
        activeInstructions = withoutToolsInstructions;
        toolFallback = "without-tools";
      }
    }

    const text = this.normalizeFinalOutput(response);
    const metadata: Record<string, string> = {
      source: "openai-responses-api",
      model: runtime.model,
      tools: activeTooling.toolNames.join(",") || "none",
      capabilities: activeTooling.capabilityNames.join(",") || "none",
      toolFallback,
      toolWarnings: String(activeTooling.warnings.length),
    };

    if (activeInstructions !== primaryInstructions) {
      metadata.instructionsFallback = "true";
    }

    return { text, metadata };
  }

  private withoutLocalExecutionTools(config: OpenAIToolingConfig): OpenAIToolingConfig {
    return {
      ...config,
      enableShell: false,
      enableApplyPatch: false,
      enableComputerUse: false,
      enableSkills: false,
    };
  }

  private withoutAllTools(config: OpenAIToolingConfig): OpenAIToolingConfig {
    return {
      ...config,
      enableWebSearch: false,
      enableFileSearch: false,
      enableCodeInterpreter: false,
      enableImageGeneration: false,
      enableRemoteMcp: false,
      enableShell: false,
      enableApplyPatch: false,
      enableFunctionCalling: false,
      enableComputerUse: false,
      enableSkills: false,
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

  private async runConversation(
    apiKey: string,
    model: string,
    input: string,
    instructions: string,
    tooling: OpenAIResponsesToolingBuildResult,
  ): Promise<ResponsesApiResponse> {
    let response = await this.createResponse(apiKey, {
      model,
      input,
      instructions,
      parallel_tool_calls: true,
      ...(tooling.tools.length > 0 ? { tools: tooling.tools } : {}),
    });

    let turns = 0;

    while (turns < this.maxTurns) {
      const functionCalls = this.extractFunctionCalls(response);
      if (functionCalls.length === 0) {
        return response;
      }

      if (!response.id) {
        throw new Error("Resposta da OpenAI sem `id`; nao foi possivel continuar tool calls.");
      }

      const outputItems = await this.executeFunctionCalls(tooling, functionCalls);
      response = await this.createResponse(apiKey, {
        model,
        previous_response_id: response.id,
        input: outputItems,
        instructions,
        parallel_tool_calls: true,
        ...(tooling.tools.length > 0 ? { tools: tooling.tools } : {}),
      });
      turns += 1;
    }

    throw new Error(
      `Limite de ${this.maxTurns} turnos de tool call atingido na Responses API.`,
    );
  }

  private async executeFunctionCalls(
    tooling: OpenAIResponsesToolingBuildResult,
    functionCalls: readonly OpenAIResponsesFunctionCall[],
  ): Promise<Array<Record<string, unknown>>> {
    const outputs = await Promise.all(
      functionCalls.map(async (call) => {
        const output = await tooling.executeFunctionCall(call);
        return {
          type: "function_call_output",
          call_id: call.callId,
          output,
        };
      }),
    );

    return outputs;
  }

  private extractFunctionCalls(response: ResponsesApiResponse): OpenAIResponsesFunctionCall[] {
    if (!Array.isArray(response.output)) {
      return [];
    }

    const functionCalls: OpenAIResponsesFunctionCall[] = [];

    for (const item of response.output) {
      if (!this.isFunctionCallItem(item)) {
        continue;
      }

      const callId = item.call_id?.trim();
      const name = item.name?.trim();
      if (!callId || !name) {
        continue;
      }

      functionCalls.push({
        callId,
        name,
        rawArguments: item.arguments ?? "{}",
      });
    }

    return functionCalls;
  }

  private isFunctionCallItem(item: ResponsesApiOutputItem): item is ResponsesApiFunctionCallItem {
    return (
      typeof item === "object" &&
      item !== null &&
      "type" in item &&
      (item as { type?: unknown }).type === "function_call"
    );
  }

  private async createResponse(
    apiKey: string,
    payload: Record<string, unknown>,
  ): Promise<ResponsesApiResponse> {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const result = await fetch(RESPONSES_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const rawBody = await result.text();
      const parsedBody = this.safeParseJson(rawBody);
      if (!result.ok) {
        const errorMessage =
          this.extractErrorMessage(parsedBody) ||
          rawBody ||
          `OpenAI Responses API retornou HTTP ${result.status}.`;
        throw new OpenAIResponsesHttpError(errorMessage, result.status);
      }

      if (typeof parsedBody !== "object" || parsedBody === null) {
        throw new Error("Resposta invalida da OpenAI Responses API.");
      }

      return parsedBody as ResponsesApiResponse;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Tempo limite excedido aguardando resposta da OpenAI Responses API.");
      }

      throw error;
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  private safeParseJson(payload: string): unknown {
    if (!payload.trim()) {
      return null;
    }

    try {
      return JSON.parse(payload) as unknown;
    } catch {
      return null;
    }
  }

  private extractErrorMessage(parsedBody: unknown): string | null {
    if (typeof parsedBody !== "object" || parsedBody === null) {
      return null;
    }

    const candidate = parsedBody as {
      error?: { message?: unknown };
      message?: unknown;
    };

    if (candidate.error && typeof candidate.error.message === "string") {
      return candidate.error.message;
    }

    if (typeof candidate.message === "string") {
      return candidate.message;
    }

    return null;
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
    throw new Error(`Falha ao consultar OpenAI Responses API: ${message}`);
  }

  private isRetryable(error: unknown): boolean {
    if (error instanceof OpenAIResponsesHttpError) {
      return RETRYABLE_STATUS_CODES.has(error.status);
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes("rate limit") || message.includes("timeout");
    }

    return false;
  }

  private isToolCompatibilityError(error: unknown): boolean {
    if (!(error instanceof Error)) {
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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
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

  private normalizeFinalOutput(response: ResponsesApiResponse): string {
    const texts: string[] = [];

    for (const item of response.output ?? []) {
      if (
        typeof item !== "object" ||
        item === null ||
        !("type" in item) ||
        (item as { type?: unknown }).type !== "message"
      ) {
        continue;
      }

      const messageItem = item as ResponsesApiMessageOutputItem;
      if (!Array.isArray(messageItem.content)) {
        continue;
      }

      for (const part of messageItem.content) {
        if (typeof part !== "object" || part === null) {
          continue;
        }
        if (part.type === "output_text" && typeof part.text === "string" && part.text.trim()) {
          texts.push(part.text.trim());
          continue;
        }
        if (part.type === "refusal") {
          const refusalText =
            typeof part.refusal === "string"
              ? part.refusal.trim()
              : typeof part.text === "string"
                ? part.text.trim()
                : "";
          if (refusalText) {
            texts.push(refusalText);
          }
        }
      }
    }

    if (texts.length > 0) {
      return texts.join("\n\n");
    }

    if (response.error?.message?.trim()) {
      return response.error.message.trim();
    }

    return "Nao foi possivel gerar resposta.";
  }

  private serializeHistory(history: readonly ChatMessage[]): string {
    const recent = history.slice(-this.maxHistoryMessages);
    if (recent.length === 0) {
      return "";
    }

    return recent.map((message) => `[${message.role}] ${message.content}`).join("\n\n");
  }
}
