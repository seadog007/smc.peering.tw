import { Info } from "lucide-react";
import SidebarButton from "@/components/SidebarButton";

import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
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
      <div className="text-sm leading-relaxed font-normal text-gray-100">
        <h3 className="mb-4 border-b border-gray-500/20 pb-2 text-xl font-semibold text-gray-400">
          {t("version.history")}
        </h3>

        <div className="flex flex-col divide-y">
          {Object.entries(versionHistory)
            .reverse()
            .map(([version, versionData]) => (
              <div key={version} className="py-3">
                <p className="mb-3 font-semibold text-gray-200">
                  <b className="font-bold text-gray-400">{version}</b>:{" "}
                  {versionData.date}
                </p>
                <ul className="m-0 list-none pl-5">
                  {Object.entries(versionData.changes).map(
                    ([change, changeData]) => (
                      <li
                        key={change}
                        className="relative mb-2 pl-4 text-gray-100 before:absolute before:left-0 before:font-bold before:text-gray-400 before:content-['•']"
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
      <DialogTrigger asChild>
        <SidebarButton>
          <Info className="size-5" />
        </SidebarButton>
      </DialogTrigger>
      <DialogContent className="p-0">
        <ScrollArea className="max-h-[75vh] overflow-y-auto p-6">
          <div>
            <div className="mb-4">
              <p
                className="mb-4 text-gray-100"
                dangerouslySetInnerHTML={{ __html: t("about.description") }}
              />
              <br />
              <p
                className="mb-4 text-gray-100"
                dangerouslySetInnerHTML={{ __html: t("about.developer") }}
              />
              <p
                className="mb-4 text-gray-100"
                dangerouslySetInnerHTML={{ __html: t("about.techstack") }}
              />
              <br />
              <p
                className="mb-4 text-gray-100"
                dangerouslySetInnerHTML={{ __html: t("about.datacollect") }}
              />
              <br />
              <p
                className="mb-4 text-gray-100"
                dangerouslySetInnerHTML={{ __html: t("about.datasource") }}
              />
              <br />
              <p
                className="mb-4 text-gray-100"
                dangerouslySetInnerHTML={{ __html: t("about.sponsor") }}
              />
              <br />
              <p
                className="mb-4 text-gray-100"
                dangerouslySetInnerHTML={{ __html: t("about.github") }}
              />
            </div>
            <br />
            {genVersionHistory()}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
