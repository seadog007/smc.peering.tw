import { useTranslation } from "react-i18next";
import { useLocalStorage } from "usehooks-ts";
import { useState } from "react";
import Modal from "@/components/Modal";
export default function IntroModal() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [dontShowWarningAgain, setDontShowWarningAgain] = useLocalStorage(
    "dontShowWarningAgain",
    false,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      title={t("warning.title")}
      maxWidth="550px"
    >
      <div className="warning-content">
        <p dangerouslySetInnerHTML={{ __html: t("warning.message") }} />
        <div className="warning-checkbox">
          <label>
            <input
              type="checkbox"
              checked={dontShowWarningAgain}
              onChange={(e) => setDontShowWarningAgain(e.target.checked)}
            />
            <span>{t("warning.dontShowAgain")}</span>
          </label>
        </div>
        <button
          className="warning-acknowledge-btn"
          onClick={() => setIsOpen(false)}
        >
          {t("warning.acknowledge")}
        </button>
      </div>
    </Modal>
  );
}
