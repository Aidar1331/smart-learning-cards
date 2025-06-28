import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BarChart3, Target } from 'lucide-react';
import { FlashCard } from '@/components/FlashCard/FlashCard';
import { FlashCard as FlashCardType } from '@/types/flashcard';
import { useTelegram } from '@/hooks/useTelegram';

interface ReviewModeProps {
  cards: FlashCardType[];
  onComplete: (results: ReviewResults) => void;
  onBack: () => void;
}

interface ReviewResults {
  totalCards: number;
  knownCards: number;
  difficultCards: number;
  unknownCards: number;
  timeSpent: number;
}

interface ProgressState {
  [cardId: string]: {
    response: 'know' | 'unknown' | 'difficult';
    timestamp: number;
  };
}

export const ReviewMode: React.FC<ReviewModeProps> = ({ cards, onComplete, onBack }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState<ProgressState>({});
  const [startTime] = useState(Date.now());
  const [showCompletion, setShowCompletion] = useState(false);
  
  const { hapticFeedback, backButton } = useTelegram();

  useEffect(() => {
    // Configure Telegram back button
    backButton.show();
    backButton.onClick(onBack);

    return () => {
      backButton.hide();
    };
  }, [backButton, onBack]);

  const handleCardResponse = (response: 'know' | 'unknown' | 'difficult') => {
    const cardId = cards[currentIndex].id;
    
    // Save progress
    setProgress(prev => ({
      ...prev,
      [cardId]: {
        response,
        timestamp: Date.now()
      }
    }));

    // Haptic feedback based on response
    if (response === 'know') {
      hapticFeedback.notification('success');
    } else if (response === 'unknown') {
      hapticFeedback.notification('error');
    } else {
      hapticFeedback.notification('warning');
    }

    // Move to next card or show completion
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowCompletion(true);
      showCompletionResults();
    }
  };

  const showCompletionResults = () => {
    const responses = Object.values(progress);
    const results: ReviewResults = {
      totalCards: cards.length,
      knownCards: responses.filter(r => r.response === 'know').length,
      difficultCards: responses.filter(r => r.response === 'difficult').length,
      unknownCards: responses.filter(r => r.response === 'unknown').length,
      timeSpent: Date.now() - startTime
    };

    setTimeout(() => {
      onComplete(results);
    }, 3000);
  };

  const getProgressStats = () => {
    const responses = Object.values(progress);
    return {
      total: responses.length,
      known: responses.filter(r => r.response === 'know').length,
      difficult: responses.filter(r => r.response === 'difficult').length,
      unknown: responses.filter(r => r.response === 'unknown').length
    };
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (showCompletion) {
    const stats = getProgressStats();
    const accuracy = stats.total > 0 ? Math.round((stats.known / stats.total) * 100) : 0;
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20"
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center"
        >
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-telegram-text mb-2">
            Отличная работа!
          </h2>
          <p className="text-telegram-hint mb-8">
            Вы завершили просмотр всех карточек
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm space-y-4"
        >
          <div className="bg-white dark:bg-telegram-secondary-bg rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <Target className="text-blue-500" size={24} />
              <span className="text-2xl font-bold text-telegram-text">{accuracy}%</span>
            </div>
            <p className="text-telegram-hint text-sm">Точность знаний</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.known}</div>
              <div className="text-xs text-green-700 dark:text-green-400">Знаю</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.difficult}</div>
              <div className="text-xs text-yellow-700 dark:text-yellow-400">Сложно</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-600">{stats.unknown}</div>
              <div className="text-xs text-red-700 dark:text-red-400">Не знаю</div>
            </div>
          </div>

          <div className="bg-white dark:bg-telegram-secondary-bg rounded-lg p-4 text-center">
            <div className="text-lg font-semibold text-telegram-text">
              {formatTime(Date.now() - startTime)}
            </div>
            <div className="text-xs text-telegram-hint">Время изучения</div>
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
            <h1 className="text-lg font-semibold text-telegram-text">Режим просмотра</h1>
            <p className="text-sm text-telegram-hint">
              {currentIndex + 1} из {cards.length}
            </p>
          </div>

          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <BarChart3 size={24} className="text-telegram-text" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-blue-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
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
              card={cards[currentIndex]}
              mode="review"
              onResponse={handleCardResponse}
              showConfidence={true}
            />
          </motion.div>
        </AnimatePresence>

        {/* Current stats */}
        {Object.keys(progress).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 grid grid-cols-3 gap-3"
          >
            {[
              { label: 'Знаю', count: getProgressStats().known, color: 'text-green-600' },
              { label: 'Сложно', count: getProgressStats().difficult, color: 'text-yellow-600' },
              { label: 'Не знаю', count: getProgressStats().unknown, color: 'text-red-600' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-white dark:bg-telegram-secondary-bg rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700"
              >
                <div className={`text-xl font-bold ${stat.color}`}>
                  {stat.count}
                </div>
                <div className="text-xs text-telegram-hint">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};