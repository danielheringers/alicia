import { ChatService, SendMessageUseCase } from "../../application/index.js";
import { CodexCliAssistantAdapter } from "../assistant/codex-cli-assistant.js";
import { LocalAssistantAdapter } from "../assistant/local-assistant.js";
import { OpenAIResponsesAssistantAdapter } from "../assistant/openai-responses-assistant.js";
import { RoutedAssistantAdapter } from "../assistant/routed-assistant.js";
import { ProcessCodexAuthAdapter } from "../auth/process-codex-auth.js";
import { ProcessCodexModelDiscoveryAdapter } from "../auth/process-codex-model-discovery.js";
import { PQueueTaskQueue } from "../concurrency/pqueue-task-queue.js";
import { ProcessPythonRunner } from "../python/process-python-runner.js";
import { PersistentRuntimeSettings } from "../runtime/persistent-runtime-settings.js";
import { composeAliciaCoreInstructions } from "../soul/alicia-persona-instructions.js";
import { LocalSkillsCatalogAdapter } from "../skills/local-skills-catalog.js";
import { loadSoulInstructions } from "../soul/load-soul-instructions.js";
import {
  createDefaultRuntimeSettings,
  getModelsByProvider,
} from "../../domain/runtime-settings.js";

const DEFAULT_CODEX_MODEL = "gpt-5.3-codex";

const resolveInitialSettings = async (codexAuth: ProcessCodexAuthAdapter) => {
  const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY?.trim() || process.env.OPEN_API_KEY?.trim());
  const initialSettings = createDefaultRuntimeSettings();
  if (hasOpenAIKey) {
    initialSettings.provider = "openai";
    initialSettings.model = getModelsByProvider("openai")[0] ?? "gpt-5.2";
  }

  const status = await codexAuth.getStatus().catch(() => ({
    loggedIn: false,
    mode: "none",
    details: "",
  }));

  if (!status.loggedIn) {
    return initialSettings;
  }

  const codexModels = getModelsByProvider("codex");
  if (codexModels.length === 0) {
    return initialSettings;
  }

  const codexModel = codexModels.includes(DEFAULT_CODEX_MODEL)
    ? DEFAULT_CODEX_MODEL
    : codexModels[0];

  return {
    ...initialSettings,
    provider: "codex" as const,
    model: codexModel,
  };
};

export const createChatService = async () => {
  const codexAuth = new ProcessCodexAuthAdapter();
  const codexModelDiscovery = new ProcessCodexModelDiscoveryAdapter();
  const soulInstructions = await loadSoulInstructions();
  const aliciaCoreInstructions = composeAliciaCoreInstructions(soulInstructions);
  const initialSettings = await resolveInitialSettings(codexAuth);
  const runtimeSettings = new PersistentRuntimeSettings({ initial: initialSettings });
  const taskQueue = new PQueueTaskQueue(runtimeSettings.getSettings().concurrency);
  const localAssistant = new LocalAssistantAdapter(runtimeSettings);
  const openaiAssistant = new OpenAIResponsesAssistantAdapter(runtimeSettings, {
    systemInstructions: aliciaCoreInstructions,
  });
  const codexAssistant = new CodexCliAssistantAdapter(runtimeSettings, {
    systemInstructions: aliciaCoreInstructions,
  });
  const assistant = new RoutedAssistantAdapter(runtimeSettings, localAssistant, {
    local: localAssistant,
    openai: openaiAssistant,
    codex: codexAssistant,
  });
  const pythonRunner = new ProcessPythonRunner();
  const skillsCatalog = new LocalSkillsCatalogAdapter();
  const sendMessageUseCase = new SendMessageUseCase({
    assistant,
    codexAuth,
    codexModelDiscovery,
    taskQueue,
    pythonRunner,
    runtimeSettings,
    skillsCatalog,
  });

  return new ChatService(sendMessageUseCase, runtimeSettings, taskQueue, skillsCatalog);
};
