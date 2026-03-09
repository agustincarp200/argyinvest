import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';

const lightTheme = {
  bg: '#F5F5F5',
  card: '#FFFFFF',
  card2: '#F0F0F0',
  border: '#E0E0E0',
  white: '#0A0A0A',
  gray: '#999999',
  lgray: '#555555',
  green: '#00A854',
  greenDim: '#00A85418',
  red: '#E53935',
  redDim: '#E5393518',
  gold: '#D4A000',
  blue: '#1976D2',
  purple: '#7B1FA2',
  cyan: '#0097A7',
};

const darkTheme = {
  bg: '#0A0A0A',
  card: '#141414',
  card2: '#1A1A1A',
  border: '#222222',
  white: '#F5F5F5',
  gray: '#555555',
  lgray: '#888888',
  green: '#00D26A',
  greenDim: '#00D26A22',
  red: '#FF4D4D',
  redDim: '#FF4D4D22',
  gold: '#F5C842',
  blue: '#4D9EFF',
  purple: '#A855F7',
  cyan: '#22D3EE',
};

type Theme = typeof lightTheme;

const ThemeContext = createContext<{
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
}>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  const [cargado, setCargado] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('tema').then(val => {
      console.log('Tema guardado:', val);
      if (val === 'dark') setIsDark(true);
      setCargado(true);
    });
  }, []);

  async function toggleTheme() {
    const nuevoTema = !isDark;
    setIsDark(nuevoTema);
    await AsyncStorage.setItem('tema', nuevoTema ? 'dark' : 'light');
    console.log('Tema guardado como:', nuevoTema ? 'dark' : 'light');
  }

  if (!cargado) return null;

  const theme = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);