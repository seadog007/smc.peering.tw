import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onDone: () => void;
};

const LANG_KEY = "i18nextLng";

export default function LanguageSelectModal({ open, onDone }: Props) {
  const { i18n } = useTranslation();
  const englishButtonRef = useRef<HTMLButtonElement>(null);

  const currentLng = useMemo(() => {
    const lng = (localStorage.getItem(LANG_KEY) ?? "").trim();
    return lng.length > 0 ? lng : null;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (currentLng) onDone();
  }, [currentLng, onDone, open]);

  function selectLanguage(lng: "en" | "zh-TW") {
    localStorage.setItem(LANG_KEY, lng);
    i18n.changeLanguage(lng);
    onDone();
  }

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[520px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          englishButtonRef.current?.focus();
        }}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Select language / 選擇語言</DialogTitle>
        </DialogHeader>
        <DialogDescription asChild>
          <div className="text-sm text-white/80">
            Choose your language so the introduction is shown correctly.
            <br />
            請先選擇語言，讓簡介與提示以正確語言顯示。
          </div>
        </DialogDescription>
        <DialogFooter className="gap-2 sm:flex-row sm:justify-center">
          <Button
            ref={englishButtonRef}
            variant="secondary"
            className="min-w-40"
            onClick={() => selectLanguage("en")}
          >
            English
          </Button>
          <Button
            variant="secondary"
            className="min-w-40"
            onClick={() => selectLanguage("zh-TW")}
          >
            繁體中文
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

