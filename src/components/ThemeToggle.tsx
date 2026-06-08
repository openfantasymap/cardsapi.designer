import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';

/** Light/dark theme toggle. */
export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = (resolvedTheme ?? 'dark') === 'dark';
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 text-muted-foreground hover:text-foreground"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </Button>
  );
};
