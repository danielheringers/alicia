import type { RuntimeSettings } from "../../domain/runtime-settings.js";

export interface RuntimeSettingsPort {
  getSettings(): RuntimeSettings;
  setSettings(settings: RuntimeSettings): void;
}
