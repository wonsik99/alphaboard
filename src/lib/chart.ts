import type { StockTimeSeriesPoint, TimeRange } from '@/lib/types';

type Locale = 'ko' | 'en';

function splitRawDate(rawDate: string) {
  const normalized = rawDate.replace('T', ' ');
  const [datePart = '', timePart = ''] = normalized.split(' ');
  const [year = '', month = '', day = ''] = datePart.split('-');

  return {
    year,
    month,
    day,
    time: timePart.slice(0, 5),
  };
}

export function getChartDirection(points: StockTimeSeriesPoint[] | undefined, fallbackChange = 0) {
  if (points && points.length >= 2) {
    return points[points.length - 1].close >= points[0].close;
  }

  return fallbackChange >= 0;
}

export function formatChartAxisLabel(rawDate: string, range: TimeRange, locale: Locale) {
  const { month, day, time } = splitRawDate(rawDate);

  if (range === '1D' || range === '1W') {
    return time || (locale === 'ko' ? `${month}.${day}` : `${month}/${day}`);
  }

  return locale === 'ko' ? `${month}.${day}` : `${month}/${day}`;
}

export function formatChartTooltipLabel(rawDate: string, range: TimeRange, locale: Locale) {
  const { year, month, day, time } = splitRawDate(rawDate);
  const dateLabel = locale === 'ko' ? `${year}.${month}.${day}` : `${year}-${month}-${day}`;

  if ((range === '1D' || range === '1W') && time) {
    return `${dateLabel} ${time}`;
  }

  return dateLabel;
}

export function formatChartPrice(value: number) {
  const abs = Math.abs(value);

  if (abs < 1) return `$${value.toFixed(4)}`;
  if (abs < 10) return `$${value.toFixed(2)}`;
  if (abs < 1000) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(0)}`;
}
