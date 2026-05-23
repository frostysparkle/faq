import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.js";

export const useTags = (includeInactive = false) =>
  useSuspenseQuery({
    queryKey: ["tags", { includeInactive }],
    queryFn: async () => {
      const response = await api.get("/tags", { params: { includeInactive } });
      return response.data.data;
    }
  });

export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/tags", payload);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] })
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await api.patch(`/tags/${id}`, payload);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] })
  });
};

export const useArchiveTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.patch(`/tags/${id}/archive`);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tags"] })
  });
};
