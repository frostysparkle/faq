import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.js";

export const useCategories = (includeInactive = false) =>
  useSuspenseQuery({
    queryKey: ["categories", { includeInactive }],
    queryFn: async () => {
      const response = await api.get("/categories", { params: { includeInactive } });
      return response.data.data;
    }
  });

export const useCreateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload) => {
      const response = await api.post("/categories", payload);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] })
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await api.patch(`/categories/${id}`, payload);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] })
  });
};

export const useArchiveCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const response = await api.patch(`/categories/${id}/archive`);
      return response.data.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] })
  });
};
