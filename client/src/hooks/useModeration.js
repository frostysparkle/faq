import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.js";

const queueKey = ["moderation", "queue"];

const removeQueueItem = (current, predicate) => {
  if (!current?.items) return current;

  return {
    ...current,
    items: current.items.filter((item) => !predicate(item)),
    total: Math.max((current.total ?? 1) - 1, 0),
    health: {
      ...current.health,
      pendingCount: Math.max((current.health?.pendingCount ?? 1) - 1, 0)
    }
  };
};

const useOptimisticQueueMutation = ({ mutationFn, removePredicate }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: queueKey });
      const snapshots = queryClient.getQueriesData({ queryKey: queueKey });
      queryClient.setQueriesData({ queryKey: queueKey }, (current) => removeQueueItem(current, (item) => removePredicate(item, variables)));
      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, value);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queueKey });
      queryClient.invalidateQueries({ queryKey: ["moderation", "analytics"] });
      queryClient.invalidateQueries({ queryKey: ["community", "questions"] });
      queryClient.invalidateQueries({ queryKey: ["community", "answers"] });
    }
  });
};

export const usePendingQueue = (params = {}) =>
  useSuspenseQuery({
    queryKey: [...queueKey, params],
    queryFn: async () => {
      const response = await api.get("/moderation/queue", { params });
      return response.data.data;
    }
  });

export const useApproveAnswer = () =>
  useOptimisticQueueMutation({
    mutationFn: async ({ answerId, moderationNote }) => {
      const response = await api.patch(`/answers/${answerId}/approve`, { moderationNote });
      return response.data.data;
    },
    removePredicate: (item, variables) => item.answerId === variables.answerId
  });

export const useRejectAnswer = () =>
  useOptimisticQueueMutation({
    mutationFn: async ({ answerId, reason }) => {
      const response = await api.patch(`/answers/${answerId}/reject`, { reason });
      return response.data.data;
    },
    removePredicate: (item, variables) => item.answerId === variables.answerId
  });

export const useRequestChanges = () =>
  useOptimisticQueueMutation({
    mutationFn: async ({ answerId, note }) => {
      const response = await api.patch(`/answers/${answerId}/request-changes`, { note });
      return response.data.data;
    },
    removePredicate: (item, variables) => item.answerId === variables.answerId
  });

export const useResolveQuestion = () =>
  useOptimisticQueueMutation({
    mutationFn: async ({ questionId }) => {
      const response = await api.patch(`/questions/${questionId}/resolve`);
      return response.data.data;
    },
    removePredicate: (item, variables) => item.questionId === variables.questionId
  });

export const useMarkDuplicate = () =>
  useOptimisticQueueMutation({
    mutationFn: async ({ questionId, duplicateOf }) => {
      const response = await api.patch(`/questions/${questionId}/duplicate`, { duplicateOf });
      return response.data.data;
    },
    removePredicate: (item, variables) => item.questionId === variables.questionId
  });

export const useRecommendFaqConversion = () =>
  useOptimisticQueueMutation({
    mutationFn: async ({ answerId, notes }) => {
      const response = await api.patch(`/answers/${answerId}/recommend-faq`, { notes });
      return response.data.data;
    },
    removePredicate: () => false
  });

export const useFaqConversionCandidates = () =>
  useSuspenseQuery({
    queryKey: ["moderation", "faq-candidates"],
    queryFn: async () => {
      const response = await api.get("/moderation/faq-candidates");
      return response.data.data;
    }
  });

export const useModerationAnalytics = () =>
  useSuspenseQuery({
    queryKey: ["moderation", "analytics"],
    queryFn: async () => {
      const response = await api.get("/moderation/analytics");
      return response.data.data;
    }
  });

export const useBulkModeration = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/moderation/bulk", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKey });
      queryClient.invalidateQueries({ queryKey: ["moderation", "analytics"] });
    }
  });
};
