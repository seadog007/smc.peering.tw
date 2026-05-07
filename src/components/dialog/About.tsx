import { useTranslation } from "react-i18next";

type VersionHistory = Record<
  string,
  {
    date: string;
    changes: string[];
  }
>;

export default function AboutContent() {
  const { t } = useTranslation();

  const genVersionHistory = () => {
    const versionHistory = t("version.version", {
      returnObjects: true,
    }) as unknown as VersionHistory;
    return (
      <div className="mt-6 font-normal">
        <div className="flex flex-col divide-y divide-white/10">
          <div className="pb-2 text-base font-semibold text-white">
            {t("version.history")}
          </div>
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
            ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2 text-sm text-white/80">
      <p dangerouslySetInnerHTML={{ __html: t("about.description") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.developer") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.techstack") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.datacollect") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.datasource") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.sponsor") }} />
      <p dangerouslySetInnerHTML={{ __html: t("about.github") }} />
      {genVersionHistory()}
    </div>
  );
}
