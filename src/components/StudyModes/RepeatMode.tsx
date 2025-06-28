import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Brain, Calendar } from 'lucide-react';
import { FlashCard } from '@/components/FlashCard/FlashCard';
import { FlashCard as FlashCardType } from '@/types/flashcard';
import { SpacedRepetitionEngine } from '@/utils/superMemo';
import { useTelegram } from '@/hooks/useTelegram';

interface RepeatModeProps {
  cards: FlashCardType[];
  onComplete: (results: RepeatResults) => void;
  onBack: () => void;
  onUpdateCard: (cardId: string, sm2Data: any) => void;
}

interface RepeatResults {
  totalCards: number;
  reviewedCards: number;
  avgQuality: number;
  timeSpent: number;
  nextReviewSchedule: { [key: string]: number };
}

export const RepeatMode: React.FC<RepeatModeProps> = ({ 
  cards, 
  onComplete, 
  onBack, 
  onUpdateCard 
}) => {
  const [dueCards, setDueCards] = useState<FlashCardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [startTime] = useState(Date.now());
  const [qualityScores, setQualityScores] = useState<number[]>([]);
  const [showCompletion, setShowCompletion] = useState(false);
  const [sm2Engine] = useState(new SpacedRepetitionEngine());

  const { hapticFeedback, backButton } = useTelegram();

  useEffect(() => {
    // Get cards that need review
    const difficult = sm2Engine.getDifficultCards(cards);
    const due = sm2Engine.getDueCards(cards);
    
    // Combine and deduplicate
    const reviewCards = [...new Set([...difficult, ...due])];
    setDueCards(reviewCards);

    if (reviewCards.length === 0) {
      setShowCompletion(true);
    }
  }, [cards, sm2Engine]);

  useEffect(() => {
    // Configure Telegram back button
    backButton.show();
    backButton.onClick(onBack);

    return () => {
      backButton.hide();
    };
  }, [backButton, onBack]);

  const handleSM2Response = (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    const card = dueCards[currentIndex];
    const sm2Result = sm2Engine.calculateNextReview(card, quality);
    
    // Update card with new SM-2 data
    onUpdateCard(card.id, sm2Result);
    
    // Track quality scores
    setQualityScores(prev => [...prev, quality]);
    
    // Haptic feedback based on quality
    if (quality >= 4) {
      hapticFeedback.notification('success');
    } else if (quality >= 2) {
      hapticFeedback.impact('medium');
    } else {
      hapticFeedback.notification('error');
    }

    // Move to next card or complete session
    if (currentIndex < dueCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowCompletion(true);
      showRepeatResults();
    }
  };

  const showRepeatResults = () => {
    const avgQuality = qualityScores.length > 0 
      ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length
      : 0;

    const nextReviewSchedule = sm2Engine.getUpcomingReviews(dueCards, 7);

    const results: RepeatResults = {
      totalCards: dueCards.length,
      reviewedCards: qualityScores.length,
      avgQuality: Math.round(avgQuality * 100) / 100,
      timeSpent: Date.now() - startTime,
      nextReviewSchedule
    };

    setTimeout(() => {
      onComplete(results);
    }, 3000);
  };

  const getQualityDescription = (quality: number) => {
    const descriptions = [
      'Полный провал',
      'Неправильно',
      'С трудом',
      'Правильно',
      'Легко',
      'Отлично'
    ];
    return descriptions[quality] || 'Неизвестно';
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (dueCards.length === 0 && !showCompletion) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-screen p-6"
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-telegram-text mb-2">
            Отлично!
          </h2>
          <p className="text-telegram-hint mb-8">
            Нет карточек для повторения
          </p>
          <p className="text-sm text-telegram-hint mb-6">
            Все сложные карточки изучены. Возвращайтесь позже для следующего повторения.
          </p>
          
          <button
            onClick={onBack}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            На главную
          </button>
        </motion.div>
      </motion.div>
    );
  }

  if (showCompletion) {
    const avgQuality = qualityScores.length > 0 
      ? qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length
      : 0;
    
    const masteryLevel = avgQuality >= 4 ? 'Отлично!' : 
                        avgQuality >= 3 ? 'Хорошо!' : 
                        avgQuality >= 2 ? 'Удовлетворительно' : 'Нужна практика';
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20"
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-3xl font-bold text-telegram-text mb-2">
            Повторение завершено!
          </h2>
          <p className="text-xl font-semibold text-blue-600 mb-4">
            {masteryLevel}
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm space-y-4"
        >
          {/* Average Quality */}
          <div className="bg-white dark:bg-telegram-secondary-bg rounded-xl p-6 shadow-lg text-center">
            <Brain className="mx-auto text-purple-500 mb-2" size={32} />
            <div className="text-3xl font-bold text-telegram-text">
              {avgQuality.toFixed(1)}/5
            </div>
            <p className="text-telegram-hint text-sm">Средняя оценка</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-telegram-secondary-bg rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{qualityScores.length}</div>
              <div className="text-xs text-telegram-hint">Карточек повторено</div>
            </div>
            <div className="bg-white dark:bg-telegram-secondary-bg rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatTime(Date.now() - startTime)}
              </div>
              <div className="text-xs text-telegram-hint">Время изучения</div>
            </div>
          </div>

          {/* Quality Distribution */}
          {qualityScores.length > 0 && (
            <div className="bg-white dark:bg-telegram-secondary-bg rounded-lg p-4">
              <h4 className="text-sm font-semibold text-telegram-text mb-3">
                Распределение оценок:
              </h4>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1, 0].map(quality => {
                  const count = qualityScores.filter(q => q === quality).length;
                  const percentage = (count / qualityScores.length) * 100;
                  
                  if (count === 0) return null;
                  
                  return (
                    <div key={quality} className="flex items-center text-xs">
                      <span className="w-16 text-telegram-hint">
                        {quality}: {getQualityDescription(quality)}
                      </span>
                      <div className="flex-1 mx-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <motion.div
                          className={`h-2 rounded-full ${
                            quality >= 4 ? 'bg-green-500' :
                            quality >= 2 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.5, delay: 0.6 }}
                        />
                      </div>
                      <span className="w-8 text-right text-telegram-hint">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Next Review Schedule */}
          <div className="bg-white dark:bg-telegram-secondary-bg rounded-lg p-4">
            <div className="flex items-center mb-3">
              <Calendar size={16} className="text-blue-500 mr-2" />
              <h4 className="text-sm font-semibold text-telegram-text">
                Следующие повторения:
              </h4>
            </div>
            <div className="text-xs text-telegram-hint">
              Карточки автоматически появятся для повторения в оптимальное время
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg">
      {/* Header */}
      <div className="sticky top-0 bg-telegram-bg border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={24} className="text-telegram-text" />
          </button>
          
          <div className="text-center">
            <h1 className="text-lg font-semibold text-telegram-text">Интервальное повторение</h1>
            <p className="text-sm text-telegram-hint">
              {currentIndex + 1} из {dueCards.length}
            </p>
          </div>

          <div className="flex items-center text-telegram-text">
            <RotateCcw size={20} className="mr-1" />
            <span className="text-sm">{dueCards.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / dueCards.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* SM-2 Info */}
      <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
          Оцените, насколько легко вам было ответить на этот вопрос (0-5)
        </p>
      </div>

      {/* Main content */}
      <div className="p-4 pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
          >
            <FlashCard
              card={dueCards[currentIndex]}
              mode="repeat"
              onSM2Response={handleSM2Response}
              showConfidence={true}
            />
          </motion.div>
        </AnimatePresence>

        {/* Current card SM-2 info */}
        {dueCards[currentIndex]?.sm2Data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white dark:bg-telegram-secondary-bg rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <h4 className="text-sm font-semibold text-telegram-text mb-2">
              Статистика карточки:
            </h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {dueCards[currentIndex].sm2Data.easeFactor.toFixed(1)}
                </div>
                <div className="text-telegram-hint">Легкость</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {dueCards[currentIndex].sm2Data.interval}
                </div>
                <div className="text-telegram-hint">Интервал (дни)</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {dueCards[currentIndex].sm2Data.repetitions}
                </div>
                <div className="text-telegram-hint">Повторений</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Session progress */}
        {qualityScores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 bg-white dark:bg-telegram-secondary-bg rounded-lg p-4 border border-gray-200 dark:border-gray-700"
          >
            <h4 className="text-sm font-semibold text-telegram-text mb-2">
              Прогресс сессии:
            </h4>
            <div className="flex items-center text-sm text-telegram-hint">
              <span>Средняя оценка: </span>
              <span className="ml-auto font-semibold text-telegram-text">
                {(qualityScores.reduce((sum, q) => sum + q, 0) / qualityScores.length).toFixed(1)}/5
              </span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};