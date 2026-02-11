import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";

const DEFAULT_LAYER_PATHS = {
  identity: "src/soul/IDENTITY.md",
  soul: "src/soul/SOUL.md",
  voice: "src/soul/VOICE.md",
  modes: "src/soul/MODES.md",
} as const;

const FRONTMATTER_REGEX = /^---\s*\r?\n[\s\S]*?\r?\n---\s*\r?\n?/;

type LayerId = keyof typeof DEFAULT_LAYER_PATHS;

const ENV_PATH_BY_LAYER: Record<LayerId, string> = {
  identity: "ALICIA_IDENTITY_PATH",
  soul: "ALICIA_SOUL_PATH",
  voice: "ALICIA_VOICE_PATH",
  modes: "ALICIA_MODES_PATH",
};

const REQUIRED_LAYERS: Record<LayerId, boolean> = {
  identity: true,
  soul: true,
  voice: true,
  modes: true,
};

const stripFrontmatter = (content: string) => content.replace(FRONTMATTER_REGEX, "").trim();

const resolveLayerPath = (workspaceRoot: string, layerId: LayerId): string => {
  const envName = ENV_PATH_BY_LAYER[layerId];
  const configuredPath = process.env[envName]?.trim();
  if (!configuredPath) {
    return resolve(workspaceRoot, DEFAULT_LAYER_PATHS[layerId]);
  }

  return isAbsolute(configuredPath) ? configuredPath : resolve(workspaceRoot, configuredPath);
};

const loadLayer = async (workspaceRoot: string, layerId: LayerId): Promise<string> => {
  const path = resolveLayerPath(workspaceRoot, layerId);
  const content = await readFile(path, "utf8");
  const normalized = stripFrontmatter(content);
  if (!normalized && REQUIRED_LAYERS[layerId]) {
    throw new Error(`Arquivo de camada Alicia vazio: ${path}`);
  }

  return normalized;
};

export const loadSoulInstructions = async (
  workspaceRoot = process.cwd(),
): Promise<string> => {
  const identity = await loadLayer(workspaceRoot, "identity");
  const soul = await loadLayer(workspaceRoot, "soul");
  const voice = await loadLayer(workspaceRoot, "voice");
  const modes = await loadLayer(workspaceRoot, "modes");

  return [identity, soul, voice, modes].filter(Boolean).join("\n\n");
};
