import { FlashCard, SM2Data } from '@/types/flashcard';

export interface SuperMemoResult {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReview: number;
  lastReviewed: number;
}

/**
 * Optimized SuperMemo SM-2 Algorithm Implementation
 * 
 * Quality scale:
 * 0 - Complete blackout
 * 1 - Incorrect response; correct one remembered
 * 2 - Incorrect response; correct one seemed easy to recall
 * 3 - Correct response recalled with serious difficulty
 * 4 - Correct response after hesitation
 * 5 - Perfect response
 */
export class SpacedRepetitionEngine {
  /**
   * Calculate next review parameters based on response quality
   */
  calculateNextReview(card: FlashCard, quality: number): SuperMemoResult {
    // Get current SM-2 data or initialize defaults
    const currentData: SM2Data = card.sm2Data || {
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: Date.now(),
      lastReviewed: Date.now()
    };

    let { easeFactor, interval, repetitions } = currentData;

    // Clamp quality to valid range
    quality = Math.max(0, Math.min(5, Math.round(quality)));

    if (quality >= 3) {
      // Correct response
      repetitions++;
      
      if (repetitions === 1) {
        interval = 1;
      } else if (repetitions === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      
      // Update ease factor
      easeFactor = Math.max(
        1.3, 
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
    } else {
      // Incorrect response - reset repetitions and interval
      repetitions = 0;
      interval = 1;
      
      // Slightly decrease ease factor for incorrect responses
      easeFactor = Math.max(1.3, easeFactor - 0.2);
    }

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return {
      easeFactor: Math.round(easeFactor * 100) / 100, // Round to 2 decimal places
      interval,
      repetitions,
      nextReview: nextReviewDate.getTime(),
      lastReviewed: Date.now()
    };
  }

  /**
   * Get cards that are due for review
   */
  getDueCards(cards: FlashCard[]): FlashCard[] {
    const now = Date.now();
    
    return cards.filter(card => {
      // New cards are always due
      if (!card.sm2Data?.nextReview) {
        return true;
      }
      
      // Check if card is due for review
      return card.sm2Data.nextReview <= now;
    });
  }

  /**
   * Get cards marked as difficult (for repeat mode)
   */
  getDifficultCards(cards: FlashCard[]): FlashCard[] {
    const now = Date.now();
    
    return cards.filter(card => {
      // Check if card has difficult reviews in history
      const hasDifficultHistory = card.reviewHistory?.some(review => 
        review.response === 'unknown' || review.response === 'difficult'
      );
      
      // Include cards with low ease factor (< 2.0)
      const hasLowEaseFactor = card.sm2Data?.easeFactor && card.sm2Data.easeFactor < 2.0;
      
      // Include due cards that are difficult
      const isDue = !card.sm2Data?.nextReview || card.sm2Data.nextReview <= now;
      
      return (hasDifficultHistory || hasLowEaseFactor) && isDue;
    });
  }

  /**
   * Convert review response to SM-2 quality score
   */
  responseToQuality(response: 'know' | 'unknown' | 'difficult'): number {
    switch (response) {
      case 'know':
        return 5; // Perfect response
      case 'difficult':
        return 3; // Correct with difficulty
      case 'unknown':
        return 1; // Incorrect response
      default:
        return 1;
    }
  }

  /**
   * Get study statistics for a set of cards
   */
  getStudyStats(cards: FlashCard[]) {
    const total = cards.length;
    const reviewed = cards.filter(card => card.sm2Data?.lastReviewed).length;
    const due = this.getDueCards(cards).length;
    const difficult = this.getDifficultCards(cards).length;
    
    // Calculate average ease factor
    const cardsWithEase = cards.filter(card => card.sm2Data?.easeFactor);
    const avgEaseFactor = cardsWithEase.length > 0 
      ? cardsWithEase.reduce((sum, card) => sum + (card.sm2Data!.easeFactor), 0) / cardsWithEase.length
      : 2.5;

    // Calculate mastery percentage (cards with ease factor > 2.5 and interval > 7)
    const masteredCards = cards.filter(card => 
      card.sm2Data?.easeFactor && card.sm2Data.easeFactor > 2.5 &&
      card.sm2Data.interval && card.sm2Data.interval > 7
    ).length;

    return {
      total,
      reviewed,
      due,
      difficult,
      mastered: masteredCards,
      masteryPercentage: total > 0 ? Math.round((masteredCards / total) * 100) : 0,
      avgEaseFactor: Math.round(avgEaseFactor * 100) / 100
    };
  }

  /**
   * Predict next review intervals for planning
   */
  getUpcomingReviews(cards: FlashCard[], days: number = 7): { [key: string]: number } {
    const schedule: { [key: string]: number } = {};
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      schedule[dateKey] = cards.filter(card => {
        if (!card.sm2Data?.nextReview) return false;
        const reviewDate = new Date(card.sm2Data.nextReview);
        return reviewDate.toISOString().split('T')[0] === dateKey;
      }).length;
    }
    
    return schedule;
  }
}