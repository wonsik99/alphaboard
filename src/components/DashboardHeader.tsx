import { BarChart3, Globe, LogIn, LogOut, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useNavigate } from 'react-router-dom';

export function DashboardHeader() {
  const { locale, setLocale, t } = useI18n();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  return (
    <header className="glass-strong sticky top-0 z-50 border-b-0">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">StockPulse</h1>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground hidden sm:block font-medium mr-1">
            {t('subtitle')}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full glass-subtle hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 text-xs gap-1.5 rounded-full glass-subtle hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all"
            onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
          >
            <Globe className="h-3.5 w-3.5" />
            {locale === 'ko' ? 'EN' : '한국어'}
          </Button>
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs gap-1.5 rounded-full glass-subtle hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all"
              onClick={() => signOut()}
            >
              <LogOut className="h-3.5 w-3.5" />
              {t('logout')}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs gap-1.5 rounded-full glass-subtle hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-all"
              onClick={() => navigate('/auth')}
            >
              <LogIn className="h-3.5 w-3.5" />
              {t('login')}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
