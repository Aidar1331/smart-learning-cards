export interface FlashCard {
  id: string;
  studySetId: string;
  front: string;
  back: string;
  sourceFragment: string;
  confidence: number; // 1-10
  cardOrder: number;
  createdAt: string;
  sm2Data?: SM2Data;
  reviewHistory?: ReviewHistory[];
}

export interface SM2Data {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: number;
  lastReviewed: number;
}

export interface ReviewHistory {
  timestamp: number;
  response: 'know' | 'unknown' | 'difficult';
  quality?: number; // 0-5 for SM-2
}

export interface StudySet {
  id: string;
  userId: string;
  title: string;
  sourceType: 'text' | 'file' | 'url';
  sourceContent: string;
  sourceFilename?: string;
  totalCards: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningProgress {
  id: string;
  userId: string;
  flashcardId: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReview?: number;
  lastReviewed?: number;
  totalReviews: number;
  correctReviews: number;
  lastResponse?: 'know' | 'unknown' | 'difficult';
}

export interface StudySession {
  id: string;
  userId: string;
  studySetId: string;
  mode: 'review' | 'exam' | 'repeat';
  startedAt: string;
  endedAt?: string;
  totalCards: number;
  correctAnswers: number;
  score: number;
  maxStreak: number;
}