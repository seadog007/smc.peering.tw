import { useTranslation } from 'react-i18next';
import './About.css';

interface VersionHistory {
  [key: string]: {
    date: string;
    changes: string[];
  };
}

export default function About() {
  const { t } = useTranslation();
  const genVersionHistory = () => {
    const versionHistory = t('version.version', { returnObjects: true }) as unknown as VersionHistory;
    return (
      <div className="version">
        <h3>{t('version.history')}</h3>
        <br />
        {Object.entries(versionHistory).reverse().map(([version, versionData]) => (
          <div key={version}>
            <p><b>{version}</b>: {versionData.date}</p>
            <ul>
            {Object.entries(versionData.changes).map(([change, changeData]) => (
              <li key={change}>{changeData}</li>
            ))}
            </ul>
          </div>
        ))}
      </div>
    );
  };
  return (
    <div>
      <div className="about">
        <p dangerouslySetInnerHTML={{ __html: t('about.description') }} />
        <br />
        <p dangerouslySetInnerHTML={{ __html: t('about.developer') }} />
        <p dangerouslySetInnerHTML={{ __html: t('about.techstack') }} />
        <br />
        <p dangerouslySetInnerHTML={{ __html: t('about.datacollect') }} />
        <br />
        <p dangerouslySetInnerHTML={{ __html: t('about.datasource') }} />
        <br />
        <p dangerouslySetInnerHTML={{ __html: t('about.sponsor') }} />
        <br />
        <p dangerouslySetInnerHTML={{ __html: t('about.github') }} />
      </div>
      <br />
    {genVersionHistory()}
    </div>
  );
} 