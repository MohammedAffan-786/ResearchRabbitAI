import { useResearchStore } from '../store/useResearchStore';

export const useTheme = () => {
  const { theme, toggleTheme, setTheme } = useResearchStore();
  const isDark = theme === 'dark';

  return {
    theme,
    isDark,
    toggleTheme,
    setTheme,
  };
};
