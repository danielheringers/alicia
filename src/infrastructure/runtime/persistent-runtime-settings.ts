import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import type { RuntimeSettingsPort } from "../../application/ports/runtime-settings-port.js";
import { PROVIDER_OPTIONS, type ProviderId, type RuntimeSettings } from "../../domain/runtime-settings.js";
import { InMemoryRuntimeSettings } from "./in-memory-runtime-settings.js";

const DEFAULT_RUNTIME_SETTINGS_PATH = resolve(process.cwd(), ".alicia", "runtime-settings.json");

export interface PersistentRuntimeSettingsOptions {
  filePath?: string;
  initial?: RuntimeSettings;
}

export class PersistentRuntimeSettings implements RuntimeSettingsPort {
  private readonly filePath: string;
  private readonly store: InMemoryRuntimeSettings;

  constructor(options: PersistentRuntimeSettingsOptions = {}) {
    this.filePath = options.filePath ?? DEFAULT_RUNTIME_SETTINGS_PATH;
    const persisted = this.loadPersistedSettings();
    this.store = new InMemoryRuntimeSettings(persisted ?? options.initial);

    if (persisted === null) {
      this.persist();
    }
  }

  getSettings(): RuntimeSettings {
    return this.store.getSettings();
  }

  setSettings(settings: RuntimeSettings): void {
    this.store.setSettings(settings);
    this.persist();
  }

  private loadPersistedSettings(): RuntimeSettings | null {
    if (!existsSync(this.filePath)) {
      return null;
    }

    try {
      const raw = readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return this.parseRuntimeSettings(parsed);
    } catch {
      return null;
    }
  }

  private parseRuntimeSettings(value: unknown): RuntimeSettings | null {
    if (typeof value !== "object" || value === null) {
      return null;
    }

    const candidate = value as Record<string, unknown>;
    if (
      typeof candidate.provider !== "string" ||
      typeof candidate.model !== "string" ||
      typeof candidate.concurrency !== "number" ||
      Number.isNaN(candidate.concurrency)
    ) {
      return null;
    }

    const enabledSkills = Array.isArray(candidate.enabledSkills)
      ? candidate.enabledSkills.filter((entry): entry is string => typeof entry === "string")
      : [];

    return {
      provider: this.toProviderId(candidate.provider),
      model: candidate.model,
      concurrency: candidate.concurrency,
      enabledSkills,
    };
  }

  private toProviderId(value: string): ProviderId {
    if (PROVIDER_OPTIONS.includes(value as ProviderId)) {
      return value as ProviderId;
    }

    return "local";
  }

  private persist(): void {
    const settings = this.store.getSettings();
    mkdirSync(dirname(this.filePath), { recursive: true });
    writeFileSync(this.filePath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
  }
}
