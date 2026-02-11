import type { ChatMessage } from "../../domain/chat-message.js";
import type { RuntimeSettings } from "../../domain/runtime-settings.js";
import { createChatSession } from "../../domain/chat-session.js";
import type { RuntimeSettingsPort } from "../ports/runtime-settings-port.js";
import type {
  SkillCatalogEntry,
  SkillsCatalogPort,
} from "../ports/skills-catalog-port.js";
import type { TaskQueuePort } from "../ports/task-queue-port.js";
import { SendMessageUseCase } from "../use-cases/send-message.js";

export class ChatService {
  private readonly session = createChatSession();

  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly runtimeSettings: RuntimeSettingsPort,
    private readonly taskQueue: TaskQueuePort,
    private readonly skillsCatalog: SkillsCatalogPort,
  ) {}

  getHistory(): readonly ChatMessage[] {
    return this.session.messages;
  }

  getRuntimeSettings(): RuntimeSettings {
    return this.runtimeSettings.getSettings();
  }

  listAvailableSkills(): readonly SkillCatalogEntry[] {
    return this.skillsCatalog.listAvailableSkills();
  }

  updateRuntimeSettings(next: RuntimeSettings): RuntimeSettings {
    this.runtimeSettings.setSettings(next);
    const saved = this.runtimeSettings.getSettings();
    this.taskQueue.setConcurrency(saved.concurrency);
    return saved;
  }

  async send(text: string): Promise<readonly ChatMessage[]> {
    await this.sendMessageUseCase.execute(this.session, text);
    return this.session.messages;
  }
}
