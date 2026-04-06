export async function resolveEffectiveModel<T>(options: {
  defaultProvider?: string;
  defaultModelId?: string;
  findModel: (provider: string, modelId: string) => T | undefined;
  getAvailableModels: () => T[] | Promise<T[]>;
}): Promise<T> {
  const { defaultProvider, defaultModelId, findModel, getAvailableModels } = options;

  if (defaultProvider && defaultModelId) {
    const configured = findModel(defaultProvider, defaultModelId);
    if (configured) {
      return configured;
    }
  }

  const available = await getAvailableModels();
  if (available.length > 0) {
    return available[0];
  }

  throw new Error("No configured or available models found");
}
