// Stats / leaderboard API client.
import type { ApiSuccess } from '@samagama/shared';
import { apiClient } from '../../lib/api-client';

export interface StudentHomeStats {
  openCommunityQuestions: number;
  unansweredCommunityQuestions: number;
  questionsYouAnswered: number;
  spurtiPoints: number;
}

export interface IdleBuckets {
  last24h: number;
  over3days: number;
  over1week: number;
  totalOpen: number;
}

export type IdleBucket = 'last24h' | 'over3days' | 'over1week';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  spurtiPoints: number;
  approvedAnswers: number;
  isMe?: boolean;
}

export interface LeaderboardResponse {
  range: 'day' | 'week' | 'month' | 'all';
  entries: LeaderboardEntry[];
  myRank?: number;
}

export const statsApi = {
  async getStudentStats(): Promise<StudentHomeStats> {
    const res = await apiClient.get<ApiSuccess<StudentHomeStats>>('/api/stats/student');
    return res.data.data;
  },

  async getLeaderboard(range: 'day' | 'week' | 'month' | 'all'): Promise<LeaderboardResponse> {
    const res = await apiClient.get<ApiSuccess<LeaderboardResponse>>('/api/stats/leaderboard', {
      params: { range },
    });
    return res.data.data;
  },

  async getCommunityIdleBuckets(): Promise<IdleBuckets> {
    const res = await apiClient.get<ApiSuccess<IdleBuckets>>('/api/stats/community-idle');
    return res.data.data;
  },
};
