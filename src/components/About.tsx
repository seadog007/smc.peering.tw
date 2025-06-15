import { Trans, useTranslation } from 'react-i18next';

export default function About() {
  const { t } = useTranslation();

  return (
    <div className="about">
      <p>
        <Trans i18nKey="about.description" />
      </p>
      <br />
      <p>
        <Trans
          i18nKey="about.developer"
          components={[
            <a
              href={t("about.developer_url")}
              target="_blank"
              rel="noopener noreferrer"
            />,
          ]}
        />
      </p>
      <p>
        <Trans i18nKey="about.techstack" />
      </p>
      <br />
      <p>
        <Trans
          i18nKey="about.datacollect"
          components={[
            <a
              href="https://t.me/seadog007"
              target="_blank"
              rel="noopener noreferrer"
            />,
            <a
              href="https://www.facebook.com/seadog007"
              target="_blank"
              rel="noopener noreferrer"
            />,
          ]}
        />
      </p>
      <br />
      <p>
        <Trans
          i18nKey="about.datasource"
          components={[
            <a
              href="https://www.fa.gov.tw/"
              target="_blank"
              rel="noopener noreferrer"
            />,
            <a
              href="http://www.cht.com.tw/"
              target="_blank"
              rel="noopener noreferrer"
            />,
            <a
              href="https://www.tainan.gov.tw/"
              target="_blank"
              rel="noopener noreferrer"
            />,
            <a
              href="https://retn.net/"
              target="_blank"
              rel="noopener noreferrer"
            />,
            <a
              href="https://submarinenetworks.com/"
              target="_blank"
              rel="noopener noreferrer"
            />,
            <a
              href="https://submarinecablemap.com/"
              target="_blank"
              rel="noopener noreferrer"
            />,
          ]}
        />
      </p>
      <br />
      <p>
        <Trans
          i18nKey="about.sponsor"
          components={[
            <a
              href="https://www.twds.com.tw/"
              target="_blank"
              rel="noopener noreferrer"
            />,
            <a
              href="https://stuix.io/"
              target="_blank"
              rel="noopener noreferrer"
            />,
            <br />,
            <a
              href="https://sponsor.twds.com.tw/"
              target="_blank"
              rel="noopener noreferrer"
            />,
          ]}
        />
      </p>
      <br />
      <p>
        <Trans
          i18nKey="about.github"
          components={[
            <a
              href="https://github.com/seadog007/smc.peering.tw/"
              target="_blank"
              rel="noopener noreferrer"
            />,
            <a
              href="https://github.com/seadog007/tw-submarine-cable/"
              target="_blank"
              rel="noopener noreferrer"
            />,
          ]}
        />
      </p>
    </div>
  );
}