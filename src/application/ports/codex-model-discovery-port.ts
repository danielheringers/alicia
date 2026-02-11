export interface CodexModelDiscoveryPort {
  listAvailableModels(models: readonly string[]): Promise<readonly string[]>;
}

