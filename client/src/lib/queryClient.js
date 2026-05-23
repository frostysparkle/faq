import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";

const emitApiError = (error) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("samagama:api-error", {
        detail: error?.response?.data?.error ?? error
      })
    );
  }
};

const shouldRetry = (failureCount, error) => {
  const status = error?.response?.status;

  if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
    return false;
  }

  return failureCount < 2;
};

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: emitApiError
  }),
  mutationCache: new MutationCache({
    onError: emitApiError
  }),
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false
    },
    mutations: {
      retry: false
    }
  }
});
