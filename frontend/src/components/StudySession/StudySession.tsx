import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReviewMode } from '@/components/StudyModes/ReviewMode';
import { ExamMode } from '@/components/StudyModes/ExamMode';
import { RepeatMode } from '@/components/StudyModes/RepeatMode';
import { FlashCard } from '@/types/flashcard';

interface StudySessionProps {
  cards: FlashCard[];
  onUpdateCard: (cardId: string, sm2Data: any) => void;
}

export const StudySession: React.FC<StudySessionProps> = ({ cards, onUpdateCard }) => {
  const { mode } = useParams<{ mode: string }>();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/');
  };

  const handleComplete = (results: any) => {
    console.log('Study session completed:', results);
    // Here you would typically save results to backend/local storage
    navigate('/');
  };

  switch (mode) {
    case 'review':
      return (
        <ReviewMode
          cards={cards}
          onComplete={handleComplete}
          onBack={handleBack}
        />
      );
    
    case 'exam':
      return (
        <ExamMode
          cards={cards}
          onComplete={handleComplete}
          onBack={handleBack}
        />
      );
    
    case 'repeat':
      return (
        <RepeatMode
          cards={cards}
          onComplete={handleComplete}
          onBack={handleBack}
          onUpdateCard={onUpdateCard}
        />
      );
    
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-telegram-text mb-2">
              Неизвестный режим изучения
            </h2>
            <button
              onClick={handleBack}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg"
            >
              Вернуться на главную
            </button>
          </div>
        </div>
      );
  }
};