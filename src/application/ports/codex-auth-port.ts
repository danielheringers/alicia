export type CodexAuthMode = "chatgpt" | "api" | "none" | "unknown";

export interface CodexAuthStatus {
  loggedIn: boolean;
  mode: CodexAuthMode;
  details: string;
}

export interface CodexAuthPort {
  getStatus(): Promise<CodexAuthStatus>;
  loginWithChatGPT(): Promise<string>;
  loginWithDeviceCode(): Promise<string>;
  loginWithApiKey(apiKey: string): Promise<string>;
  logout(): Promise<string>;
}

