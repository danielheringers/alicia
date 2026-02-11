import type {
  SkillCatalogEntry,
  SkillsCatalogPort,
} from "../../application/ports/skills-catalog-port.js";
import { resolveLocalSkillsCatalogFromEnv } from "../assistant/openai-tooling.js";

export interface LocalSkillsCatalogOptions {
  workspaceRoot?: string;
}

export class LocalSkillsCatalogAdapter implements SkillsCatalogPort {
  private readonly workspaceRoot: string;

  constructor(options: LocalSkillsCatalogOptions = {}) {
    this.workspaceRoot = options.workspaceRoot ?? process.cwd();
  }

  listAvailableSkills(): readonly SkillCatalogEntry[] {
    return resolveLocalSkillsCatalogFromEnv(this.workspaceRoot)
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }
}
