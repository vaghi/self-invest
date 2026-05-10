import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface SnapshotPoint {
  snapshotAt: string;
  totalValue: string;
}

interface PnLChartProps {
  data: SnapshotPoint[];
}

interface ChartDatum {
  date: string;
  label: string;
  value: number;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-100">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(payload[0].value ?? 0)}
      </p>
    </div>
  );
}

export function PnLChart({ data }: PnLChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl bg-surface-800 border border-surface-700 p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Equity Curve</h3>
        <p className="text-sm text-gray-400 text-center py-16">
          No snapshot data available
        </p>
      </div>
    );
  }

  const chartData: ChartDatum[] = data.map((point) => ({
    date: point.snapshotAt,
    label: format(parseISO(point.snapshotAt), 'MMM d, h:mm a'),
    value: parseFloat(point.totalValue),
  }));

  const values = chartData.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const padding = (max - min) * 0.1 || max * 0.05;

  const isUptrend = chartData.length >= 2 && chartData[chartData.length - 1].value >= chartData[0].value;
  const strokeColor = isUptrend ? '#22c55e' : '#ef4444';
  const fillId = isUptrend ? 'fillGreen' : 'fillRed';

  // Show only unique date labels to avoid repetition on X-axis
  const seenDates = new Set<string>();
  const deduplicatedTicks = chartData.map((d) => {
    const dayLabel = format(parseISO(d.date), 'MMM d');
    if (seenDates.has(dayLabel)) return '';
    seenDates.add(dayLabel);
    return dayLabel;
  });

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Equity Curve</h3>

      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="fillGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="fillRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            dy={8}
            tickFormatter={(_value, index) => deduplicatedTicks[index]}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={[min - padding, max + padding]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={(v: number) =>
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                notation: 'compact',
              }).format(v)
            }
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#475569', strokeDasharray: '4 4' }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={strokeColor}
            strokeWidth={2}
            fill={`url(#${fillId})`}
            dot={false}
            activeDot={{ r: 4, fill: strokeColor, stroke: '#0f172a', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
