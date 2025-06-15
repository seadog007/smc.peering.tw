import { useTranslation } from 'react-i18next';
import styles from './LanguageSwitcher.module.css';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className={styles['language-switcher']}>
      <button
        className={styles['lang-button'] + (i18n.language === 'en' ? ' ' + styles['active'] : '')}
        onClick={() => changeLanguage('en')}
      >
        EN
      </button>
      <button
        className={styles['lang-button'] + (i18n.language === 'zh-TW' ? ' ' + styles['active'] : '')}
        onClick={() => changeLanguage('zh-TW')}
      >
        中文
      </button>
    </div>
  );
} 