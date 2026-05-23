import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "@/lib/api.js";

const staleTime = 5 * 60 * 1000;

export const useOverview = () =>
  useSuspenseQuery({
    queryKey: ["admin", "overview"],
    staleTime,
    queryFn: async () => {
      const response = await api.get("/admin/overview");
      return response.data.data;
    }
  });

export const useIssueHeatmap = (days = 30) =>
  useSuspenseQuery({
    queryKey: ["admin", "issue-heatmap", days],
    staleTime,
    queryFn: async () => {
      const response = await api.get("/admin/issue-heatmap", { params: { days } });
      return response.data.data;
    }
  });

export const useUnansweredSearches = (limit = 20) =>
  useSuspenseQuery({
    queryKey: ["admin", "unanswered-searches", limit],
    staleTime,
    queryFn: async () => {
      const response = await api.get("/admin/unanswered-searches", { params: { limit } });
      return response.data.data;
    }
  });

export const useFaqQuality = (sort = "worst", limit = 20) =>
  useSuspenseQuery({
    queryKey: ["admin", "faq-quality", sort, limit],
    staleTime,
    queryFn: async () => {
      const response = await api.get("/admin/faq-quality", { params: { sort, limit } });
      return response.data.data;
    }
  });

export const useModerationLoad = (days = 14) =>
  useSuspenseQuery({
    queryKey: ["admin", "moderation-load", days],
    staleTime,
    queryFn: async () => {
      const response = await api.get("/admin/moderation-load", { params: { days } });
      return response.data.data;
    }
  });

export const useAuditLogs = (params = {}) =>
  useQuery({
    queryKey: ["admin", "audit-logs", params],
    staleTime,
    queryFn: async () => {
      const response = await api.get("/admin/audit-logs", { params });
      return response.data.data;
    }
  });

export const useAdminFaqList = (params = {}) =>
  useSuspenseQuery({
    queryKey: ["admin", "faqs", params],
    staleTime,
    queryFn: async () => {
      const response = await api.get("/faqs", { params: { limit: 100, ...params } });
      return response.data.data;
    }
  });

export const useAdminUsers = (params = {}) =>
  useSuspenseQuery({
    queryKey: ["admin", "users", params],
    staleTime,
    queryFn: async () => {
      const response = await api.get("/users", { params: { page: 1, limit: 100, ...params } });
      return response.data.data;
    }
  });

export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }) => {
      const response = await api.patch(`/users/${id}`, payload);
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    }
  });
};
