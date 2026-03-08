import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import type { StockTimeSeriesPoint } from '@/lib/types';
import { useI18n } from '@/hooks/useI18n';

interface CandlestickChartProps {
  data: StockTimeSeriesPoint[];
  height?: number;
}

// Custom candlestick shape
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;

  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? 'hsl(152, 69%, 40%)' : 'hsl(0, 72%, 55%)';

  // Chart area dimensions
  const yScale = props.yAxis;
  if (!yScale) return null;

  const yHigh = yScale.scale(high);
  const yLow = yScale.scale(low);
  const yOpen = yScale.scale(open);
  const yClose = yScale.scale(close);

  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(Math.abs(yOpen - yClose), 1);
  const wickX = x + width / 2;

  return (
    <g>
      {/* Upper wick */}
      <line x1={wickX} y1={yHigh} x2={wickX} y2={bodyTop} stroke={color} strokeWidth={1} />
      {/* Lower wick */}
      <line x1={wickX} y1={bodyTop + bodyHeight} x2={wickX} y2={yLow} stroke={color} strokeWidth={1} />
      {/* Body */}
      <rect
        x={x + 1}
        y={bodyTop}
        width={Math.max(width - 2, 2)}
        height={bodyHeight}
        fill={isUp ? color : color}
        stroke={color}
        strokeWidth={1}
        fillOpacity={isUp ? 0.3 : 0.8}
        rx={1}
      />
    </g>
  );
};

export function CandlestickChart({ data, height = 300 }: CandlestickChartProps) {
  const { t } = useI18n();

  // We need a dummy dataKey for Bar — we use 'high' but render custom shape
  const allValues = data.flatMap(d => [d.high, d.low]);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const padding = (maxVal - minVal) * 0.05;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[minVal - padding, maxVal + padding]}
          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `$${v}`}
        />
        <Tooltip
          contentStyle={{
            background: 'hsl(var(--glass-bg))',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid hsl(var(--glass-border))',
            borderRadius: '16px',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono',
            boxShadow: 'var(--glass-shadow)',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.[0]) return null;
            const d = payload[0].payload as StockTimeSeriesPoint;
            const isUp = d.close >= d.open;
            return (
              <div style={{
                background: 'hsl(var(--glass-bg))',
                backdropFilter: 'blur(24px)',
                border: '1px solid hsl(var(--glass-border))',
                borderRadius: '16px',
                padding: '10px 14px',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono',
                boxShadow: 'var(--glass-shadow)',
              }}>
                <p style={{ color: 'hsl(var(--foreground))', marginBottom: 6, fontWeight: 500 }}>{label}</p>
                <p style={{ color: 'hsl(var(--muted-foreground))' }}>O: ${d.open.toFixed(2)}</p>
                <p style={{ color: 'hsl(var(--muted-foreground))' }}>H: ${d.high.toFixed(2)}</p>
                <p style={{ color: 'hsl(var(--muted-foreground))' }}>L: ${d.low.toFixed(2)}</p>
                <p style={{ color: isUp ? 'hsl(152, 69%, 40%)' : 'hsl(0, 72%, 55%)', fontWeight: 600 }}>C: ${d.close.toFixed(2)}</p>
              </div>
            );
          }}
        />
        <Bar
          dataKey="high"
          shape={<CandlestickShape yAxis={undefined} />}
          isAnimationActive={false}
        >
          {data.map((entry, index) => (
            <Cell key={index} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
}
