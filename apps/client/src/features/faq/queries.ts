// TanStack Query hooks for FAQs.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CategoryCreateInput,
  CategoryUpdateInput,
  FaqCreateInput,
  FaqListQuery,
  FaqUpdateInput,
  TagCreateInput,
  TagUpdateInput,
} from '@samagama/shared';
import { faqApi } from './api';

export const faqKeys = {
  all: ['faqs'] as const,
  lists: () => [...faqKeys.all, 'list'] as const,
  list: (query: Partial<FaqListQuery>) => [...faqKeys.lists(), query] as const,
  detail: (id: string) => [...faqKeys.all, 'detail', id] as const,
  categories: ['categories'] as const,
  tags: ['tags'] as const,
};

export function useFaqList(query: Partial<FaqListQuery>) {
  return useQuery({
    queryKey: faqKeys.list(query),
    queryFn: () => faqApi.list(query),
  });
}

export function useFaqDetail(id: string | undefined) {
  return useQuery({
    queryKey: id ? faqKeys.detail(id) : ['faqs', 'detail', 'none'],
    queryFn: () => faqApi.getById(id!),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({ queryKey: faqKeys.categories, queryFn: faqApi.listCategories });
}

export function useTags() {
  return useQuery({ queryKey: faqKeys.tags, queryFn: faqApi.listTags });
}

export function useRecordFaqView() {
  return useMutation({ mutationFn: (id: string) => faqApi.recordView(id) });
}

export function useFaqFeedback(faqId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rating: 'helpful' | 'unhelpful') => faqApi.submitFeedback(faqId, rating),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: faqKeys.detail(faqId) });
      void qc.invalidateQueries({ queryKey: faqKeys.lists() });
    },
  });
}

// --- Admin / Moderator FAQ management ---

export function useFaqStats() {
  return useQuery({
    queryKey: ['stats', 'faqs'],
    queryFn: faqApi.getFaqStats,
  });
}

export function useModeratorStats() {
  return useQuery({
    queryKey: ['stats', 'moderator'],
    queryFn: faqApi.getModeratorStats,
  });
}

export function useCreateFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: FaqCreateInput) => faqApi.create(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: faqKeys.lists() });
      void qc.invalidateQueries({ queryKey: ['stats', 'faqs'] });
    },
  });
}

export function useUpdateFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: FaqUpdateInput }) => faqApi.update(id, input),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: faqKeys.lists() });
      void qc.invalidateQueries({ queryKey: faqKeys.detail(id) });
      void qc.invalidateQueries({ queryKey: ['stats', 'faqs'] });
    },
  });
}

export function useArchiveFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => faqApi.archive(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: faqKeys.lists() });
      void qc.invalidateQueries({ queryKey: ['stats', 'faqs'] });
    },
  });
}

// --- Categories ---
export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryCreateInput) => faqApi.createCategory(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: faqKeys.categories }),
  });
}
export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CategoryUpdateInput }) =>
      faqApi.updateCategory(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: faqKeys.categories }),
  });
}
export function useArchiveCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => faqApi.archiveCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: faqKeys.categories }),
  });
}

// --- Tags ---
export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TagCreateInput) => faqApi.createTag(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: faqKeys.tags }),
  });
}
export function useUpdateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: TagUpdateInput }) =>
      faqApi.updateTag(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: faqKeys.tags }),
  });
}
export function useArchiveTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => faqApi.archiveTag(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: faqKeys.tags }),
  });
}
