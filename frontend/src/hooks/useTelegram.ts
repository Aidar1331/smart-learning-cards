import { useEffect, useState } from 'react';
import { TelegramWebApp, TelegramUser } from '@/types/telegram';

interface TelegramState {
  webApp: TelegramWebApp | null;
  user: TelegramUser | null;
  isLoaded: boolean;
  platform: string;
  colorScheme: 'light' | 'dark';
}

export const useTelegram = () => {
  const [state, setState] = useState<TelegramState>({
    webApp: null,
    user: null,
    isLoaded: false,
    platform: 'unknown',
    colorScheme: 'light'
  });

  useEffect(() => {
    // Check if running in Telegram WebApp
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      // Initialize Telegram WebApp
      tg.ready();
      tg.expand();
      
      // Apply Telegram theme
      if (tg.colorScheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      
      setState({
        webApp: tg,
        user: tg.initDataUnsafe.user || null,
        isLoaded: true,
        platform: tg.platform,
        colorScheme: tg.colorScheme
      });

      // Listen for theme changes
      const handleThemeChanged = () => {
        if (tg.colorScheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        setState(prev => ({
          ...prev,
          colorScheme: tg.colorScheme
        }));
      };

      tg.onEvent('themeChanged', handleThemeChanged);

      // Cleanup
      return () => {
        tg.offEvent('themeChanged', handleThemeChanged);
      };
    } else {
      // Development mode - simulate Telegram environment
      setState({
        webApp: null,
        user: {
          id: 12345,
          first_name: 'Dev',
          last_name: 'User',
          username: 'devuser',
          language_code: 'ru',
          is_bot: false
        },
        isLoaded: true,
        platform: 'web',
        colorScheme: 'light'
      });
    }
  }, []);

  const showAlert = (message: string) => {
    if (state.webApp) {
      // Use Telegram's native alert
      state.webApp.showAlert?.(message);
    } else {
      // Fallback to browser alert
      alert(message);
    }
  };

  const showConfirm = (message: string, callback: (confirmed: boolean) => void) => {
    if (state.webApp) {
      state.webApp.showConfirm?.(message, callback);
    } else {
      callback(confirm(message));
    }
  };

  const sendData = (data: any) => {
    if (state.webApp) {
      state.webApp.sendData(JSON.stringify(data));
    } else {
      console.log('Telegram data would be sent:', data);
    }
  };

  const hapticFeedback = {
    impact: (style: 'light' | 'medium' | 'heavy' = 'medium') => {
      state.webApp?.HapticFeedback?.impactOccurred(style);
    },
    notification: (type: 'error' | 'success' | 'warning') => {
      state.webApp?.HapticFeedback?.notificationOccurred(type);
    },
    selection: () => {
      state.webApp?.HapticFeedback?.selectionChanged();
    }
  };

  const mainButton = {
    setText: (text: string) => {
      state.webApp?.MainButton?.setText(text);
    },
    show: () => {
      state.webApp?.MainButton?.show();
    },
    hide: () => {
      state.webApp?.MainButton?.hide();
    },
    enable: () => {
      state.webApp?.MainButton?.enable();
    },
    disable: () => {
      state.webApp?.MainButton?.disable();
    },
    onClick: (callback: () => void) => {
      state.webApp?.MainButton?.onClick(callback);
    },
    showProgress: () => {
      state.webApp?.MainButton?.showProgress();
    },
    hideProgress: () => {
      state.webApp?.MainButton?.hideProgress();
    }
  };

  const backButton = {
    show: () => {
      state.webApp?.BackButton?.show();
    },
    hide: () => {
      state.webApp?.BackButton?.hide();
    },
    onClick: (callback: () => void) => {
      state.webApp?.BackButton?.onClick(callback);
    }
  };

  const close = () => {
    if (state.webApp) {
      state.webApp.close();
    } else {
      window.close();
    }
  };

  return {
    ...state,
    showAlert,
    showConfirm,
    sendData,
    hapticFeedback,
    mainButton,
    backButton,
    close,
    isTelegramEnv: !!state.webApp
  };
};