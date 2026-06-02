export type NotificationType =
  | 'answer_approved'
  | 'answer_rejected'
  | 'question_answered'
  | 'general';

export interface PublicNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  /** Community question ID — used to navigate to the relevant page. */
  relatedId?: string;
  createdAt: string;
}
