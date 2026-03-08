import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Locale = 'ko' | 'en';

const translations = {
  ko: {
    subtitle: 'US Market Dashboard · 실시간 데이터',
    marketIndices: '주요 지수',
    close: '종가',
    noData: '데이터를 불러올 수 없습니다',
    watchlist: '관심 종목',
    addStock: '종목 추가 (예: NVDA)',
    emptyWatchlist: '관심 종목을 추가해보세요',
    marketNews: '시장 뉴스',
    noNews: '뉴스를 불러올 수 없습니다',
    bullish: '긍정',
    bearish: '부정',
    neutral: '중립',
    searchPlaceholder: '종목 검색 (예: AAPL, Tesla)',
    noResults: '검색 결과가 없습니다',
    inWatchlist: '관심 종목',
    add: '추가',
    open: '시가',
    high: '고가',
    low: '저가',
    prevClose: '전일 종가',
    volume: '거래량',
    relatedNews: '관련 뉴스',
    noChartData: '데이터를 불러올 수 없습니다',
    // Auth
    login: '로그인',
    signup: '회원가입',
    logout: '로그아웃',
    email: '이메일',
    password: '비밀번호',
    displayName: '닉네임',
    loginSubtitle: '계정에 로그인하세요',
    signupSubtitle: '새 계정을 만드세요',
    signupSuccess: '가입 완료!',
    checkEmail: '이메일을 확인하여 인증해주세요',
    noAccount: '계정이 없으신가요? 회원가입',
    hasAccount: '이미 계정이 있으신가요? 로그인',
    forgotPassword: '비밀번호를 잊으셨나요?',
    resetPassword: '비밀번호 재설정',
    resetDescription: '가입한 이메일을 입력하면 재설정 링크를 보내드립니다',
    resetEmailSent: '이메일을 확인해주세요. 비밀번호 재설정 링크를 보냈습니다.',
    backToLogin: '로그인으로 돌아가기',
    sendResetLink: '재설정 링크 보내기',
    setNewPassword: '새 비밀번호 설정',
    newPassword: '새 비밀번호',
    confirmPassword: '비밀번호 확인',
    updatePassword: '비밀번호 변경',
    passwordMismatch: '비밀번호가 일치하지 않습니다',
    passwordUpdated: '비밀번호가 변경되었습니다',
    invalidResetLink: '유효하지 않은 링크입니다',
  },
  en: {
    subtitle: 'US Market Dashboard · Real-time Data',
    marketIndices: 'Market Indices',
    close: 'Close',
    noData: 'Unable to load data',
    watchlist: 'Watchlist',
    addStock: 'Add stock (e.g. NVDA)',
    emptyWatchlist: 'Add stocks to your watchlist',
    marketNews: 'Market News',
    noNews: 'Unable to load news',
    bullish: 'Bullish',
    bearish: 'Bearish',
    neutral: 'Neutral',
    searchPlaceholder: 'Search stocks (e.g. AAPL, Tesla)',
    noResults: 'No results found',
    inWatchlist: 'Watching',
    add: 'Add',
    open: 'Open',
    high: 'High',
    low: 'Low',
    prevClose: 'Prev Close',
    volume: 'Volume',
    relatedNews: 'Related News',
    noChartData: 'Unable to load data',
    // Auth
    login: 'Log in',
    signup: 'Sign up',
    logout: 'Log out',
    email: 'Email',
    password: 'Password',
    displayName: 'Display name',
    loginSubtitle: 'Sign in to your account',
    signupSubtitle: 'Create a new account',
    signupSuccess: 'Sign up complete!',
    checkEmail: 'Please check your email to verify your account',
    noAccount: "Don't have an account? Sign up",
    hasAccount: 'Already have an account? Log in',
    forgotPassword: 'Forgot password?',
    resetPassword: 'Reset Password',
    resetDescription: 'Enter your email and we will send you a reset link',
    resetEmailSent: 'Check your email. We sent you a password reset link.',
    backToLogin: 'Back to login',
    sendResetLink: 'Send reset link',
    setNewPassword: 'Set New Password',
    newPassword: 'New password',
    confirmPassword: 'Confirm password',
    updatePassword: 'Update password',
    passwordMismatch: 'Passwords do not match',
    passwordUpdated: 'Password updated successfully',
    invalidResetLink: 'Invalid or expired reset link',
  },
} as const;

type TranslationKey = keyof typeof translations.ko;

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem('locale');
    return (saved === 'en' || saved === 'ko') ? saved : 'ko';
  });

  const handleSetLocale = useCallback((l: Locale) => {
    setLocale(l);
    localStorage.setItem('locale', l);
  }, []);

  const t = useCallback((key: TranslationKey) => {
    return translations[locale][key] || key;
  }, [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale: handleSetLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
