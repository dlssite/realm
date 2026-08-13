/**
 * Pure date-math helpers for the Calendar module.
 * No external dependencies — only native Date APIs.
 */

/** Returns an array of Date objects for every day in the month containing `date` */
export function getDaysInMonth(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  for (let d = firstDay.getDate(); d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  return days;
}

/** Returns the Date for Monday of the week containing `date` */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0 = Sun
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Returns 7 Date objects for the week containing `date` (Mon–Sun) */
export function getWeekDays(date: Date): Date[] {
  const start = getWeekStart(date);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** First day of month, padded to Monday grid (may include trailing days of prev month) */
export function getMonthGrid(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Pad start: go back to Monday
  const startPad = firstOfMonth.getDay() === 0 ? 6 : firstOfMonth.getDay() - 1;
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - startPad);

  // Pad end to fill 6-row grid (42 cells)
  const cells: Date[] = [];
  const d = new Date(gridStart);
  while (cells.length < 42) {
    cells.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }

  // Trim trailing rows if the last row is entirely outside the month
  while (cells.length > 35) {
    const lastRow = cells.slice(-7);
    const allOutside = lastRow.every((c) => c.getMonth() !== month);
    if (allOutside) cells.splice(-7);
    else break;
  }

  return cells;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isCurrentMonth(date: Date, ref: Date): boolean {
  return date.getMonth() === ref.getMonth() && date.getFullYear() === ref.getFullYear();
}

export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/** Range for a full month — used for feed API calls */
export function getMonthRange(date: Date): { from: Date; to: Date } {
  const year = date.getFullYear();
  const month = date.getMonth();
  return {
    from: new Date(year, month, 1, 0, 0, 0, 0),
    to: new Date(year, month + 1, 0, 23, 59, 59, 999),
  };
}

/** Range for a single week Mon–Sun */
export function getWeekRange(date: Date): { from: Date; to: Date } {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { from: start, to: end };
}
