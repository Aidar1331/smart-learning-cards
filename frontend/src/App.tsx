import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { Dashboard } from '@/components/Dashboard/Dashboard';
import { StudySession } from '@/components/StudySession/StudySession';
import { CreateCards } from '@/components/Common/CreateCards';
import { FlashCard as FlashCardType } from '@/types/flashcard';

// Mock data for development
const MOCK_CARDS: FlashCardType[] = [
  {
    id: '1',
    studySetId: 'set1',
    front: 'Что такое React?',
    back: 'JavaScript библиотека для создания пользовательских интерфейсов',
    sourceFragment: 'React — это библиотека JavaScript с открытым исходным кодом для разработки пользовательских интерфейсов.',
    confidence: 9,
    cardOrder: 0,
    createdAt: new Date().toISOString(),
    sm2Data: {
      easeFactor: 2.5,
      interval: 1,
      repetitions: 0,
      nextReview: Date.now(),
      lastReviewed: Date.now()
    }
  },
  {
    id: '2',
    studySetId: 'set1',
    front: 'Что такое useState?',
    back: 'React Hook для управления состоянием компонента',
    sourceFragment: 'useState — это хук, который позволяет добавить состояние в функциональные компоненты.',
    confidence: 8,
    cardOrder: 1,
    createdAt: new Date().toISOString(),
    sm2Data: {
      easeFactor: 2.3,
      interval: 3,
      repetitions: 1,
      nextReview: Date.now() - 86400000, // Yesterday
      lastReviewed: Date.now() - 86400000
    }
  },
  {
    id: '3',
    studySetId: 'set1',
    front: 'Что такое useEffect?',
    back: 'React Hook для выполнения побочных эффектов в функциональных компонентах',
    sourceFragment: 'useEffect позволяет выполнять побочные эффекты в функциональных компонентах.',
    confidence: 7,
    cardOrder: 2,
    createdAt: new Date().toISOString(),
    reviewHistory: [
      { timestamp: Date.now() - 86400000, response: 'difficult' }
    ]
  }
];

function App() {
  const [cards, setCards] = useState<FlashCardType[]>(MOCK_CARDS);
  const [showCreateCards, setShowCreateCards] = useState(false);
  const { user, isLoaded, colorScheme } = useTelegram();

  useEffect(() => {
    // Apply Telegram theme
    if (colorScheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [colorScheme]);

  const handleCardsCreated = (newCards: any[]) => {
    const formattedCards: FlashCardType[] = newCards.map((card, index) => ({
      id: `generated-${Date.now()}-${index}`,
      studySetId: 'generated-set',
      front: card.front,
      back: card.back,
      sourceFragment: card.source_fragment || '',
      confidence: card.confidence || 5,
      cardOrder: index,
      createdAt: new Date().toISOString()
    }));

    setCards(prev => [...prev, ...formattedCards]);
    setShowCreateCards(false);
  };

  const handleUpdateCard = (cardId: string, sm2Data: any) => {
    setCards(prev => prev.map(card => 
      card.id === cardId 
        ? { ...card, sm2Data }
        : card
    ));
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-telegram-hint">Загрузка приложения...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text">
      <Router>
        <AnimatePresence mode="wait">
          <Routes>
            <Route 
              path="/" 
              element={
                <Dashboard 
                  cards={cards}
                  user={user}
                  onCreateCards={() => setShowCreateCards(true)}
                />
              } 
            />
            <Route 
              path="/study/:mode" 
              element={
                <StudySession 
                  cards={cards}
                  onUpdateCard={handleUpdateCard}
                />
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>

        {/* Create Cards Modal */}
        <AnimatePresence>
          {showCreateCards && (
            <CreateCards
              onCardsCreated={handleCardsCreated}
              onClose={() => setShowCreateCards(false)}
            />
          )}
        </AnimatePresence>
      </Router>
    </div>
  );
}

export default App;