import { AuthStorage, ModelRegistry, SettingsManager } from "@mariozechner/pi-coding-agent";

export function createPiConfig(cwd: string = process.cwd()) {
  const authStorage = AuthStorage.create();
  const modelRegistry = ModelRegistry.create(authStorage);
  const settingsManager = SettingsManager.create(cwd);

  return {
    authStorage,
    modelRegistry,
    settingsManager,
  };
}
