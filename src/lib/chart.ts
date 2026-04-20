import type { StockTimeSeriesPoint, TimeRange } from '@/lib/types';

type Locale = 'ko' | 'en';

// Regular US market open in NY time. The first intraday bar of each trading
// day arrives at this timestamp, which we use to switch the 1W axis label
// from a time to a date so the day boundary is visible.
const MARKET_OPEN_TIME = '09:30';

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

function formatMonthDay(month: string, day: string, locale: Locale) {
  return locale === 'ko' ? `${month}.${day}` : `${month}/${day}`;
}

export function getChartDirection(points: StockTimeSeriesPoint[] | undefined, fallbackChange = 0) {
  if (points && points.length >= 2) {
    // Ignore padded (null close) bars when judging chart direction, otherwise
    // a timeline padded with future empty slots would always report neutral.
    const withValues = points.filter((p): p is StockTimeSeriesPoint & { close: number } => p.close != null);
    if (withValues.length >= 2) {
      return withValues[withValues.length - 1].close >= withValues[0].close;
    }
  }

  return fallbackChange >= 0;
}

export function formatChartAxisLabel(rawDate: string, range: TimeRange, locale: Locale) {
  const { year, month, day, time } = splitRawDate(rawDate);

  if (range === '1D') {
    // Single trading day — time is enough.
    return time || formatMonthDay(month, day, locale);
  }

  if (range === '1W') {
    // Intraday across 5 days. Show the date at the first bar of each day so
    // the viewer can tell days apart instead of seeing "09:30, 10:30, ..."
    // repeat five times with no day marker.
    if (!time || time === MARKET_OPEN_TIME) {
      return formatMonthDay(month, day, locale);
    }
    return time;
  }

  if (range === '1Y') {
    // Weekly bars across a year — compact month/year is the cleanest label.
    const shortYear = year.slice(2);
    return locale === 'ko' ? `${shortYear}.${month}` : `${month}/${shortYear}`;
  }

  // 1M, 3M
  return formatMonthDay(month, day, locale);
}

export function formatChartTooltipLabel(rawDate: string, range: TimeRange, locale: Locale) {
  const { year, month, day, time } = splitRawDate(rawDate);
  const dateLabel = locale === 'ko' ? `${year}.${month}.${day}` : `${year}-${month}-${day}`;

  if ((range === '1D' || range === '1W') && time) {
    return `${dateLabel} ${time}`;
  }

  return dateLabel;
}

