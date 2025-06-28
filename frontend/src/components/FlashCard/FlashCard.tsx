import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, CheckCircle, XCircle, HelpCircle, Volume2 } from 'lucide-react';
import { FlashCard as FlashCardType } from '@/types/flashcard';
import { useTelegram } from '@/hooks/useTelegram';

interface FlashCardProps {
  card: FlashCardType;
  mode?: 'review' | 'exam' | 'repeat';
  onResponse?: (response: 'know' | 'unknown' | 'difficult') => void;
  onAnswer?: (isCorrect: boolean) => void;
  onSM2Response?: (quality: 0 | 1 | 2 | 3 | 4 | 5) => void;
  showConfidence?: boolean;
  className?: string;
}

export const FlashCard: React.FC<FlashCardProps> = ({
  card,
  mode = 'review',
  onResponse,
  onAnswer,
  onSM2Response,
  showConfidence = false,
  className = ''
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [showAnswerCheck, setShowAnswerCheck] = useState(false);
  const { hapticFeedback } = useTelegram();
  const cardRef = useRef<HTMLDivElement>(null);

  const handleFlip = () => {
    hapticFeedback.selection();
    setIsFlipped(!isFlipped);
  };

  const handleResponse = (response: 'know' | 'unknown' | 'difficult') => {
    hapticFeedback.impact(response === 'know' ? 'light' : 'medium');
    onResponse?.(response);
    setIsFlipped(false);
  };

  const handleExamAnswer = () => {
    setShowAnswerCheck(true);
    setIsFlipped(true);
  };

  const handleAnswerResult = (isCorrect: boolean) => {
    hapticFeedback.notification(isCorrect ? 'success' : 'error');
    onAnswer?.(isCorrect);
    setShowAnswerCheck(false);
    setIsFlipped(false);
    setUserAnswer('');
  };

  const handleSM2Response = (quality: 0 | 1 | 2 | 3 | 4 | 5) => {
    hapticFeedback.impact('light');
    onSM2Response?.(quality);
    setIsFlipped(false);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ru-RU';
      speechSynthesis.speak(utterance);
    }
  };

  const cardVariants = {
    initial: { opacity: 0, y: 50, rotateY: 0 },
    animate: { opacity: 1, y: 0, rotateY: 0 },
    exit: { opacity: 0, y: -50, rotateY: 0 },
    flip: { rotateY: 180 }
  };

  const SM2_QUALITIES = [
    { value: 0, label: 'Полный провал', color: 'bg-red-700', emoji: '😵' },
    { value: 1, label: 'Неправильно', color: 'bg-red-500', emoji: '😞' },
    { value: 2, label: 'С трудом', color: 'bg-orange-500', emoji: '😐' },
    { value: 3, label: 'Правильно', color: 'bg-yellow-500', emoji: '🙂' },
    { value: 4, label: 'Легко', color: 'bg-green-500', emoji: '😊' },
    { value: 5, label: 'Отлично', color: 'bg-green-700', emoji: '🤩' }
  ];

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      <motion.div
        ref={cardRef}
        className="relative w-full h-80 preserve-3d cursor-pointer"
        variants={cardVariants}
        initial="initial"
        animate={isFlipped ? "flip" : "animate"}
        exit="exit"
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
        style={{ transformStyle: 'preserve-3d' }}
        onClick={!isFlipped ? handleFlip : undefined}
      >
        {/* Front of card */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-telegram-secondary-bg rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-center items-center"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-center">
            <h2 className="text-xl font-semibold text-telegram-text mb-4">
              {card.front}
            </h2>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                speakText(card.front);
              }}
              className="p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
            >
              <Volume2 size={20} />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center text-sm text-telegram-hint">
            <span>Нажмите для ответа</span>
            {showConfidence && (
              <div className="flex items-center gap-1">
                <span>Уверенность:</span>
                <div className="flex">
                  {[...Array(card.confidence)].map((_, i) => (
                    <div key={i} className="w-2 h-2 bg-blue-500 rounded-full mr-1" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back of card */}
        <div 
          className="absolute inset-0 w-full h-full backface-hidden bg-white dark:bg-telegram-secondary-bg rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 flex flex-col"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex-1 flex flex-col justify-center">
            {mode === 'exam' && !showAnswerCheck ? (
              // Exam mode - input answer
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-telegram-text">
                  Ваш ответ:
                </h3>
                <textarea
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Введите ваш ответ..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-telegram-bg text-telegram-text resize-none"
                  rows={4}
                  autoFocus
                />
                <button
                  onClick={handleExamAnswer}
                  disabled={!userAnswer.trim()}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg font-medium disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                >
                  Проверить
                </button>
              </div>
            ) : (
              // Show answer
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-telegram-text mb-2">
                    Ответ:
                  </h3>
                  <p className="text-telegram-text leading-relaxed">
                    {card.back}
                  </p>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakText(card.back);
                    }}
                    className="mt-2 p-2 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>

                {showAnswerCheck && mode === 'exam' && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-telegram-text mb-2">
                      Ваш ответ:
                    </h4>
                    <p className="text-sm text-telegram-hint">
                      {userAnswer}
                    </p>
                  </div>
                )}

                {card.sourceFragment && (
                  <div className="text-xs text-telegram-hint bg-gray-50 dark:bg-gray-800 p-2 rounded">
                    <strong>Источник:</strong> {card.sourceFragment}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          {isFlipped && (
            <div className="mt-4">
              {mode === 'review' && (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleResponse('unknown')}
                    className="flex flex-col items-center justify-center p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <XCircle size={20} />
                    <span className="text-xs mt-1">Не знаю</span>
                  </button>
                  <button
                    onClick={() => handleResponse('difficult')}
                    className="flex flex-col items-center justify-center p-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                  >
                    <HelpCircle size={20} />
                    <span className="text-xs mt-1">Сложно</span>
                  </button>
                  <button
                    onClick={() => handleResponse('know')}
                    className="flex flex-col items-center justify-center p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle size={20} />
                    <span className="text-xs mt-1">Знаю</span>
                  </button>
                </div>
              )}

              {mode === 'exam' && showAnswerCheck && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleAnswerResult(false)}
                    className="flex items-center justify-center p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    <XCircle size={20} className="mr-2" />
                    Неправильно
                  </button>
                  <button
                    onClick={() => handleAnswerResult(true)}
                    className="flex items-center justify-center p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <CheckCircle size={20} className="mr-2" />
                    Правильно
                  </button>
                </div>
              )}

              {mode === 'repeat' && (
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {SM2_QUALITIES.map((quality) => (
                    <button
                      key={quality.value}
                      onClick={() => handleSM2Response(quality.value as 0 | 1 | 2 | 3 | 4 | 5)}
                      className={`flex items-center justify-center p-2 ${quality.color} text-white rounded transition-colors hover:opacity-90`}
                    >
                      <span className="mr-1">{quality.emoji}</span>
                      <span>{quality.value}: {quality.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Flip back button */}
          <button
            onClick={() => setIsFlipped(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
};