import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseInfiniteQuery,
  useSuspenseQuery
} from "@tanstack/react-query";
import { api } from "@/lib/api.js";

const normalizeSearchParams = (params = {}) => ({
  query: params.query || undefined,
  categoryId: params.categoryId || undefined,
  tagIds: params.tagIds?.length ? params.tagIds.join(",") : undefined,
  status: params.status || undefined,
  limit: params.limit ?? 12
});

const fetchFaqSearchPage = async ({ pageParam = 1, queryKey }) => {
  const [, , params] = queryKey;
  const response = await api.get("/faqs", {
    params: {
      ...normalizeSearchParams(params),
      page: pageParam
    }
  });

  return response.data.data;
};

export const useFaqSearch = (params = {}) =>
  useSuspenseInfiniteQuery({
    queryKey: ["faqs", "search", params],
    queryFn: fetchFaqSearchPage,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined)
  });

export const useFaqSearchLazy = (params = {}) =>
  useInfiniteQuery({
    queryKey: ["faqs", "search", params],
    queryFn: fetchFaqSearchPage,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.page < lastPage.totalPages ? lastPage.page + 1 : undefined)
  });

export const useFaq = (id) =>
  useSuspenseQuery({
    queryKey: ["faq", id],
    queryFn: async () => {
      const response = await api.get(`/faqs/${id}`);
      return response.data.data;
    }
  });

export const useFaqLazy = (id, options = {}) =>
  useQuery({
    queryKey: ["faq", id],
    enabled: Boolean(id) && options.enabled !== false,
    queryFn: async () => {
      const response = await api.get(`/faqs/${id}`);
      return response.data.data;
    }
  });

export const useCurrentUser = () =>
  useSuspenseQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const response = await api.get("/auth/me");
      return response.data.data;
    }
  });

export const useCreateFaq = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/faqs", payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
    }
  });
};

export const useUpdateFaq = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await api.patch(`/faqs/${id}`, payload);
      return response.data.data;
    },
    onSuccess: (faq) => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      queryClient.invalidateQueries({ queryKey: ["faq", faq._id] });
    }
  });
};

export const useChangeFaqStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await api.patch(`/faqs/${id}/status`, { status });
      return response.data.data;
    },
    onSuccess: (faq) => {
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      queryClient.invalidateQueries({ queryKey: ["faq", faq._id] });
    }
  });
};

const applyFeedbackCounts = (faq, value) => {
  if (!faq) return faq;

  return {
    ...faq,
    helpfulCount: value === "helpful" ? (faq.helpfulCount ?? 0) + 1 : faq.helpfulCount ?? 0,
    notHelpfulCount: value === "not_helpful" ? (faq.notHelpfulCount ?? 0) + 1 : faq.notHelpfulCount ?? 0
  };
};

export const useFaqFeedback = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ faqId, value }) => {
      const response = await api.post(`/faqs/${faqId}/feedback`, { value });
      return response.data.data;
    },
    onMutate: async ({ faqId, value }) => {
      await queryClient.cancelQueries({ queryKey: ["faq", faqId] });
      const previousDetail = queryClient.getQueryData(["faq", faqId]);

      queryClient.setQueryData(["faq", faqId], (current) =>
        current ? { ...current, faq: applyFeedbackCounts(current.faq, value) } : current
      );
      queryClient.setQueriesData({ queryKey: ["faqs", "search"] }, (current) => {
        if (!current?.pages) return current;

        return {
          ...current,
          pages: current.pages.map((page) => ({
            ...page,
            faqs: page.faqs.map((faq) => (faq._id === faqId ? applyFeedbackCounts(faq, value) : faq))
          }))
        };
      });

      return { previousDetail };
    },
    onError: (_error, { faqId }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(["faq", faqId], context.previousDetail);
      }
    },
    onSuccess: (counts, { faqId }) => {
      queryClient.setQueryData(["faq", faqId], (current) =>
        current ? { ...current, faq: { ...current.faq, ...counts } } : current
      );
    },
    onSettled: (_data, _error, { faqId }) => {
      queryClient.invalidateQueries({ queryKey: ["faq", faqId] });
    }
  });
};

export const useCheckSimilarity = () =>
  useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/faqs/check-similar", payload);
      return response.data.data;
    }
  });
