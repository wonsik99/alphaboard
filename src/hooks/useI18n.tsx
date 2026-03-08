import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Locale = 'ko' | 'en';

const translations = {
  ko: {
    // Header
    subtitle: 'US Market Dashboard · 실시간 데이터',
    // Index page
    marketIndices: '주요 지수',
    // StockChart
    close: '종가',
    noData: '데이터를 불러올 수 없습니다',
    // Watchlist
    watchlist: '관심 종목',
    addStock: '종목 추가 (예: NVDA)',
    emptyWatchlist: '관심 종목을 추가해보세요',
    // NewsFeed
    marketNews: '시장 뉴스',
    noNews: '뉴스를 불러올 수 없습니다',
    bullish: '긍정',
    bearish: '부정',
    neutral: '중립',
    // Search
    searchPlaceholder: '종목 검색 (예: AAPL, Tesla)',
    noResults: '검색 결과가 없습니다',
    // StockDetail
    inWatchlist: '관심 종목',
    add: '추가',
    open: '시가',
    high: '고가',
    low: '저가',
    prevClose: '전일 종가',
    volume: '거래량',
    relatedNews: '관련 뉴스',
    noChartData: '데이터를 불러올 수 없습니다',
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
