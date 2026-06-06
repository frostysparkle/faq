// React Query hooks for dashboard stats (student home cards, leaderboard, community idle buckets).
// All cached for 60s since these aggregates change slowly.
import { useQuery } from '@tanstack/react-query';
import { statsApi } from './api';

// Centralized query keys (leaderboard is parameterized by time range).
export const statsKeys = {
  studentHome: ['stats', 'student-home'] as const,
  studentDashboard: ['stats', 'student-dashboard'] as const,
  leaderboard: (range: 'week' | 'month' | 'all') => ['stats', 'leaderboard', range] as const,
  communityIdle: ['stats', 'community-idle'] as const,
};

export function useStudentHomeStats() {
  return useQuery({
    queryKey: statsKeys.studentHome,
    queryFn: statsApi.getStudentStats,
    staleTime: 60_000,
  });
}

// Full student-dashboard payload. Polls every 30s and refetches on focus so the cards
// stay near-real-time as the student asks questions, earns points, receives answers, etc.
export function useStudentDashboard() {
  return useQuery({
    queryKey: statsKeys.studentDashboard,
    queryFn: statsApi.getStudentDashboard,
    staleTime: 30_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useLeaderboard(range: 'week' | 'month' | 'all') {
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
