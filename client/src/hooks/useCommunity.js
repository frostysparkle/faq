import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.js";

const normalizeQuestionParams = (params = {}) => ({
  status: params.status || undefined,
  categoryId: params.categoryId || undefined,
  tagId: params.tagId || undefined,
  sortBy: params.sortBy || "newest",
  page: params.page ?? 1,
  limit: params.limit ?? 20
});

const answerCountPatch = (answer, value) => ({
  ...answer,
  helpfulCount: value === "helpful" ? (answer.helpfulCount ?? 0) + 1 : answer.helpfulCount ?? 0,
  notHelpfulCount: value === "not_helpful" ? (answer.notHelpfulCount ?? 0) + 1 : answer.notHelpfulCount ?? 0
});

export const useQuestions = (params = {}) =>
  useSuspenseQuery({
    queryKey: ["community", "questions", params],
    queryFn: async () => {
      const response = await api.get("/questions", { params: normalizeQuestionParams(params) });
      return response.data.data;
    }
  });

export const useQuestion = (id) =>
  useSuspenseQuery({
    queryKey: ["community", "question", id],
    queryFn: async () => {
      const response = await api.get(`/questions/${id}`);
      return response.data.data;
    }
  });

export const useQuestionLazy = (id, options = {}) =>
  useQuery({
    queryKey: ["community", "question", id],
    enabled: Boolean(id) && options.enabled !== false,
    queryFn: async () => {
      const response = await api.get(`/questions/${id}`);
      return response.data.data;
    }
  });

export const useCheckExistingAnswers = (payload, options = {}) =>
  useQuery({
    queryKey: ["community", "check-existing", payload],
    enabled: Boolean(payload?.query?.trim()) && options.enabled !== false,
    queryFn: async () => {
      const response = await api.post("/questions/check-existing", payload);
      return response.data.data;
    },
    staleTime: 30 * 1000,
    retry: false
  });

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/questions", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community", "questions"] });
    }
  });
};

export const useSubmitAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, body }) => {
      const response = await api.post(`/questions/${questionId}/answers`, { body });
      return response.data.data;
    },
    onSuccess: (_answer, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: ["community", "answers", questionId] });
      queryClient.invalidateQueries({ queryKey: ["community", "question", questionId] });
      queryClient.invalidateQueries({ queryKey: ["community", "questions"] });
    }
  });
};

export const useAnswers = (questionId) =>
  useSuspenseQuery({
    queryKey: ["community", "answers", questionId],
    queryFn: async () => {
      const response = await api.get(`/questions/${questionId}/answers`);
      return response.data.data;
    }
  });

export const useAnswerFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ answerId, value }) => {
      const response = await api.post(`/answers/${answerId}/feedback`, { value });
      return response.data.data;
    },
    onMutate: async ({ answerId, value }) => {
      await queryClient.cancelQueries({ queryKey: ["community", "answers"] });
      const snapshots = queryClient.getQueriesData({ queryKey: ["community", "answers"] });

      queryClient.setQueriesData({ queryKey: ["community", "answers"] }, (current) => {
        if (!Array.isArray(current)) return current;
        return current.map((answer) => (answer._id === answerId ? answerCountPatch(answer, value) : answer));
      });

      return { snapshots };
    },
    onError: (_error, _variables, context) => {
      for (const [key, value] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, value);
      }
    },
    onSuccess: (counts, { answerId }) => {
      queryClient.setQueriesData({ queryKey: ["community", "answers"] }, (current) => {
        if (!Array.isArray(current)) return current;
        return current.map((answer) => (answer._id === answerId ? { ...answer, ...counts } : answer));
      });
    }
  });
};
