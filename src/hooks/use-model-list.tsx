import { api } from '@/lib/api';
import { useSettingsStore } from '@/lib/store';
import { TModelsResponseSchema } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';

export const useModelList = (embeddedOnly: boolean = false) => {
  const { modelVariant, baseUrl, token } = useSettingsStore();

  const keyName = embeddedOnly ? 'embed-models' : 'models';

  const {
    isLoading: modelsIsLoading,
    error: modelsError,
    data: models,
    isSuccess: modelsIsSuccess,
    isError: modelsIsError,
  } = useQuery<TModelsResponseSchema>({
    queryKey: [keyName, modelVariant, token, baseUrl],
    queryFn: async () => {
      switch (modelVariant) {
        case 'ollama': {
          const models = await api.getTag(baseUrl, embeddedOnly);
          return models.map((model) => ({ id: model.name, object: 'model', created: 0, type: null }));
        }
        case 'openai':
          return await api.getModelList(baseUrl, token, embeddedOnly);
        case 'manual':
          return [] as TModelsResponseSchema;
      }
      return [] as TModelsResponseSchema;
    },
  });

  return { modelList: { baseUrl, token, modelsIsLoading, modelsError, models, modelsIsSuccess, modelsIsError } };
};
