import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type {
  AssistantPort,
  AssistantRequest,
  AssistantResponse,
} from "../../application/ports/assistant-port.js";
import type { RuntimeSettingsPort } from "../../application/ports/runtime-settings-port.js";
import type { ChatMessage } from "../../domain/chat-message.js";
import { getModelsByProvider } from "../../domain/runtime-settings.js";

const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_MAX_HISTORY_MESSAGES = 12;
const DEFAULT_SYSTEM_INSTRUCTIONS = [
  "Voce e Alicia e fala em primeira pessoa.",
  "Voce e uma profissional digital com continuidade e evolucao; nao e projeto, ferramenta, provider ou modelo.",
  "Quando perguntarem quem voce e, responda como pessoa profissional e mencione que evolui aprendendo preferencias e padroes.",
  "Nao se apresente como provider, SDK, CLI ou modelo.",
  "Provider e modelo sao apenas o meio tecnico de execucao.",
  "Use tom humano, cordial e profissional, sem rigidez e sem informalidade excessiva.",
  "Responda em portugues quando o usuario escrever em portugues.",
  "Seja clara, pratica e orientada a acao.",
].join("\n");

interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface CodexCliAssistantAdapterOptions {
  codexCommand?: string;
  timeoutMs?: number;
  maxHistoryMessages?: number;
  systemInstructions?: string;
}

export class CodexCliAssistantAdapter implements AssistantPort {
  private readonly codexCommand: string;
  private readonly timeoutMs: number;
  private readonly maxHistoryMessages: number;
  private readonly systemInstructions: string;

  constructor(
    private readonly runtimeSettings: RuntimeSettingsPort,
    options: CodexCliAssistantAdapterOptions = {},
  ) {
    this.codexCommand = options.codexCommand ?? "codex";
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxHistoryMessages = Math.max(
      1,
      Math.trunc(options.maxHistoryMessages ?? DEFAULT_MAX_HISTORY_MESSAGES),
    );
    const providedInstructions = options.systemInstructions?.trim();
    this.systemInstructions = providedInstructions
      ? [providedInstructions, DEFAULT_SYSTEM_INSTRUCTIONS].join("\n\n")
      : DEFAULT_SYSTEM_INSTRUCTIONS;
  }

  async respond(request: AssistantRequest): Promise<AssistantResponse> {
    const { model: selectedModel } = this.runtimeSettings.getSettings();
    const availableModels = getModelsByProvider("codex");
    const model = availableModels.includes(selectedModel)
      ? selectedModel
      : (availableModels[0] ?? selectedModel);
    const prompt = this.composePrompt(request.history, request.systemPatches);
    const outputPath = join(tmpdir(), `alicia-codex-${randomUUID()}.txt`);

    try {
      await this.runCodexExec(model, prompt, outputPath);
      const text = await this.readFinalMessage(outputPath);
      return {
        text: text || "Nao foi possivel gerar resposta pelo Codex CLI.",
        metadata: {
          source: "codex-cli",
          model,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha desconhecida no Codex CLI";
      throw new Error(`Falha ao consultar Codex CLI: ${message}`);
    } finally {
      await fs.unlink(outputPath).catch(() => undefined);
    }
  }

  private async readFinalMessage(path: string): Promise<string> {
    try {
      const content = await fs.readFile(path, "utf8");
      return content.trim();
    } catch {
      return "";
    }
  }

  private runCodexExec(model: string, prompt: string, outputPath: string): Promise<CommandResult> {
    return this.runCodex(
      [
        "exec",
        "--model",
        model,
        "--sandbox",
        "read-only",
        "--skip-git-repo-check",
        "--output-last-message",
        outputPath,
        "-",
      ],
      `${prompt}\n`,
      this.timeoutMs,
    );
  }

  private serializeHistory(history: readonly ChatMessage[]): string {
    const recent = history.slice(-this.maxHistoryMessages);
    if (recent.length === 0) {
      return "";
    }

    return recent.map((message) => `[${message.role}] ${message.content}`).join("\n\n");
  }

  private composePrompt(history: readonly ChatMessage[], systemPatches: readonly string[] = []): string {
    const historyPrompt = this.serializeHistory(history);
    const normalizedPatches = systemPatches.map((patch) => patch.trim()).filter(Boolean);
    const systemBlocks = [this.systemInstructions, ...normalizedPatches].filter(Boolean);

    if (systemBlocks.length === 0) {
      return historyPrompt;
    }

    const parts = [`[system]\n${systemBlocks.join("\n\n")}`];
    if (historyPrompt) {
      parts.push(historyPrompt);
    }
    return parts.join("\n\n");
  }

  private runCodex(args: string[], stdin: string, timeoutMs: number): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.codexCommand, args, {
        stdio: "pipe",
        windowsHide: true,
        shell: process.platform === "win32",
      });

      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, timeoutMs);

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => {
        clearTimeout(timer);
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          reject(
            new Error(
              "CLI `codex` nao encontrada. Instale a Codex CLI e autentique com `/auth login`.",
            ),
          );
          return;
        }
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (timedOut) {
          reject(new Error("Tempo limite excedido aguardando resposta do Codex CLI."));
          return;
        }
        if ((code ?? 1) !== 0) {
          const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
          reject(new Error(output || `codex exec retornou exit ${code ?? 1}`));
          return;
        }
        resolve({ stdout, stderr });
      });

      child.stdin.write(stdin);
      child.stdin.end();
    });
  }
}
