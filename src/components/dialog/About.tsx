import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import SidebarButton from "@/components/SidebarButton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

type VersionHistory = Record<
  string,
  {
    date: string;
    changes: string[];
  }
>;

function VersionHistoryList({ heading }: { heading: ReactNode }) {
  const { t } = useTranslation();
  const versionHistory = t("version.version", {
    returnObjects: true,
  }) as unknown as VersionHistory;

  return (
    <div className="mt-6 font-normal">
      <div className="flex flex-col divide-y">
        {heading}
        {Object.entries(versionHistory)
          .reverse()
          .map(([version, versionData]) => (
            <div key={version} className="py-2">
              <div className="mb-1 flex items-center justify-between gap-2 text-base">
                <div className="font-semibold text-gray-200 tabular-nums">
                  {version}
                </div>
                <div className="text-sm text-gray-400">{versionData.date}</div>
              </div>
              <ul className="flex flex-col gap-0.5">
                {Object.entries(versionData.changes).map(
                  ([change, changeData]) => (
                    <li
                      key={change}
                      className="relative pl-4 text-gray-300 before:absolute before:left-0 before:font-semibold before:text-gray-400 before:content-['•']"
                    >
                      {changeData}
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
      </div>
    </div>
  );
}

function AboutBodyContent({ versionHeading }: { versionHeading: ReactNode }) {
  const { t } = useTranslation();

  return (
    <>
      <p dangerouslySetInnerHTML={{ __html: t("about.description") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.developer") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.techstack") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.datacollect") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.datasource") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.sponsor") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.github") }} />
      <VersionHistoryList heading={versionHeading} />
    </>
  );
}

export function AboutContent() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 text-sm text-white/80">
      <AboutBodyContent
        versionHeading={
          <div className="pb-2 text-base font-semibold text-white">
            {t("version.history")}
          </div>
        }
      />
    </div>
  );
}

export default function AboutDialog() {
  const { t } = useTranslation();

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <SidebarButton>
              <Info className="size-5" />
            </SidebarButton>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("about.title")}</p>
        </TooltipContent>
      </Tooltip>
      <DialogContent className="p-0">
        <ScrollArea className="max-h-[75vh] overflow-y-auto">
          <div className="flex flex-col gap-4 p-6 text-sm text-white/80">
            <DialogHeader>
              <DialogTitle>{t("about.title")}</DialogTitle>
            </DialogHeader>

            <DialogDescription asChild>
              <div>
                <AboutBodyContent
                  versionHeading={
                    <DialogHeader className="pb-2">
                      <DialogTitle> {t("version.history")}</DialogTitle>
                    </DialogHeader>
                  }
                />
              </div>
            </DialogDescription>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
