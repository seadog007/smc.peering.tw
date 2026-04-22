import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enTranslations from "./locales/en.json";
import zhTWTranslations from "./locales/zh-tw.json";

const storedLng =
  typeof window !== "undefined"
    ? (window.localStorage.getItem("i18nextLng") ?? "").trim()
    : "";

i18n
  .use(initReactI18next)
  .init({
    lng: storedLng || undefined,
    supportedLngs: ["en", "zh-TW"],
    resources: {
      en: {
        translation: enTranslations,
      },
      "zh-TW": {
        translation: zhTWTranslations,
      },
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
