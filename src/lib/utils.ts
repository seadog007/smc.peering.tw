import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTranslation } from "react-i18next";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Building an Intl.DateTimeFormat is the expensive part of formatting, and
// toLocaleString(locale, options) builds a new one on every call. These are
// built once per locale; format() gives the same string toLocaleString would.
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(lang: string | undefined, kind: "date" | "time") {
  const key = `${kind}|${lang ?? ""}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(
      lang,
      kind === "date"
        ? { year: "numeric", month: lang === "en" ? "short" : "numeric", day: "numeric" }
        : { hour: "2-digit", minute: "2-digit", hour12: false },
    );
    formatterCache.set(key, formatter);
  }
  return formatter;
}

// toLocaleString returns this for an invalid date; format() would throw instead.
const INVALID_DATE = "Invalid Date";

// Hook wrapper for components that want the current i18n language.
export function useFormatDate() {
  const { i18n } = useTranslation();
  function formatDate(dateInput: string | Date, locale?: string) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(date.getTime())) return INVALID_DATE;
    return getFormatter(locale, "date").format(date);
  }
  function formatDateTime(dateInput: string | Date, locale?: string) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    // toLocaleString printed "Invalid Date" once for each part.
    if (Number.isNaN(date.getTime())) return `${INVALID_DATE} ${INVALID_DATE}`;
    const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;

    const dateStr = getFormatter(locale, "date").format(date);

    if (isMidnight) {
      return dateStr;
    }

    const timeStr = getFormatter(locale, "time").format(date);

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
