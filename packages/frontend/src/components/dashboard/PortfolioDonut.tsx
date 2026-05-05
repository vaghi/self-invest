import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, type TooltipProps } from 'recharts';

interface PositionSlice {
  symbol: string;
  marketValue: string;
}

interface PortfolioDonutProps {
  positions: PositionSlice[];
  cashBalance: string;
}

const COLORS = [
  '#818cf8', // brand-400
  '#34d399', // emerald-400
  '#fbbf24', // amber-400
  '#fb7185', // rose-400
  '#22d3ee', // cyan-400
  '#a78bfa', // violet-400
  '#f97316', // orange-400
  '#2dd4bf', // teal-400
];
const CASH_COLOR = '#475569'; // surface-700 / gray

interface SliceDatum {
  name: string;
  value: number;
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <div className="rounded-lg bg-surface-900 border border-surface-700 px-3 py-2 shadow-lg">
      <p className="text-xs text-gray-400 mb-0.5">{entry.name}</p>
      <p className="text-sm font-semibold text-gray-100">
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(entry.value ?? 0)}
      </p>
    </div>
  );
}

interface LabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  name: string;
  percent: number;
}

function renderLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: LabelProps) {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#d1d5db"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={12}
      fontWeight={500}
    >
      {name}
    </text>
  );
}

export function PortfolioDonut({ positions, cashBalance }: PortfolioDonutProps) {
  const cash = parseFloat(cashBalance) || 0;

  const slices: SliceDatum[] = positions.map((p) => ({
    name: p.symbol,
    value: parseFloat(p.marketValue) || 0,
  }));

  if (cash > 0) {
    slices.push({ name: 'Cash', value: cash });
  }

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (slices.length === 0 || total === 0) {
    return (
      <div className="rounded-xl bg-surface-800 border border-surface-700 p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-4">Allocation</h3>
        <p className="text-sm text-gray-400 text-center py-16">No positions</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-surface-800 border border-surface-700 p-6">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Allocation</h3>

      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={slices}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={renderLabel}
            labelLine={false}
            stroke="none"
          >
            {slices.map((entry, index) => (
              <Cell
                key={entry.name}
                fill={
                  entry.name === 'Cash'
                    ? CASH_COLOR
                    : COLORS[index % COLORS.length]
                }
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3">
        {slices.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-300">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor:
                  entry.name === 'Cash'
                    ? CASH_COLOR
                    : COLORS[index % COLORS.length],
              }}
            />
            {entry.name}
            <span className="text-gray-400">
              {((entry.value / total) * 100).toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
