import { BarChart3, Globe, LogIn, LogOut, Sun, Moon, Briefcase, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function DashboardHeader() {
  const { locale, setLocale, t } = useI18n();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="glass-strong sticky top-0 z-50 border-b-0">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 group"
          >
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/60 flex items-center justify-center shadow-lg shadow-primary/25 group-hover:shadow-primary/40 group-hover:scale-105 transition-all duration-200">
              <BarChart3 className="h-[18px] w-[18px] text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight leading-none">
              Alpha<span className="text-primary">Board</span>
            </span>
          </button>
          <nav className="hidden sm:flex items-center gap-1 ml-2">
            {[
              { path: '/', icon: LayoutDashboard, label: t('dashboard') },
              { path: '/portfolio', icon: Briefcase, label: t('portfolio') },
            ].map(({ path, icon: Icon, label }) => (
              <Button
                key={path}
                variant="ghost"
                size="sm"
                className={cn(
                  'h-8 px-3 text-xs gap-1.5 rounded-full transition-all font-medium',
                  location.pathname === path
                    ? 'bg-primary/10 text-primary hover:bg-primary/15'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                onClick={() => navigate(path)}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Button>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] text-muted-foreground hidden sm:block font-medium mr-2 tracking-wide uppercase">
            {t('subtitle')}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun className="h-[14px] w-[14px]" /> : <Moon className="h-[14px] w-[14px]" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2.5 text-xs gap-1 rounded-full text-muted-foreground hover:text-foreground transition-colors font-medium"
            onClick={() => setLocale(locale === 'ko' ? 'en' : 'ko')}
          >
            <Globe className="h-[14px] w-[14px]" />
            {locale === 'ko' ? 'EN' : 'KO'}
          </Button>
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2.5 text-xs gap-1 rounded-full text-muted-foreground hover:text-foreground transition-colors font-medium"
              onClick={() => signOut()}
            >
              <LogOut className="h-[14px] w-[14px]" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-8 px-3.5 text-xs gap-1.5 rounded-full font-semibold shadow-md shadow-primary/20"
              onClick={() => navigate('/auth')}
            >
              <LogIn className="h-[14px] w-[14px]" />
              {t('login')}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