export function formatChartPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);

  if (abs < 1) return `$${value.toFixed(4)}`;
  if (abs < 1000) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(0)}`;
}

/**
 * Choose explicit X-axis tick values so each range renders day/week boundaries
 * reliably regardless of how many bars the data source returns.
 *
 * Returning `undefined` lets Recharts fall back to its automatic tick layout,
 * which is already fine for daily/weekly ranges.
 */
export function buildChartTicks(
  points: StockTimeSeriesPoint[] | undefined,
  range: TimeRange,
): string[] | undefined {
  if (!points || points.length === 0) return undefined;

  if (range === '1W') {
    // One tick per trading day: pick the first bar of each date.
    const ticks: string[] = [];
    let lastDay = '';
    for (const p of points) {
      const day = p.date.slice(0, 10);
      if (day !== lastDay) {
        ticks.push(p.date);
        lastDay = day;
      }
    }
    return ticks;
  }

  if (range === '1D') {
    // Half-hour grid across the regular US trading day (09:30 - 16:00 ET).
    const lastDate = points[points.length - 1].date.slice(0, 10);
    if (!lastDate) return undefined;
    const ticks: string[] = [];
    for (const slot of enumerateTradingDaySlots(lastDate, 30)) {
      ticks.push(`${slot}:00`);
    }
    return ticks;
  }

  return undefined;
}

const MARKET_OPEN_MINUTES = 9 * 60 + 30; // 09:30 ET
const MARKET_CLOSE_MINUTES = 16 * 60; // 16:00 ET
const INTRADAY_BUCKET_MINUTES = 5; // Yahoo 1D interval

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function minutesToTimeLabel(minutes: number) {
  return `${pad2(Math.floor(minutes / 60))}:${pad2(minutes % 60)}`;
}

function* enumerateTradingDaySlots(datePart: string, stepMinutes: number) {
  for (let m = MARKET_OPEN_MINUTES; m <= MARKET_CLOSE_MINUTES; m += stepMinutes) {
    yield `${datePart} ${minutesToTimeLabel(m)}`;
  }
}

function bucketKey(rawDate: string): string | null {
  const [datePart, timePart] = rawDate.split(' ');
  if (!datePart || !timePart) return null;
  const [hh = '', mm = ''] = timePart.split(':');
  const total = Number(hh) * 60 + Number(mm);
  if (!Number.isFinite(total)) return null;
  const bucket = Math.floor(total / INTRADAY_BUCKET_MINUTES) * INTRADAY_BUCKET_MINUTES;
  return `${datePart} ${minutesToTimeLabel(bucket)}`;
}

function maxOrNull(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.max(a, b);
}

function minOrNull(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

/**
 * Combine two bars that fell into the same 5-min bucket. This happens when
 * the Edge Function appends a live synthetic bar a few seconds into a bucket
 * while Yahoo's snapshot already includes a real bar at the bucket boundary.
 * We preserve the earliest `open`, the bucket-wide high/low, and the most
 * recent `close` so the last candle reflects the live price without losing
 * the real OHLC envelope.
 */
function mergeBucketBars(a: StockTimeSeriesPoint, b: StockTimeSeriesPoint): StockTimeSeriesPoint {
  const newer = a.date >= b.date ? a : b;
  const older = a.date >= b.date ? b : a;
  return {
    date: newer.date,
    open: older.open ?? newer.open,
    high: maxOrNull(a.high, b.high),
    low: minOrNull(a.low, b.low),
    close: newer.close ?? older.close,
    volume: Math.max(a.volume ?? 0, b.volume ?? 0),
  };
}

/**
 * Build a full regular-trading-day timeline (09:30 - 16:00 ET) in 5-min buckets
 * and merge real bars into it. Any slot without data becomes a bar with null
 * OHLC, which Recharts renders as empty space. This gives the 1D chart a
 * stable, time-accurate X-axis instead of compressing partial-day data to
 * fill the full width.
 *
 * Returns the input unchanged for non-intraday ranges or when data is empty.
 */
export function padIntradayTimeline(
  points: StockTimeSeriesPoint[] | undefined,
  range: TimeRange,
): StockTimeSeriesPoint[] | undefined {
  if (!points || points.length === 0) return points;
  if (range !== '1D') return points;

  const lastDate = points[points.length - 1].date.slice(0, 10);
  if (!lastDate) return points;

  // Group real bars by their 5-min bucket, keeping original timestamps so
  // `mergeBucketBars` can tell which side is newer. When a Yahoo bar and the
  // synthetic live-quote bar share a bucket, the merge preserves the real
  // OHLC envelope and takes the latest close price.
  const byBucket = new Map<string, StockTimeSeriesPoint>();
  for (const p of points) {
    const key = bucketKey(p.date);
    if (!key) continue;
    const existing = byBucket.get(key);
    byBucket.set(key, existing ? mergeBucketBars(existing, p) : p);
  }

  const timeline: StockTimeSeriesPoint[] = [];
  for (const slot of enumerateTradingDaySlots(lastDate, INTRADAY_BUCKET_MINUTES)) {
    const real = byBucket.get(slot);
    if (real) {
      // Normalize to the bucket boundary so every visible bar sits on the
      // 5-min grid. This keeps Recharts' category axis evenly spaced.
      timeline.push({ ...real, date: `${slot}:00` });
    } else {
      timeline.push({
        date: `${slot}:00`,
        open: null,
        high: null,
        low: null,
        close: null,
        volume: 0,
      });
    }
  }
  return timeline;
}
