import type {
  AnswerCreateInput,
  ApiSuccess,
  CheckExistingInput,
  ExistingAnswerCheckResult,
  PublicAnswer,
  PublicQuestion,
  QuestionCreateInput,
} from '@samagama/shared';
import { apiClient } from '../../lib/api-client';

export const qnaApi = {
  async checkExisting(input: CheckExistingInput): Promise<ExistingAnswerCheckResult> {
    const res = await apiClient.post<ApiSuccess<ExistingAnswerCheckResult>>(
      '/api/qna/check-existing',
      input,
    );
    return res.data.data;
  },

  async createQuestion(input: QuestionCreateInput): Promise<PublicQuestion> {
    const res = await apiClient.post<ApiSuccess<PublicQuestion>>('/api/qna/questions', input);
    return res.data.data;
  },

  async tagMe(questionId: string, existingAnswerCheckToken: string): Promise<void> {
    await apiClient.post(`/api/qna/questions/${questionId}/tag-me`, { existingAnswerCheckToken });
  },

  async listQuestions(params: {
    type?: 'personal' | 'community';
    status?: string;
    mine?: boolean;
    idle?: 'last24h' | 'over3days' | 'over1week';
  }): Promise<PublicQuestion[]> {
    const res = await apiClient.get<ApiSuccess<PublicQuestion[]>>('/api/qna/questions', {
      params,
    });
    return res.data.data;
  },

  async getQuestion(id: string): Promise<PublicQuestion> {
    const res = await apiClient.get<ApiSuccess<PublicQuestion>>(`/api/qna/questions/${id}`);
    return res.data.data;
  },

  async listAnswers(questionId: string): Promise<PublicAnswer[]> {
    const res = await apiClient.get<ApiSuccess<PublicAnswer[]>>(
      `/api/qna/questions/${questionId}/answers`,
    );
    return res.data.data;
  },

  async submitAnswer(questionId: string, input: AnswerCreateInput): Promise<PublicAnswer> {
    const res = await apiClient.post<ApiSuccess<PublicAnswer>>(
      `/api/qna/questions/${questionId}/answers`,
      input,
    );
    return res.data.data;
  },

  async voteAnswer(
    answerId: string,
    direction: 'up' | 'down',
  ): Promise<{ upvoteCount: number; downvoteCount: number; myVote: 'up' | 'down' | null }> {
    const res = await apiClient.post<
      ApiSuccess<{ upvoteCount: number; downvoteCount: number; myVote: 'up' | 'down' | null }>
    >(`/api/qna/answers/${answerId}/vote/${direction}`);
    return res.data.data;
  },
};

// --- Moderation ---
interface PendingAnswerSummary {
  id: string;
  body: string;
  questionId: string;
  questionTitle: string;
  author: { id: string; name: string };
  /** Other students who tagged themselves on the same question (Dashboard Spec). */
  taggedStudents: { id: string; name: string }[];
  createdAt: string;
}

export const moderationApi = {
  async listPendingAnswers(): Promise<PendingAnswerSummary[]> {
    const res = await apiClient.get<ApiSuccess<PendingAnswerSummary[]>>(
      '/api/moderation/pending-answers',
    );
    return res.data.data;
  },
  async listPendingForQuestion(questionId: string, limit: number): Promise<PendingAnswerSummary[]> {
    const res = await apiClient.get<ApiSuccess<PendingAnswerSummary[]>>(
      `/api/moderation/questions/${questionId}/pending-answers`,
      { params: { limit } },
    );
    return res.data.data;
  },
  async approveAnswer(
    id: string,
    input: { editedBody?: string; note?: string; spurtiPoints?: number } = {},
  ): Promise<void> {
    await apiClient.patch(`/api/moderation/answers/${id}/approve`, input);
  },
  async rejectAnswer(id: string, input: { note?: string } = {}): Promise<void> {
    await apiClient.patch(`/api/moderation/answers/${id}/reject`, input);
  },
  async respondToPersonal(questionId: string, body: string): Promise<void> {
    await apiClient.post(`/api/moderation/questions/${questionId}/respond`, { body });
  },
};

export type { PendingAnswerSummary };
