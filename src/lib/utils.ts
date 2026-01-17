import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTranslation } from "react-i18next";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Hook wrapper for components that want the current i18n language.
export function useFormatDate() {
  const { i18n } = useTranslation();
  function formatDate(dateInput: string | Date, locale?: string) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

    const lang = locale ?? undefined; // undefined lets toLocaleString pick runtime default
    return date.toLocaleString(lang, {
      year: "numeric",
      month: lang === "en" ? "short" : "numeric",
      day: "numeric",
    });
  }
  function formatDateTime(dateInput: string | Date, locale?: string) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;
    const lang = locale ?? undefined; // undefined lets toLocaleString pick runtime default

    const dateStr = date.toLocaleString(lang, {
      year: "numeric",
      month: lang === "en" ? "short" : "numeric",
      day: "numeric",
    });

    if (isMidnight) {
      return dateStr;
    }

    const timeStr = date.toLocaleString(lang, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Firefox zh-TW omits the space; add it manually.
    return `${dateStr} ${timeStr}`;
  }

  return {
    formatDate: (dateInput: string | Date) =>
      formatDate(dateInput, i18n.language),
    formatDateTime: (dateInput: string | Date) =>
      formatDateTime(dateInput, i18n.language),
  };
}
