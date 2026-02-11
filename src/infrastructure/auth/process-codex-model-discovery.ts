import { spawn } from "node:child_process";

import type { CodexModelDiscoveryPort } from "../../application/ports/codex-model-discovery-port.js";

const DEFAULT_MODEL_CHECK_TIMEOUT_MS = 45_000;
const MODEL_CHECK_PROMPT = "Reply with exactly: OK";

interface CommandResult {
  stdout: string;
  stderr: string;
}

export interface ProcessCodexModelDiscoveryOptions {
  codexCommand?: string;
  modelCheckTimeoutMs?: number;
}

export class ProcessCodexModelDiscoveryAdapter implements CodexModelDiscoveryPort {
  private readonly codexCommand: string;
  private readonly modelCheckTimeoutMs: number;

  constructor(options: ProcessCodexModelDiscoveryOptions = {}) {
    this.codexCommand = options.codexCommand ?? "codex";
    this.modelCheckTimeoutMs = options.modelCheckTimeoutMs ?? DEFAULT_MODEL_CHECK_TIMEOUT_MS;
  }

  async listAvailableModels(models: readonly string[]): Promise<readonly string[]> {
    const available: string[] = [];
    for (const model of models) {
      const isAvailable = await this.checkModel(model);
      if (isAvailable) {
        available.push(model);
      }
    }
    return available;
  }

  private async checkModel(model: string): Promise<boolean> {
    try {
      await this.runCodex(
        [
          "exec",
          "--model",
          model,
          "--sandbox",
          "read-only",
          "--skip-git-repo-check",
          "-",
        ],
        `${MODEL_CHECK_PROMPT}\n`,
        this.modelCheckTimeoutMs,
      );
      return true;
    } catch {
      return false;
    }
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
          reject(new Error("CLI `codex` nao encontrada."));
          return;
        }
        reject(error);
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        if (timedOut) {
          reject(new Error("Timeout ao validar modelo Codex."));
          return;
        }
        if ((code ?? 1) !== 0) {
          const output = [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
          reject(new Error(output || `codex exec retornou exit ${code ?? 1}`));
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
