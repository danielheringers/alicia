import { spawn } from "node:child_process";

import type {
  CodexAuthMode,
  CodexAuthPort,
  CodexAuthStatus,
} from "../../application/ports/codex-auth-port.js";

const DEFAULT_STATUS_TIMEOUT_MS = 10_000;
const DEFAULT_AUTH_TIMEOUT_MS = 600_000;

interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface ProcessCodexAuthOptions {
  codexCommand?: string;
  statusTimeoutMs?: number;
  authTimeoutMs?: number;
}

export class ProcessCodexAuthAdapter implements CodexAuthPort {
  private readonly codexCommand: string;
  private readonly statusTimeoutMs: number;
  private readonly authTimeoutMs: number;

  constructor(options: ProcessCodexAuthOptions = {}) {
    this.codexCommand = options.codexCommand ?? "codex";
    this.statusTimeoutMs = options.statusTimeoutMs ?? DEFAULT_STATUS_TIMEOUT_MS;
    this.authTimeoutMs = options.authTimeoutMs ?? DEFAULT_AUTH_TIMEOUT_MS;
  }

  async getStatus(): Promise<CodexAuthStatus> {
    try {
      const result = await this.runCodex(["login", "status"], undefined, this.statusTimeoutMs);
      const details = this.mergeOutput(result.stdout, result.stderr);
      return {
        loggedIn: true,
        mode: this.resolveMode(details),
        details,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("CLI `codex`")) {
        throw error;
      }

      const details = error instanceof Error ? error.message : "Nao autenticado";
      return {
        loggedIn: false,
        mode: "none",
        details,
      };
    }
  }

  async loginWithChatGPT(): Promise<string> {
    const result = await this.runCodex(["login"], undefined, this.authTimeoutMs);
    return this.formatResult("codex login", result);
  }

  async loginWithDeviceCode(): Promise<string> {
    const result = await this.runCodex(["login", "--device-auth"], undefined, this.authTimeoutMs);
    return this.formatResult("codex login --device-auth", result);
  }

  async loginWithApiKey(apiKey: string): Promise<string> {
    const normalizedApiKey = apiKey.trim();
    if (!normalizedApiKey) {
      throw new Error("Informe uma API key valida em `/auth api <OPENAI_API_KEY>`.");
    }

    const result = await this.runCodex(
      ["login", "--with-api-key"],
      `${normalizedApiKey}\n`,
      this.authTimeoutMs,
    );
    return this.formatResult("codex login --with-api-key", result);
  }

  async logout(): Promise<string> {
    const result = await this.runCodex(["logout"], undefined, this.statusTimeoutMs);
    return this.formatResult("codex logout", result);
  }

  private resolveMode(details: string): CodexAuthMode {
    const lower = details.toLowerCase();
    if (lower.includes("chatgpt")) {
      return "chatgpt";
    }
    if (lower.includes("api key")) {
      return "api";
    }
    return "unknown";
  }

  private formatResult(command: string, result: CommandResult): string {
    const output = this.mergeOutput(result.stdout, result.stderr);
    return output ? `Executado: ${command}\n${output}` : `Executado: ${command}`;
  }

  private mergeOutput(stdout: string, stderr: string): string {
    return [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
  }

  private runCodex(args: string[], stdin: string | undefined, timeoutMs: number): Promise<CommandResult> {
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
              "CLI `codex` nao encontrada. Instale a Codex CLI para usar `/auth` e provider `codex`.",
            ),
          );
          return;
        }
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (timedOut) {
          reject(new Error(`Tempo limite excedido ao executar \`codex ${args.join(" ")}\`.`));
          return;
        }
        if ((code ?? 1) !== 0) {
          const output = this.mergeOutput(stdout, stderr) || `exit ${code ?? 1}`;
          reject(new Error(output));
          return;
        }
        resolve({ stdout, stderr });
      });

      if (stdin) {
        child.stdin.write(stdin);
      }
      child.stdin.end();
    });
  }
}
