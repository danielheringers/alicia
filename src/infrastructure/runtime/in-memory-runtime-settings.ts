import type { RuntimeSettingsPort } from "../../application/ports/runtime-settings-port.js";
import {
  clampConcurrency,
  createDefaultRuntimeSettings,
  getModelsByProvider,
  PROVIDER_OPTIONS,
  type ProviderId,
  type RuntimeSettings,
} from "../../domain/runtime-settings.js";

export class InMemoryRuntimeSettings implements RuntimeSettingsPort {
  private settings: RuntimeSettings;

  constructor(initial?: RuntimeSettings) {
    this.settings = this.normalize(initial ?? createDefaultRuntimeSettings());
  }

  getSettings(): RuntimeSettings {
    return { ...this.settings };
  }

  setSettings(settings: RuntimeSettings): void {
    this.settings = this.normalize(settings);
  }

  private normalize(settings: RuntimeSettings): RuntimeSettings {
    const enabledSkills = [...new Set((settings.enabledSkills ?? []).map((value) => value.trim()).filter(Boolean))];
    const provider = this.resolveProvider(settings.provider);
    const models = getModelsByProvider(provider);
    if (models.length === 0) {
      const fallbackProvider: ProviderId = "local";
      const fallbackModels = getModelsByProvider(fallbackProvider);
      return {
        provider: fallbackProvider,
        model: fallbackModels[0] ?? "local-echo-v1",
        concurrency: clampConcurrency(settings.concurrency),
        enabledSkills,
      };
    }
    const model = models.includes(settings.model) ? settings.model : models[0];

    return {
      provider,
      model,
      concurrency: clampConcurrency(settings.concurrency),
      enabledSkills,
    };
  }

  private resolveProvider(provider: string): ProviderId {
    return PROVIDER_OPTIONS.includes(provider as ProviderId)
      ? (provider as ProviderId)
      : "local";
  }
}
