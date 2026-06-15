import { addDays, differenceInCalendarDays, isWeekend, parseISO } from 'date-fns';

export function businessDaysBetween(startDate: string, endDate: string): number {
  let current = parseISO(startDate);
  const end = parseISO(endDate);
  let days = 0;

  while (differenceInCalendarDays(end, current) > 0) {
    current = addDays(current, 1);
    if (!isWeekend(current)) days += 1;
  }

  return days;
}

export function calendarDaysBetween(startDate: string, endDate: string): number {
  return differenceInCalendarDays(parseISO(endDate), parseISO(startDate));
}
