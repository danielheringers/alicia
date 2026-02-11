import { spawn } from "node:child_process";

import type {
  PythonRunnerPort,
  PythonRunnerResult,
} from "../../application/ports/python-runner-port.js";

export class ProcessPythonRunner implements PythonRunnerPort {
  async runInlineScript(script: string): Promise<PythonRunnerResult> {
    const commands = ["python", "py"];
    let lastError: unknown;

    for (const command of commands) {
      try {
        return await this.runWith(command, script);
      } catch (error) {
        lastError = error;
      }
    }

    const message = lastError instanceof Error ? lastError.message : "Python indisponível";
    return { stdout: "", stderr: message, exitCode: 127 };
  }

  private runWith(command: string, script: string): Promise<PythonRunnerResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command, ["-c", script], { stdio: "pipe" });
      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });
      child.on("error", (error) => {
        reject(error);
      });
      child.on("close", (code) => {
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });
    });
  }
}
