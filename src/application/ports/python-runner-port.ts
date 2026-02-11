export interface PythonRunnerResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface PythonRunnerPort {
  runInlineScript(script: string): Promise<PythonRunnerResult>;
}
