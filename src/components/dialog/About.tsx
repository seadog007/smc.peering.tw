import { Info } from "lucide-react";
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
import { useTranslation } from "react-i18next";

type VersionHistory = Record<
  string,
  {
    date: string;
    changes: string[];
  }
>;
export default function AboutDialog() {
  const { t } = useTranslation();
  const genVersionHistory = () => {
    const versionHistory = t("version.version", {
      returnObjects: true,
    }) as unknown as VersionHistory;
    return (
      <div className="mt-6 font-normal">
        <div className="flex flex-col divide-y">
          <DialogHeader className="pb-2">
            <DialogTitle> {t("version.history")}</DialogTitle>
          </DialogHeader>
          {Object.entries(versionHistory)
            .reverse()
            .map(([version, versionData]) => (
              <div key={version} className="py-2">
                <div className="mb-1 flex items-center justify-between gap-2 text-base">
                  <div className="font-semibold text-gray-200 tabular-nums">
                    {version}
                  </div>
                  <div className="text-sm text-gray-400">
                    {versionData.date}
                  </div>
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
            ))}{" "}
        </div>
      </div>
    );
  };
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
                <p dangerouslySetInnerHTML={{ __html: t("about.description") }} />
                <p dangerouslySetInnerHTML={{ __html: t("about.developer") }} />
                <p dangerouslySetInnerHTML={{ __html: t("about.techstack") }} />
                <p dangerouslySetInnerHTML={{ __html: t("about.datacollect") }} />
                <p dangerouslySetInnerHTML={{ __html: t("about.datasource") }} />
                <p dangerouslySetInnerHTML={{ __html: t("about.sponsor") }} />
                <p dangerouslySetInnerHTML={{ __html: t("about.github") }} />

                {genVersionHistory()}
              </div>
            </DialogDescription>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
