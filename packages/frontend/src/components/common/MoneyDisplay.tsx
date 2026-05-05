interface MoneyDisplayProps {
  value: string | number;
  className?: string;
  showSign?: boolean;
  colorize?: boolean;
}

export function MoneyDisplay({
  value,
  className,
  showSign = false,
  colorize = false,
}: MoneyDisplayProps) {
  const numeric = typeof value === 'string' ? parseFloat(value) : value;
  const isPositive = numeric > 0;
  const isNegative = numeric < 0;

  const colorClass = colorize
    ? isPositive
      ? 'text-profit'
      : isNegative
        ? 'text-loss'
        : 'text-gray-400'
    : '';

  const formatted = Math.abs(numeric).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  let prefix = '$';
  if (showSign && isPositive) prefix = '+$';
  if (isNegative) prefix = showSign ? '-$' : '-$';

  return (
    <span className={className ?? `font-mono tabular-nums ${colorClass}`}>
      {prefix}
      {formatted}
    </span>
  );
}

export default MoneyDisplay;
