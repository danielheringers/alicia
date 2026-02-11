import type {
  AssistantPort,
  AssistantRequest,
  AssistantResponse,
} from "../../application/ports/assistant-port.js";
import type { RuntimeSettingsPort } from "../../application/ports/runtime-settings-port.js";
import type { ProviderId } from "../../domain/runtime-settings.js";

export type ProviderAssistantMap = Partial<Record<ProviderId, AssistantPort>>;

export class RoutedAssistantAdapter implements AssistantPort {
  constructor(
    private readonly runtimeSettings: RuntimeSettingsPort,
    private readonly defaultAssistant: AssistantPort,
    private readonly assistants: ProviderAssistantMap,
  ) {}

  async respond(request: AssistantRequest): Promise<AssistantResponse> {
    if (this.isReservedCommand(request.message)) {
      return this.defaultAssistant.respond(request);
    }

    const provider = this.runtimeSettings.getSettings().provider;
    const assistant = this.assistants[provider] ?? this.defaultAssistant;
    return assistant.respond(request);
  }

  private isReservedCommand(message: string): boolean {
    return message.trim() === "/help";
  }
}
