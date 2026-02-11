export const PROVIDER_OPTIONS = ["local", "openai", "codex", "anthropic", "google"] as const;

export type ProviderId = (typeof PROVIDER_OPTIONS)[number];

export interface ModelContextLimits {
  inputContextTokens: number | null;
  outputContextTokens: number | null;
}

export interface ModelCatalogEntry extends ModelContextLimits {
  id: string;
}

const LOCAL_MODEL_CATALOG: readonly ModelCatalogEntry[] = [
  { id: "local-echo-v1", inputContextTokens: null, outputContextTokens: null },
];

// Ordered from newest to oldest using the official OpenAI model index.
const OPENAI_MODEL_CATALOG: readonly ModelCatalogEntry[] = [
  { id: "gpt-5.2", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5-mini", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5-nano", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5.2-pro", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-4.1", inputContextTokens: 1047576, outputContextTokens: 32768 },
  { id: "gpt-oss-120b", inputContextTokens: 131072, outputContextTokens: 131072 },
  { id: "gpt-oss-20b", inputContextTokens: 131072, outputContextTokens: 131072 },
  { id: "sora-2", inputContextTokens: null, outputContextTokens: null },
  { id: "sora-2-pro", inputContextTokens: null, outputContextTokens: null },
  { id: "o3-deep-research", inputContextTokens: 200000, outputContextTokens: 100000 },
  { id: "o4-mini-deep-research", inputContextTokens: 200000, outputContextTokens: 100000 },
  { id: "gpt-image-1.5", inputContextTokens: null, outputContextTokens: null },
  { id: "chatgpt-image-latest", inputContextTokens: null, outputContextTokens: null },
  { id: "gpt-image-1", inputContextTokens: null, outputContextTokens: null },
  { id: "gpt-image-1-mini", inputContextTokens: null, outputContextTokens: null },
  { id: "gpt-4o-mini-tts", inputContextTokens: null, outputContextTokens: null },
  { id: "gpt-4o-transcribe", inputContextTokens: 16000, outputContextTokens: 2000 },
  { id: "gpt-4o-mini-transcribe", inputContextTokens: 16000, outputContextTokens: 2000 },
  { id: "gpt-realtime", inputContextTokens: 32000, outputContextTokens: 4096 },
  { id: "gpt-audio", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "gpt-realtime-mini", inputContextTokens: 32000, outputContextTokens: 4096 },
  { id: "gpt-audio-mini", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "gpt-5-chat-latest", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "chatgpt-4o-latest", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "gpt-5.1", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5.2-codex", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5.1-codex", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5.1-codex-max", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5-codex", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5-pro", inputContextTokens: 400000, outputContextTokens: 272000 },
  { id: "o3-pro", inputContextTokens: 200000, outputContextTokens: 100000 },
  { id: "o3", inputContextTokens: 200000, outputContextTokens: 100000 },
  { id: "o4-mini", inputContextTokens: 200000, outputContextTokens: 100000 },
  { id: "gpt-4.1-mini", inputContextTokens: 1047576, outputContextTokens: 32768 },
  { id: "gpt-4.1-nano", inputContextTokens: 1047576, outputContextTokens: 32768 },
  { id: "o1-pro", inputContextTokens: 200000, outputContextTokens: 100000 },
  { id: "computer-use-preview", inputContextTokens: 8192, outputContextTokens: 1024 },
  { id: "gpt-4o-mini-search-preview", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "gpt-4o-search-preview", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "gpt-4.5-preview", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "o3-mini", inputContextTokens: 200000, outputContextTokens: 100000 },
  { id: "o1", inputContextTokens: 200000, outputContextTokens: 100000 },
  { id: "omni-moderation-latest", inputContextTokens: null, outputContextTokens: null },
  { id: "o1-mini", inputContextTokens: 128000, outputContextTokens: 65536 },
  { id: "o1-preview", inputContextTokens: 128000, outputContextTokens: 32768 },
  { id: "gpt-4o", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "gpt-4o-audio-preview", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "gpt-4o-mini", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "gpt-4o-mini-audio-preview", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "gpt-4o-mini-realtime-preview", inputContextTokens: 16000, outputContextTokens: 4096 },
  { id: "gpt-4o-realtime-preview", inputContextTokens: 32000, outputContextTokens: 4096 },
  { id: "gpt-4-turbo", inputContextTokens: 128000, outputContextTokens: 4096 },
  { id: "babbage-002", inputContextTokens: null, outputContextTokens: 16384 },
  { id: "gpt-5.1-codex-mini", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "codex-mini-latest", inputContextTokens: 200000, outputContextTokens: 100000 },
  { id: "dall-e-2", inputContextTokens: null, outputContextTokens: null },
  { id: "dall-e-3", inputContextTokens: null, outputContextTokens: null },
  { id: "davinci-002", inputContextTokens: null, outputContextTokens: 16384 },
  { id: "gpt-3.5-turbo", inputContextTokens: 16385, outputContextTokens: 4096 },
  { id: "gpt-4", inputContextTokens: 8192, outputContextTokens: 8192 },
  { id: "gpt-4-turbo-preview", inputContextTokens: 128000, outputContextTokens: 4096 },
  { id: "gpt-4o-transcribe-diarize", inputContextTokens: 16000, outputContextTokens: 2000 },
  { id: "gpt-5.2-chat-latest", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "gpt-5.1-chat-latest", inputContextTokens: 128000, outputContextTokens: 16384 },
  { id: "text-embedding-3-large", inputContextTokens: null, outputContextTokens: null },
  { id: "text-embedding-3-small", inputContextTokens: null, outputContextTokens: null },
  { id: "text-embedding-ada-002", inputContextTokens: null, outputContextTokens: null },
  { id: "text-moderation-latest", inputContextTokens: null, outputContextTokens: 32768 },
  { id: "text-moderation-stable", inputContextTokens: null, outputContextTokens: 32768 },
  { id: "tts-1", inputContextTokens: null, outputContextTokens: null },
  { id: "tts-1-hd", inputContextTokens: null, outputContextTokens: null },
  { id: "whisper-1", inputContextTokens: null, outputContextTokens: null },
];

const CODEX_MODEL_CATALOG: readonly ModelCatalogEntry[] = [
  { id: "gpt-5.3-codex", inputContextTokens: null, outputContextTokens: null },
  { id: "gpt-5.2-codex", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5.1-codex-max", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5.1-codex-mini", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5.1-codex", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5-codex", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5.2", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5.1", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "gpt-5", inputContextTokens: 400000, outputContextTokens: 128000 },
  { id: "codex-mini-latest", inputContextTokens: 200000, outputContextTokens: 100000 },
];

const ANTHROPIC_MODEL_CATALOG: readonly ModelCatalogEntry[] = [
  { id: "claude-sonnet-4-5", inputContextTokens: null, outputContextTokens: null },
  { id: "claude-haiku-4-5", inputContextTokens: null, outputContextTokens: null },
];

const GOOGLE_MODEL_CATALOG: readonly ModelCatalogEntry[] = [
  { id: "gemini-2.5-pro", inputContextTokens: null, outputContextTokens: null },
  { id: "gemini-2.5-flash", inputContextTokens: null, outputContextTokens: null },
];

export const MODEL_CATALOG_BY_PROVIDER: Record<ProviderId, readonly ModelCatalogEntry[]> = {
  local: LOCAL_MODEL_CATALOG,
  openai: OPENAI_MODEL_CATALOG,
  codex: CODEX_MODEL_CATALOG,
  anthropic: ANTHROPIC_MODEL_CATALOG,
  google: GOOGLE_MODEL_CATALOG,
};

export const MODELS_BY_PROVIDER: Record<ProviderId, readonly string[]> = {
  local: MODEL_CATALOG_BY_PROVIDER.local.map((model) => model.id),
  openai: MODEL_CATALOG_BY_PROVIDER.openai.map((model) => model.id),
  codex: MODEL_CATALOG_BY_PROVIDER.codex.map((model) => model.id),
  anthropic: MODEL_CATALOG_BY_PROVIDER.anthropic.map((model) => model.id),
  google: MODEL_CATALOG_BY_PROVIDER.google.map((model) => model.id),
};

const buildMutableModelsMap = (): Record<ProviderId, string[]> => ({
  local: [...MODELS_BY_PROVIDER.local],
  openai: [...MODELS_BY_PROVIDER.openai],
  codex: [...MODELS_BY_PROVIDER.codex],
  anthropic: [...MODELS_BY_PROVIDER.anthropic],
  google: [...MODELS_BY_PROVIDER.google],
});

let activeModelsByProvider: Record<ProviderId, string[]> = buildMutableModelsMap();

export const getDefaultModelsByProvider = (provider: ProviderId): readonly string[] =>
  MODELS_BY_PROVIDER[provider];

export const getModelsByProvider = (provider: ProviderId): readonly string[] =>
  activeModelsByProvider[provider];

export const setModelsByProvider = (provider: ProviderId, models: readonly string[]) => {
  const allowed = new Set(MODELS_BY_PROVIDER[provider]);
  const normalized = [...new Set(models)].filter((model) => allowed.has(model));
  activeModelsByProvider[provider] = normalized;
};

export const resetModelsByProvider = (provider: ProviderId) => {
  activeModelsByProvider[provider] = [...MODELS_BY_PROVIDER[provider]];
};

export const resetAllProviderModels = () => {
  activeModelsByProvider = buildMutableModelsMap();
};

const UNKNOWN_MODEL_LIMITS: ModelContextLimits = {
  inputContextTokens: null,
  outputContextTokens: null,
};

const MODEL_LIMITS_LOOKUP_BY_PROVIDER: Record<ProviderId, ReadonlyMap<string, ModelContextLimits>> = {
  local: new Map(
    MODEL_CATALOG_BY_PROVIDER.local.map((model) => [
      model.id,
      { inputContextTokens: model.inputContextTokens, outputContextTokens: model.outputContextTokens },
    ]),
  ),
  openai: new Map(
    MODEL_CATALOG_BY_PROVIDER.openai.map((model) => [
      model.id,
      { inputContextTokens: model.inputContextTokens, outputContextTokens: model.outputContextTokens },
    ]),
  ),
  codex: new Map(
    MODEL_CATALOG_BY_PROVIDER.codex.map((model) => [
      model.id,
      { inputContextTokens: model.inputContextTokens, outputContextTokens: model.outputContextTokens },
    ]),
  ),
  anthropic: new Map(
    MODEL_CATALOG_BY_PROVIDER.anthropic.map((model) => [
      model.id,
      { inputContextTokens: model.inputContextTokens, outputContextTokens: model.outputContextTokens },
    ]),
  ),
  google: new Map(
    MODEL_CATALOG_BY_PROVIDER.google.map((model) => [
      model.id,
      { inputContextTokens: model.inputContextTokens, outputContextTokens: model.outputContextTokens },
    ]),
  ),
};

export const getModelContextLimits = (provider: ProviderId, model: string): ModelContextLimits =>
  MODEL_LIMITS_LOOKUP_BY_PROVIDER[provider].get(model) ?? UNKNOWN_MODEL_LIMITS;

export interface RuntimeSettings {
  provider: ProviderId;
  model: string;
  concurrency: number;
  enabledSkills: string[];
}

export const MIN_CONCURRENCY = 1;
export const MAX_CONCURRENCY = 32;

export const createDefaultRuntimeSettings = (): RuntimeSettings => ({
  provider: "local",
  model: getModelsByProvider("local")[0] ?? "local-echo-v1",
  concurrency: 4,
  enabledSkills: [],
});

export const clampConcurrency = (value: number) =>
  Math.max(MIN_CONCURRENCY, Math.min(MAX_CONCURRENCY, Math.trunc(value)));
