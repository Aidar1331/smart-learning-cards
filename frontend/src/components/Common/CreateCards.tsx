import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Link, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

interface CreateCardsProps {
  onCardsCreated: (cards: any[]) => void;
  onClose: () => void;
}

type SourceType = 'text' | 'file' | 'url';

interface CreationState {
  isGenerating: boolean;
  progress: string;
  error: string | null;
  success: boolean;
}

export const CreateCards: React.FC<CreateCardsProps> = ({ onCardsCreated, onClose }) => {
  const [sourceType, setSourceType] = useState<SourceType>('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [cardCount, setCardCount] = useState(20);
  const [state, setState] = useState<CreationState>({
    isGenerating: false,
    progress: '',
    error: null,
    success: false
  });

  const { hapticFeedback, mainButton } = useTelegram();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(selectedFile.type)) {
        setState(prev => ({ ...prev, error: 'Поддерживаются только файлы TXT, PDF и DOCX' }));
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
        setState(prev => ({ ...prev, error: 'Размер файла не должен превышать 10MB' }));
        return;
      }
      setFile(selectedFile);
      setState(prev => ({ ...prev, error: null }));
    }
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        const result = e.target?.result;
        if (typeof result === 'string') {
          resolve(result);
        } else {
          reject(new Error('Failed to read file as text'));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.type === 'text/plain') {
        reader.readAsText(file);
      } else {
        // For PDF and DOCX, we'll need to send to backend for processing
        reader.readAsDataURL(file);
      }
    });
  };

  const generateCards = async () => {
    try {
      setState({ isGenerating: true, progress: 'Подготовка...', error: null, success: false });
      hapticFeedback.impact('medium');

      let contentText = '';

      // Extract content based on source type
      switch (sourceType) {
        case 'text':
          contentText = text;
          break;
        case 'file':
          if (!file) {
            throw new Error('Файл не выбран');
          }
          setState(prev => ({ ...prev, progress: 'Извлечение текста из файла...' }));
          contentText = await extractTextFromFile(file);
          break;
        case 'url':
          if (!url) {
            throw new Error('URL не указан');
          }
          setState(prev => ({ ...prev, progress: 'Загрузка содержимого по URL...' }));
          // This would need to be implemented in the backend
          throw new Error('URL processing not implemented yet');
      }

      if (contentText.trim().length < 10) {
        throw new Error('Содержимое слишком короткое для создания карточек');
      }

      setState(prev => ({ ...prev, progress: 'Анализ содержимого с помощью ИИ...' }));

      // Call the strict extraction API
      const response = await fetch('/api/strict-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: contentText,
          cardCount: cardCount
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Ошибка при создании карточек');
      }

      const result = await response.json();

      if (!result.success || !result.flashcards) {
        throw new Error(result.error || 'Не удалось создать карточки');
      }

      setState(prev => ({ ...prev, progress: 'Карточки успешно созданы!', success: true }));
      hapticFeedback.notification('success');

      setTimeout(() => {
        onCardsCreated(result.flashcards);
      }, 1000);

    } catch (error) {
      console.error('Card generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage, 
        isGenerating: false, 
        progress: '' 
      }));
      hapticFeedback.notification('error');
    }
  };

  const canGenerate = () => {
    switch (sourceType) {
      case 'text':
        return text.trim().length >= 10;
      case 'file':
        return file !== null;
      case 'url':
        return url.trim().length > 0;
      default:
        return false;
    }
  };

  const sourceOptions = [
    { type: 'text' as SourceType, label: 'Текст', icon: FileText, description: 'Вставьте текст для анализа' },
    { type: 'file' as SourceType, label: 'Файл', icon: Upload, description: 'Загрузите PDF, DOCX или TXT' },
    { type: 'url' as SourceType, label: 'Ссылка', icon: Link, description: 'Веб-страница или статья' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="bg-white dark:bg-telegram-secondary-bg rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
      >
        <h2 className="text-2xl font-bold text-telegram-text mb-6 text-center">
          Создание карточек
        </h2>

        {/* Source type selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-telegram-text mb-3">
            Источник контента:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {sourceOptions.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => {
                  setSourceType(type);
                  hapticFeedback.selection();
                }}
                className={`flex flex-col items-center p-3 rounded-lg border-2 transition-all ${
                  sourceType === type
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={24} className={sourceType === type ? 'text-blue-500' : 'text-gray-500'} />
                <span className={`text-sm mt-1 ${sourceType === type ? 'text-blue-500 font-medium' : 'text-gray-600'}`}>
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content input based on source type */}
        <div className="mb-6">
          <AnimatePresence mode="wait">
            {sourceType === 'text' && (
              <motion.div
                key="text"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Текст для изучения:
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Вставьте текст, из которого нужно создать карточки..."
                  className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-telegram-bg text-telegram-text resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={state.isGenerating}
                />
                <div className="text-xs text-telegram-hint mt-1">
                  Минимум 10 символов, рекомендуется от 500 символов
                </div>
              </motion.div>
            )}

            {sourceType === 'file' && (
              <motion.div
                key="file"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  Выберите файл:
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".txt,.pdf,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-input"
                    disabled={state.isGenerating}
                  />
                  <label
                    htmlFor="file-input"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    <Upload size={32} className="text-gray-400 mb-2" />
                    {file ? (
                      <div>
                        <div className="text-telegram-text font-medium">{file.name}</div>
                        <div className="text-xs text-telegram-hint">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-telegram-text">Нажмите для выбора файла</div>
                        <div className="text-xs text-telegram-hint">
                          Поддерживаются TXT, PDF, DOCX (до 10MB)
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </motion.div>
            )}

            {sourceType === 'url' && (
              <motion.div
                key="url"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <label className="block text-sm font-medium text-telegram-text mb-2">
                  URL адрес:
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-telegram-bg text-telegram-text focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={state.isGenerating}
                />
                <div className="text-xs text-telegram-hint mt-1">
                  Веб-страница или статья для анализа
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Card count selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-telegram-text mb-2">
            Количество карточек: {cardCount}
          </label>
          <input
            type="range"
            min="5"
            max="100"
            step="5"
            value={cardCount}
            onChange={(e) => setCardCount(Number(e.target.value))}
            className="w-full accent-blue-500"
            disabled={state.isGenerating}
          />
          <div className="flex justify-between text-xs text-telegram-hint mt-1">
            <span>5</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        {/* Error display */}
        {state.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center"
          >
            <XCircle size={20} className="text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700 dark:text-red-300 text-sm">{state.error}</span>
          </motion.div>
        )}

        {/* Success display */}
        {state.success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center"
          >
            <CheckCircle size={20} className="text-green-500 mr-2 flex-shrink-0" />
            <span className="text-green-700 dark:text-green-300 text-sm">{state.progress}</span>
          </motion.div>
        )}

        {/* Progress display */}
        {state.isGenerating && !state.success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center"
          >
            <Loader2 size={20} className="text-blue-500 mr-2 flex-shrink-0 animate-spin" />
            <span className="text-blue-700 dark:text-blue-300 text-sm">{state.progress}</span>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={state.isGenerating}
            className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Отмена
          </button>
          <button
            onClick={generateCards}
            disabled={!canGenerate() || state.isGenerating}
            className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {state.isGenerating ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              `Создать ${cardCount} карточек`
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};