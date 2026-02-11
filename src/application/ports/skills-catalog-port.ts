export interface SkillCatalogEntry {
  name: string;
  description: string;
  path: string;
}

export interface SkillsCatalogPort {
  listAvailableSkills(): readonly SkillCatalogEntry[];
}
