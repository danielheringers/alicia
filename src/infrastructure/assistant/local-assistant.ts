import type {
  AssistantPort,
  AssistantRequest,
  AssistantResponse,
} from "../../application/ports/assistant-port.js";
import type { RuntimeSettingsPort } from "../../application/ports/runtime-settings-port.js";
import { getModelContextLimits } from "../../domain/runtime-settings.js";

export class LocalAssistantAdapter implements AssistantPort {
  constructor(private readonly runtimeSettings: RuntimeSettingsPort) {}

  async respond(request: AssistantRequest): Promise<AssistantResponse> {
    const settings = this.runtimeSettings.getSettings();
    const modelLimits = getModelContextLimits(settings.provider, settings.model);
    const modelLimitsText = `input=${modelLimits.inputContextTokens?.toLocaleString("en-US") ?? "n/d"} | output=${
      modelLimits.outputContextTokens?.toLocaleString("en-US") ?? "n/d"
    }`;

    if (request.message === "/help") {
      return {
        text: [
          "Comandos:",
          "/help - mostra ajuda",
          "/settings - abre tela de configuração",
          "/auth - autenticação Codex/OpenAI",
          "/skills - gerencia skills locais (ON/OFF)",
          "/py <script> - executa Python inline",
          "Ctrl+C - sair",
        ].join("\n"),
        metadata: { source: "local-help" },
      };
    }

    const lastUserMessages = request.history
      .filter((message) => message.role === "user")
      .slice(-3)
      .map((message) => `- ${message.content}`)
      .join("\n");

    return {
      text: [
        "Alicia ativa em modo local.",
        `Provider atual: ${settings.provider}`,
        `Model atual: ${settings.model} (${modelLimitsText})`,
        `Concorrência: ${settings.concurrency}`,
        `Você enviou: ${request.message}`,
        lastUserMessages ? `Contexto recente:\n${lastUserMessages}` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      metadata: { source: "local-echo" },
    };
  }
}
