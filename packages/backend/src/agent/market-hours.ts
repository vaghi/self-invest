function getETTime(): { hour: number; minute: number; dayOfWeek: number } {
  const now = new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  }).formatToParts(now);

  const hour = parseInt(parts.find((p) => p.type === 'hour')!.value);
  const minute = parseInt(parts.find((p) => p.type === 'minute')!.value);
  const weekday = parts.find((p) => p.type === 'weekday')!.value;

  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { hour, minute, dayOfWeek: dayMap[weekday] ?? 0 };
}

export function isMarketOpen(): boolean {
  const { hour, minute, dayOfWeek } = getETTime();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  const totalMinutes = hour * 60 + minute;
  return totalMinutes >= 570 && totalMinutes < 960; // 9:30 AM - 4:00 PM ET
}

export function isExtendedHours(): boolean {
  const { hour, minute, dayOfWeek } = getETTime();
  if (dayOfWeek === 0 || dayOfWeek === 6) return false;
  const totalMinutes = hour * 60 + minute;
  // Pre-market: 4:00-9:30 or After-hours: 16:00-20:00
  return (totalMinutes >= 240 && totalMinutes < 570) || (totalMinutes >= 960 && totalMinutes < 1200);
}

export function getEffectiveInterval(marketInterval: number, offHoursInterval: number): number {
  return isMarketOpen() ? marketInterval : offHoursInterval;
}
