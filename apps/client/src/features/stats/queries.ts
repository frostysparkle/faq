import { useQuery } from '@tanstack/react-query';
import { statsApi } from './api';

export const statsKeys = {
  studentHome: ['stats', 'student-home'] as const,
  leaderboard: (range: 'day' | 'week' | 'month' | 'all') => ['stats', 'leaderboard', range] as const,
  communityIdle: ['stats', 'community-idle'] as const,
};

export function useStudentHomeStats() {
  return useQuery({
    queryKey: statsKeys.studentHome,
    queryFn: statsApi.getStudentStats,
    staleTime: 60_000,
  });
}

export function useLeaderboard(range: 'day' | 'week' | 'month' | 'all') {
  return useQuery({
    queryKey: statsKeys.leaderboard(range),
    queryFn: () => statsApi.getLeaderboard(range),
    staleTime: 60_000,
  });
}

export function useCommunityIdleBuckets() {
  return useQuery({
    queryKey: statsKeys.communityIdle,
    queryFn: statsApi.getCommunityIdleBuckets,
    staleTime: 60_000,
  });
}
