import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function About() {
  const { t } = useTranslation();
  return (
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
  );
} 