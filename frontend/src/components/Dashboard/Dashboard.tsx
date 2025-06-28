import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Eye, 
  Target, 
  RotateCcw, 
  BarChart3, 
  BookOpen, 
  TrendingUp,
  Calendar,
  Zap
} from 'lucide-react';
import { FlashCard, StudySet } from '@/types/flashcard';
import { TelegramUser } from '@/types/telegram';
import { SpacedRepetitionEngine } from '@/utils/superMemo';
import { useTelegram } from '@/hooks/useTelegram';

interface DashboardProps {
  cards: FlashCard[];
  user: TelegramUser | null;
  onCreateCards: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ cards, user, onCreateCards }) => {
  const navigate = useNavigate();
  const { hapticFeedback, mainButton } = useTelegram();
  const [sm2Engine] = useState(new SpacedRepetitionEngine());

  const stats = useMemo(() => {
    const studyStats = sm2Engine.getStudyStats(cards);
    const dueCards = sm2Engine.getDueCards(cards);
    const difficultCards = sm2Engine.getDifficultCards(cards);
    
    return {
      ...studyStats,
      dueToday: dueCards.length,
      difficultCount: difficultCards.length,
      hasReviewedCards: cards.some(card => card.sm2Data?.lastReviewed)
    };
  }, [cards, sm2Engine]);

  const studyModes = [
    {
      id: 'review',
      title: 'Просмотр',
      description: 'Последовательное изучение карточек',
      icon: Eye,
      color: 'bg-blue-500',
      available: cards.length > 0,
      count: cards.length,
      route: '/study/review'
    },
    {
      id: 'exam',
      title: 'Экзамен',
      description: 'Проверка знаний в случайном порядке',
      icon: Target,
      color: 'bg-purple-500',
      available: stats.hasReviewedCards,
      count: cards.length,
      route: '/study/exam'
    },
    {
      id: 'repeat',
      title: 'Повторение',
      description: 'Умное повторение сложных карточек',
      icon: RotateCcw,
      color: 'bg-green-500',
      available: stats.difficultCount > 0 || stats.dueToday > 0,
      count: Math.max(stats.difficultCount, stats.dueToday),
      route: '/study/repeat'
    }
  ];

  const handleModeSelect = (mode: typeof studyModes[0]) => {
    if (!mode.available) {
      hapticFeedback.notification('error');
      return;
    }
    
    hapticFeedback.impact('medium');
    navigate(mode.route);
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Сегодня';
    if (days === 1) return 'Вчера';
    if (days < 7) return `${days} дн. назад`;
    return `${Math.floor(days / 7)} нед. назад`;
  };

  return (
    <div className="min-h-screen bg-telegram-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-8 text-white">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                Привет, {user?.first_name || 'Пользователь'}! 👋
              </h1>
              <p className="text-blue-100 mt-1">
                Готовы к изучению?
              </p>
            </div>
            <button
              onClick={onCreateCards}
              className="bg-white bg-opacity-20 p-3 rounded-full hover:bg-opacity-30 transition-all"
            >
              <Plus size={24} />
            </button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-blue-100">Всего карточек</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{stats.masteryPercentage}%</div>
              <div className="text-xs text-blue-100">Изучено</div>
            </div>
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{stats.dueToday}</div>
              <div className="text-xs text-blue-100">К повторению</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6">
        {/* Study Modes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold text-telegram-text mb-4">
            Режимы изучения
          </h2>
          
          <div className="space-y-3">
            {studyModes.map((mode) => (
              <motion.button
                key={mode.id}
                whileHover={{ scale: mode.available ? 1.02 : 1 }}
                whileTap={{ scale: mode.available ? 0.98 : 1 }}
                onClick={() => handleModeSelect(mode)}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  mode.available
                    ? 'border-transparent bg-white dark:bg-telegram-secondary-bg shadow-lg hover:shadow-xl'
                    : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 opacity-60'
                }`}
                disabled={!mode.available}
              >
                <div className="flex items-center">
                  <div className={`p-3 rounded-lg ${mode.color} ${mode.available ? '' : 'opacity-50'}`}>
                    <mode.icon size={24} className="text-white" />
                  </div>
                  
                  <div className="ml-4 flex-1 text-left">
                    <h3 className="font-semibold text-telegram-text">
                      {mode.title}
                    </h3>
                    <p className="text-sm text-telegram-hint">
                      {mode.description}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    {mode.available ? (
                      <>
                        <div className="text-lg font-bold text-telegram-text">
                          {mode.count}
                        </div>
                        <div className="text-xs text-telegram-hint">
                          карточек
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-telegram-hint">
                        Недоступно
                      </div>
                    )}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Progress Overview */}
        {stats.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-8"
          >
            <h2 className="text-xl font-semibold text-telegram-text mb-4">
              Прогресс изучения
            </h2>
            
            <div className="bg-white dark:bg-telegram-secondary-bg rounded-xl p-6 shadow-lg">
              {/* Mastery Progress */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-telegram-text font-medium">Общий прогресс</span>
                  <span className="text-lg font-bold text-telegram-text">
                    {stats.masteryPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <motion.div
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.masteryPercentage}%` }}
                    transition={{ duration: 1, delay: 0.6 }}
                  />
                </div>
              </div>

              {/* Detailed Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <BookOpen size={20} className="text-blue-500 mr-2" />
                    <span className="text-2xl font-bold text-telegram-text">
                      {stats.reviewed}
                    </span>
                  </div>
                  <p className="text-xs text-telegram-hint">Изучено карточек</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp size={20} className="text-green-500 mr-2" />
                    <span className="text-2xl font-bold text-telegram-text">
                      {stats.mastered}
                    </span>
                  </div>
                  <p className="text-xs text-telegram-hint">Освоено полностью</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Calendar size={20} className="text-orange-500 mr-2" />
                    <span className="text-2xl font-bold text-telegram-text">
                      {stats.due}
                    </span>
                  </div>
                  <p className="text-xs text-telegram-hint">К повторению</p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Zap size={20} className="text-purple-500 mr-2" />
                    <span className="text-2xl font-bold text-telegram-text">
                      {stats.avgEaseFactor}
                    </span>
                  </div>
                  <p className="text-xs text-telegram-hint">Ср. легкость</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        {cards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h2 className="text-xl font-semibold text-telegram-text mb-4">
              Последние карточки
            </h2>
            
            <div className="space-y-3">
              {cards.slice(0, 3).map((card) => (
                <div
                  key={card.id}
                  className="bg-white dark:bg-telegram-secondary-bg rounded-lg p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-telegram-text mb-1">
                        {card.front}
                      </h4>
                      <p className="text-sm text-telegram-hint line-clamp-2">
                        {card.back}
                      </p>
                    </div>
                    
                    <div className="ml-3 text-right">
                      <div className="flex items-center mb-1">
                        {[...Array(card.confidence)].map((_, i) => (
                          <div key={i} className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-0.5" />
                        ))}
                      </div>
                      <p className="text-xs text-telegram-hint">
                        {card.sm2Data?.lastReviewed
                          ? formatTimeAgo(card.sm2Data.lastReviewed)
                          : 'Не изучена'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {cards.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="text-center py-12"
          >
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-telegram-text mb-2">
              Пора начать изучение!
            </h3>
            <p className="text-telegram-hint mb-6">
              Создайте первые карточки и начните изучать с помощью ИИ
            </p>
            <button
              onClick={onCreateCards}
              className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors flex items-center mx-auto"
            >
              <Plus size={20} className="mr-2" />
              Создать карточки
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};