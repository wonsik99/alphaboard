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
    marketNews: '관심종목 뉴스',
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
    noChartData: '차트 데이터가 없습니다',
    chartLoadError: '차트를 불러오지 못했어요. 잠시 후 다시 시도해주세요.',
    retry: '다시 시도',
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
    chartLine: '라인',
    chartCandle: '캔들',
    // Portfolio
    portfolio: '포트폴리오',
    dashboard: '대시보드',
    addHolding: '종목 추가',
    editHolding: '수정',
    deleteHolding: '삭제',
    purchasePrice: '매입가',
    quantity: '수량',
    purchaseDate: '매입일',
    currentPrice: '현재가',
    gainLoss: '손익',
    gainLossPercent: '수익률',
    totalValue: '총 평가금액',
    totalInvested: '총 투자금액',
    totalGain: '총 손익',
    emptyPortfolio: '보유 종목을 추가해보세요',
    confirmDelete: '정말 삭제하시겠습니까?',
    cancel: '취소',
    save: '저장',
    notes: '메모',
    symbol: '종목',
    shares: '주',
    dayChange: '일일 변동',
    allocation: '비중',
    marketValue: '평가금액',
    holdingsSummary: '보유 종목',
    sortByGain: '수익률순',
    sortByValue: '평가금액순',
    sortByName: '이름순',
    portfolioEmpty1: '아직 보유 종목이 없습니다',
    portfolioEmpty2: '종목을 추가하여 포트폴리오를 관리해보세요',
    // AI Analysis
    aiAnalysis: 'AI 뉴스 분석',
    sentimentTrend: '감성 추이',
    sentimentScore: '감성 점수',
    refreshAnalysis: '분석 갱신',
    analyzing: '분석 중...',
    noSentimentData: '감성 분석 데이터가 없습니다',
    veryBearish: '매우 부정',
    veryBullish: '매우 긍정',
  },
  en: {
    subtitle: 'US Market Dashboard · Real-time Data',
    marketIndices: 'Market Indices',
    close: 'Close',
    noData: 'Unable to load data',
    watchlist: 'Watchlist',
    addStock: 'Add stock (e.g. NVDA)',
    emptyWatchlist: 'Add stocks to your watchlist',
    marketNews: 'Watchlist News',
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
    noChartData: 'No chart data available',
    chartLoadError: "Couldn't load the chart. Please try again.",
    retry: 'Retry',
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
    chartLine: 'Line',
    chartCandle: 'Candle',
    // Portfolio
    portfolio: 'Portfolio',
    dashboard: 'Dashboard',
    addHolding: 'Add Holding',
    editHolding: 'Edit',
    deleteHolding: 'Delete',
    purchasePrice: 'Purchase Price',
    quantity: 'Quantity',
    purchaseDate: 'Purchase Date',
    currentPrice: 'Current Price',
    gainLoss: 'Gain/Loss',
    gainLossPercent: 'Return',
    totalValue: 'Total Value',
    totalInvested: 'Total Invested',
    totalGain: 'Total Gain/Loss',
    emptyPortfolio: 'Add holdings to your portfolio',
    confirmDelete: 'Are you sure you want to delete?',
    cancel: 'Cancel',
    save: 'Save',
    notes: 'Notes',
    symbol: 'Symbol',
    shares: 'shares',
    dayChange: 'Day Change',
    allocation: 'Allocation',
    marketValue: 'Market Value',
    holdingsSummary: 'Holdings',
    sortByGain: 'By Return',
    sortByValue: 'By Value',
    sortByName: 'By Name',
    portfolioEmpty1: 'No holdings yet',
    portfolioEmpty2: 'Add stocks to start managing your portfolio',
    // AI Analysis
    aiAnalysis: 'AI News Analysis',
    sentimentTrend: 'Sentiment Trend',
    sentimentScore: 'Sentiment Score',
    refreshAnalysis: 'Refresh Analysis',
    analyzing: 'Analyzing...',
    noSentimentData: 'No sentiment data available',
    veryBearish: 'Very Bearish',
    veryBullish: 'Very Bullish',
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
    return (saved === 'en' || saved === 'ko') ? saved : 'en';
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
