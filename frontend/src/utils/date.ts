import { format, subDays, addDays, isToday, isYesterday } from 'date-fns';
import { de, enUS } from 'date-fns/locale';

export const formatDate = (date: Date, formatStr: string = 'yyyy-MM-dd', language: 'de' | 'en' = 'de'): string => {
  const locale = language === 'de' ? de : enUS;
  return format(date, formatStr, { locale });
};

export const getDateString = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const getDisplayDate = (date: Date, language: 'de' | 'en' = 'de'): string => {
  if (isToday(date)) {
    return language === 'de' ? 'Heute' : 'Today';
  }
  if (isYesterday(date)) {
    return language === 'de' ? 'Gestern' : 'Yesterday';
  }
  const locale = language === 'de' ? de : enUS;
  return format(date, 'EEEE, d. MMMM', { locale });
};

export const getPreviousDay = (date: Date): Date => {
  return subDays(date, 1);
};

export const getNextDay = (date: Date): Date => {
  return addDays(date, 1);
};

export const getCurrentTime = (): string => {
  return format(new Date(), 'HH:mm');
};

export { isToday };
