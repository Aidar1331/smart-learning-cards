import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Zap, Trophy, Timer } from 'lucide-react';
import { FlashCard } from '@/components/FlashCard/FlashCard';
import { FlashCard as FlashCardType } from '@/types/flashcard';
import { useTelegram } from '@/hooks/useTelegram';

interface ExamModeProps {
  cards: FlashCardType[];
  onComplete: (results: ExamResults) => void;
  onBack: () => void;
}

interface ExamResults {
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  score: number;
  accuracy: number;
  streak: number;
  maxStreak: number;
  timeSpent: number;
  timePerCard: number;
}

interface ExamState {
  correct: number;
  incorrect: number;
  streak: number;
  maxStreak: number;
  score: number;
  startTime: number;
  cardStartTime: number;
}

export const ExamMode: React.FC<ExamModeProps> = ({ cards, onComplete, onBack }) => {
  const [shuffledCards, setShuffledCards] = useState<FlashCardType[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [examState, setExamState] = useState<ExamState>({
    correct: 0,
    incorrect: 0,
    streak: 0,
    maxStreak: 0,
    score: 0,
    startTime: Date.now(),
    cardStartTime: Date.now()
  });
  const [showCompletion, setShowCompletion] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const { hapticFeedback, backButton } = useTelegram();

  useEffect(() => {
    // Shuffle cards without repetitions
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
  }, [cards]);

  useEffect(() => {
    // Configure Telegram back button
    backButton.show();
    backButton.onClick(onBack);

    // Timer for real-time updates
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      backButton.hide();
      clearInterval(timer);
    };
  }, [backButton, onBack]);

  const handleExamAnswer = (isCorrect: boolean) => {
    const timeSpent = Date.now() - examState.cardStartTime;
    const baseScore = isCorrect ? 10 : 0;
    const streakBonus = isCorrect ? examState.streak : 0;
    const timeBonus = isCorrect && timeSpent < 5000 ? Math.max(0, 5 - Math.floor(timeSpent / 1000)) : 0;
    const cardScore = baseScore + streakBonus + timeBonus;

    setExamState(prev => {
      const newStreak = isCorrect ? prev.streak + 1 : 0;
      const newMaxStreak = Math.max(prev.maxStreak, newStreak);
      
      return {
        ...prev,
        correct: prev.correct + (isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (isCorrect ? 0 : 1),
        streak: newStreak,
        maxStreak: newMaxStreak,
        score: prev.score + cardScore,
        cardStartTime: Date.now()
      };
    });

    // Haptic feedback
    hapticFeedback.notification(isCorrect ? 'success' : 'error');

    // Move to next card or complete exam
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setShowCompletion(true);
      showExamResults(isCorrect, cardScore);
    }
  };

  const showExamResults = (lastCorrect: boolean, lastScore: number) => {
    const totalTime = Date.now() - examState.startTime;
    const finalState = {
      ...examState,
      correct: examState.correct + (lastCorrect ? 1 : 0),
      incorrect: examState.incorrect + (lastCorrect ? 0 : 1),
      score: examState.score + lastScore
    };

    const results: ExamResults = {
      totalQuestions: shuffledCards.length,
      correctAnswers: finalState.correct,
      incorrectAnswers: finalState.incorrect,
      score: finalState.score,
      accuracy: Math.round((finalState.correct / shuffledCards.length) * 100),
      streak: finalState.streak,
      maxStreak: finalState.maxStreak,
      timeSpent: totalTime,
      timePerCard: Math.round(totalTime / shuffledCards.length / 1000)
    };

    setTimeout(() => {
      onComplete(results);
    }, 3000);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getPerformanceLevel = (accuracy: number) => {
    if (accuracy >= 90) return { level: 'Отлично!', color: 'text-green-600', emoji: '🏆' };
    if (accuracy >= 80) return { level: 'Хорошо!', color: 'text-blue-600', emoji: '🎯' };
    if (accuracy >= 70) return { level: 'Неплохо', color: 'text-yellow-600', emoji: '👍' };
    if (accuracy >= 60) return { level: 'Удовлетворительно', color: 'text-orange-600', emoji: '😐' };
    return { level: 'Нужна практика', color: 'text-red-600', emoji: '📚' };
  };

  if (showCompletion) {
    const accuracy = Math.round((examState.correct / shuffledCards.length) * 100);
    const performance = getPerformanceLevel(accuracy);
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-screen p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <div className="text-6xl mb-4">{performance.emoji}</div>
          <h2 className="text-3xl font-bold text-telegram-text mb-2">
            Экзамен завершен!
          </h2>
          <p className={`text-xl font-semibold ${performance.color} mb-4`}>
            {performance.level}
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm space-y-4"
        >
          {/* Score */}
          <div className="bg-white dark:bg-telegram-secondary-bg rounded-xl p-6 shadow-lg text-center">
            <Trophy className="mx-auto text-yellow-500 mb-2" size={32} />
            <div className="text-3xl font-bold text-telegram-text">{examState.score}</div>
            <p className="text-telegram-hint text-sm">Итоговый счет</p>
          </div>

          {/* Accuracy */}
          <div className="bg-white dark:bg-telegram-secondary-bg rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-telegram-text font-medium">Точность</span>
              <span className={`text-2xl font-bold ${performance.color}`}>{accuracy}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <motion.div
                className={`h-3 rounded-full ${
                  accuracy >= 80 ? 'bg-green-500' : 
                  accuracy >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${accuracy}%` }}
                transition={{ duration: 1, delay: 0.6 }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{examState.correct}</div>
              <div className="text-xs text-green-700 dark:text-green-400">Правильно</div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{examState.incorrect}</div>
              <div className="text-xs text-red-700 dark:text-red-400">Ошибок</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{examState.maxStreak}</div>
              <div className="text-xs text-blue-700 dark:text-blue-400">Макс. серия</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatTime(Date.now() - examState.startTime)}
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-400">Время</div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (shuffledCards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-telegram-hint">Подготовка экзамена...</p>
        </div>
      </div>
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
            <h1 className="text-lg font-semibold text-telegram-text">Режим экзамена</h1>
            <p className="text-sm text-telegram-hint">
              Вопрос {currentIndex + 1} из {shuffledCards.length}
            </p>
          </div>

          <div className="flex items-center text-telegram-text">
            <Timer size={20} className="mr-1" />
            <span className="text-sm">
              {formatTime(currentTime - examState.startTime)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / shuffledCards.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex justify-between items-center text-sm">
        <div className="flex items-center">
          <Zap size={16} className="text-yellow-500 mr-1" />
          <span className="text-telegram-text">Серия: {examState.streak}</span>
        </div>
        <div className="text-telegram-text">
          Счет: {examState.score}
        </div>
        <div className="text-telegram-text">
          {examState.correct}/{currentIndex + 1}
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
              card={shuffledCards[currentIndex]}
              mode="exam"
              onAnswer={handleExamAnswer}
            />
          </motion.div>
        </AnimatePresence>

        {/* Quick stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 grid grid-cols-2 gap-4"
        >
          <div className="bg-white dark:bg-telegram-secondary-bg rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-lg font-bold text-green-600">{examState.correct}</div>
            <div className="text-xs text-telegram-hint">Правильно</div>
          </div>
          <div className="bg-white dark:bg-telegram-secondary-bg rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
            <div className="text-lg font-bold text-red-600">{examState.incorrect}</div>
            <div className="text-xs text-telegram-hint">Ошибок</div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};