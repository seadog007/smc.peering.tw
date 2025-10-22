import { useTranslation } from "react-i18next";
import { useLocalStorage } from "usehooks-ts";
import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

export default function IntroModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [dontShowWarningAgain, setDontShowWarningAgain] = useLocalStorage(
    "dontShowWarningAgain",
    false,
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!dontShowWarningAgain) {
      setIsOpen(true);
    }
  }, [dontShowWarningAgain]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[550px]"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          buttonRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{t("warning.title")}</DialogTitle>
        </DialogHeader>
        <div>
          <p dangerouslySetInnerHTML={{ __html: t("warning.message") }} />
          <div className="mt-4">
            <label className="flex items-center space-x-2">
              <Checkbox
                checked={dontShowWarningAgain}
                onCheckedChange={(checked) =>
                  setDontShowWarningAgain(checked === true)
                }
              />
              <span>{t("warning.dontShowAgain")}</span>
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button
            ref={buttonRef}
            className="warning-acknowledge-btn"
            onClick={() => setIsOpen(false)}
          >
            {t("warning.acknowledge")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
