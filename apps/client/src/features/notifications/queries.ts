import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from './api';

export const notifKeys = {
  list: ['notifications', 'list'] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
};

export function useNotifications() {
  return useQuery({
    queryKey: notifKeys.list,
    queryFn: notificationsApi.list,
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notifKeys.unreadCount,
    queryFn: notificationsApi.getUnreadCount,
    refetchInterval: 30_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notifKeys.list });
      void qc.invalidateQueries({ queryKey: notifKeys.unreadCount });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: notifKeys.list });
      void qc.invalidateQueries({ queryKey: notifKeys.unreadCount });
    },
  });
}
