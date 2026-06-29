import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type VisualTheme = 'glass' | 'brutalist';

interface ThemeContextType {
  visualTheme: VisualTheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  visualTheme: 'glass',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [visualTheme, setVisualTheme] = useState<VisualTheme>('glass');

  useEffect(() => {
    // Load visual theme from AsyncStorage
    AsyncStorage.getItem('padeltwin_visual_theme').then((savedTheme) => {
      if (savedTheme === 'glass' || savedTheme === 'brutalist') {
        setVisualTheme(savedTheme);
      }
    });
  }, []);

  const toggleTheme = () => {
    const nextTheme = visualTheme === 'glass' ? 'brutalist' : 'glass';
    setVisualTheme(nextTheme);
    AsyncStorage.setItem('padeltwin_visual_theme', nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ visualTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useVisualTheme = () => useContext(ThemeContext);
