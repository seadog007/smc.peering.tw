import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import './LanguageSwitcher.css';

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    void i18n.changeLanguage(lng);
  };

  return (
    <div className="language-switcher">
      <Select value={i18n.language} onValueChange={changeLanguage}>
        <SelectTrigger className="language-select-trigger">
          <Globe className="language-icon" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="language-select-content">
          <SelectItem value="en" className="language-select-item">
            <span className="language-flag">🇺🇸</span>
            English
          </SelectItem>
          <SelectItem value="zh-TW" className="language-select-item">
            <span className="language-flag">🇹🇼</span>
            繁體中文
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
