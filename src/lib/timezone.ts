import { format, addHours, startOfDay, setHours, setMinutes } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export const TIMEZONE = "Asia/Jakarta";

export function toWIB(date: Date): Date {
  return toZonedTime(date, TIMEZONE);
}

export function fromWIB(date: Date): Date {
  return fromZonedTime(date, TIMEZONE);
}

export function formatWIB(date: Date, formatStr: string): string {
  return formatInTimeZone(date, TIMEZONE, formatStr);
}

export function getWIBNow(): Date {
  return toZonedTime(new Date(), TIMEZONE);
}

export function getStartOfDayWIB(date: Date): Date {
  const wibDate = toZonedTime(date, TIMEZONE);
  const start = startOfDay(wibDate);
  return fromZonedTime(start, TIMEZONE);
}

export function createWIBDateTime(date: Date, hours: number, minutes: number = 0): Date {
  const wibDate = toZonedTime(date, TIMEZONE);
  const withHours = setHours(startOfDay(wibDate), hours);
  const withMinutes = setMinutes(withHours, minutes);
  return fromZonedTime(withMinutes, TIMEZONE);
}

export function generateTimeSlots(date: Date): { start: Date; end: Date; label: string }[] {
  const slots: { start: Date; end: Date; label: string }[] = [];
  for (let hour = 7; hour < 21; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const start = createWIBDateTime(date, hour, min);
      const end = createWIBDateTime(date, hour + (min === 30 ? 1 : 0), min === 30 ? 0 : 30);
      const label = `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      slots.push({ start, end, label });
    }
  }
  return slots;
}
