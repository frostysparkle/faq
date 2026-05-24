import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../api/client";
import { useAuth } from "../auth/AuthProvider";

interface TaxonomyRef {
  _id: string;
  name: string;
  slug: string;
}

interface ApiFaq {
  _id: string;
  title: string;
  answer: string;
  summary: string;
  categories: TaxonomyRef[];
  tags: TaxonomyRef[];
  status: "draft" | "published" | "outdated" | "archived";
  updatedAt: string;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
}

interface RankedFaq {
  faq: ApiFaq;
  score: number;
}

interface RecentlyViewedItem {
  faq: ApiFaq;
  viewedAt: string;
}

export interface FaqViewModel {
  id: string;
  title: string;
  answer: string;
  category: string;
  categoryId?: string | undefined;
  tags: string[];
  status: string;
  updated: string;
  views: number;
  helpful: number;
  score?: number | undefined;
}

export interface CategoryViewModel {
  id: string;
  name: string;
  slug: string;
}

function formatRelativeDate(value: string): string {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffHours = Math.max(1, Math.round(diffMs / 3_600_000));
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function formatStatus(status: ApiFaq["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function toFaqViewModel(faq: ApiFaq, score?: number): FaqViewModel {
  return {
    id: faq._id,
    title: faq.title,
    answer: faq.summary || faq.answer,
    category: faq.categories[0]?.name ?? "General",
    categoryId: faq.categories[0]?._id,
    tags: faq.tags.map((tag) => tag.name),
    status: formatStatus(faq.status),
    updated: formatRelativeDate(faq.updatedAt),
    views: faq.viewCount,
    helpful: faq.helpfulCount,
    score
  };
}

function searchParams(input: {
  query?: string | undefined;
  categoryId?: string | undefined;
  status?: string | undefined;
}) {
  const params = new URLSearchParams();
  if (input.query) params.set("query", input.query);
  if (input.categoryId) params.append("categoryIds", input.categoryId);
  if (input.status) params.set("status", input.status);
  params.set("limit", "20");
  return params.toString();
}

export function useFaqs(filters: {
  query?: string | undefined;
  categoryId?: string | undefined;
  status?: string | undefined;
}) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["faqs", filters],
    enabled: Boolean(token),
    queryFn: async () => {
      const query = searchParams(filters);
      const results = await apiRequest<RankedFaq[]>(`/faqs?${query}`, {
        token: token ?? undefined
      });
      return results.map((result) => toFaqViewModel(result.faq, result.score));
    }
  });
}

export function useRecentlyUpdatedFaqs(limit = 8) {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["faqs", "recently-updated", limit],
    enabled: Boolean(token),
    queryFn: async () => {
      const results = await apiRequest<ApiFaq[]>(`/faqs/recently-updated?limit=${limit}`, {
        token: token ?? undefined
      });
      return results.map((faq) => toFaqViewModel(faq));
    }
  });
}

export function useRecentlyViewedFaqs() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["faqs", "recently-viewed"],
    enabled: Boolean(token),
    queryFn: async () => {
      const results = await apiRequest<RecentlyViewedItem[]>("/faqs/recently-viewed", {
        token: token ?? undefined
      });
      return results.map((item) => ({ ...toFaqViewModel(item.faq), viewedAt: item.viewedAt }));
    }
  });
}

export function useCategories() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["categories"],
    enabled: Boolean(token),
    queryFn: async () => {
      const categories = await apiRequest<TaxonomyRef[]>("/categories", {
        token: token ?? undefined
      });
      return categories.map<CategoryViewModel>((category) => ({
        id: category._id,
        name: category.name,
        slug: category.slug
      }));
    }
  });
}

export function useRecordFaqView() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (faqId: string) => {
      await apiRequest(`/faqs/${faqId}/view`, {
        method: "POST",
        token: token ?? undefined
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["faqs"] }),
        queryClient.invalidateQueries({ queryKey: ["faqs", "recently-viewed"] })
      ]);
    }
  });
}
