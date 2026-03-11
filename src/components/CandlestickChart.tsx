import { useMemo } from 'react';
import { formatChartAxisLabel, formatChartPrice, formatChartTooltipLabel } from '@/lib/chart';
import type { StockTimeSeriesPoint } from '@/lib/types';
import type { TimeRange } from '@/lib/types';

interface CandlestickChartProps {
  data: StockTimeSeriesPoint[];
  range: TimeRange;
  locale: 'ko' | 'en';
  height?: number;
  emptyLabel?: string;
}

export function CandlestickChart({
  data,
  range,
  locale,
  height = 300,
  emptyLabel = 'No data',
}: CandlestickChartProps) {
  const marginLeft = 55;
  const marginRight = 10;
  const marginTop = 10;
  const marginBottom = 30;

  const chart = useMemo(() => {
    if (!data.length) return null;

    const allHighs = data.map(d => d.high);
    const allLows = data.map(d => d.low);
    const minPrice = Math.min(...allLows);
    const maxPrice = Math.max(...allHighs);
    const pricePad = (maxPrice - minPrice) * 0.08 || 1;
    const yMin = minPrice - pricePad;
    const yMax = maxPrice + pricePad;

    const chartH = height - marginTop - marginBottom;

    const barWidth = Math.max(2, Math.min(12, (600 - marginLeft - marginRight) / data.length * 0.6));
    const step = (600 - marginLeft - marginRight) / data.length;

    const yScale = (v: number) => marginTop + chartH - ((v - yMin) / (yMax - yMin)) * chartH;

    // Y-axis ticks
    const tickCount = 5;
    const tickStep = (yMax - yMin) / (tickCount - 1);
    const yTicks = Array.from({ length: tickCount }, (_, i) => yMin + tickStep * i);

    // X-axis labels (show ~6 labels)
    const labelStep = Math.max(1, Math.floor(data.length / 6));

    const candles = data.map((d, i) => {
      const x = marginLeft + step * i + step / 2;
      const isUp = d.close >= d.open;
      const color = isUp ? 'hsl(152, 69%, 40%)' : 'hsl(0, 72%, 55%)';
      const bodyTop = yScale(Math.max(d.open, d.close));
      const bodyBottom = yScale(Math.min(d.open, d.close));
      const bodyH = Math.max(bodyBottom - bodyTop, 1);

      return (
        <g key={i}>
          <line
            x1={x} y1={yScale(d.high)} x2={x} y2={yScale(d.low)}
            stroke={color} strokeWidth={1}
          />
          <rect
            x={x - barWidth / 2}
            y={bodyTop}
            width={barWidth}
            height={bodyH}
            fill={isUp ? 'transparent' : color}
            stroke={color}
            strokeWidth={1}
            rx={0.5}
          />
          {/* Invisible wider rect for tooltip hover */}
          <rect
            x={x - step / 2}
            y={marginTop}
            width={step}
            height={chartH}
            fill="transparent"
            className="cursor-crosshair"
          >
            <title>{`${formatChartTooltipLabel(d.date, range, locale)}\nO: ${formatChartPrice(d.open)}  H: ${formatChartPrice(d.high)}\nL: ${formatChartPrice(d.low)}  C: ${formatChartPrice(d.close)}`}</title>
          </rect>
        </g>
      );
    });

    return (
      <>
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={`tick-${i}`}>
            <line
              x1={marginLeft} y1={yScale(tick)}
              x2={600 - marginRight} y2={yScale(tick)}
              stroke="hsl(var(--border))" strokeDasharray="3 3" strokeWidth={0.5}
            />
            <text
              x={marginLeft - 6} y={yScale(tick) + 3.5}
              textAnchor="end"
              fill="hsl(var(--muted-foreground))"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
            >
              {formatChartPrice(tick)}
            </text>
          </g>
        ))}
        {/* X labels */}
        {data.map((d, i) => {
          if (i % labelStep !== 0) return null;
          const x = marginLeft + step * i + step / 2;
          return (
            <text
              key={`x-${i}`}
              x={x}
              y={height - 8}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
              fontSize={10}
              fontFamily="JetBrains Mono, monospace"
            >
              {formatChartAxisLabel(d.date, range, locale)}
            </text>
          );
        })}
        {candles}
      </>
    );
  }, [data, height, locale, range]);

  if (!data.length) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 600 ${height}`}
      width="100%"
      height={height}
      className="overflow-visible"
      preserveAspectRatio="xMidYMid meet"
    >
      {chart}
    </svg>
  );
}
