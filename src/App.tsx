import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, Languages } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import Map from './components/Map';
import UptimeTimeline from './components/UptimeTimeline';
import About from './components/About';
import Modal from './components/Modal';
import IncidentList from './components/IncidentList';
import TechClock from './components/TechClock';

import './App.css';
import './i18n';

// Sample timeline data for cables
const now = new Date();
const timelineRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

function App() {
  const { t, i18n } = useTranslation();
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isIncidentOpen, setIsIncidentOpen] = useState(false);
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [dontShowWarningAgain, setDontShowWarningAgain] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [cables, setCables] = useState<{ id: string; name: string }[]>([]);
  const [cableFilter, setCableFilter] = useState<'all' | 'normal' | 'broken'>('all');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Check if user has seen the warning before
    const hasSeenWarning = localStorage.getItem('hasSeenWarning');
    if (!hasSeenWarning) {
      setIsWarningOpen(true);
    }
  }, []);

  useEffect(() => {
    // Dynamically import cable data to pass to timeline
    const loadCables = async () => {
      const cableFiles = import.meta.glob<{ default: { id: string; name: string } }>('/src/data/cables/*.json');
      const loadedCables = [];
      for (const path in cableFiles) {
        const module = await cableFiles[path]();
        loadedCables.push({
          id: module.default.id,
          name: module.default.name,
        });
      }
      setCables(loadedCables);
    };
    void loadCables();
  }, []);

  const handleOpenTimeline = () => setIsTimelineOpen(true);
  const handleCloseTimeline = () => setIsTimelineOpen(false);
  const handleOpenAbout = () => setIsAboutOpen(true);
  const handleCloseAbout = () => setIsAboutOpen(false);
  const handleOpenIncident = () => setIsIncidentOpen(true);
  const handleCloseIncident = () => setIsIncidentOpen(false);
  const handleCloseWarning = () => {
    setIsWarningOpen(false);
    if (dontShowWarningAgain) {
      localStorage.setItem('hasSeenWarning', 'true');
    }
  };

  const handleLanguageChange = (value: string) => {
    if (value.startsWith('lang-')) {
      void i18n.changeLanguage(value.replace('lang-', ''));
    }
  };

  const handleCableFilterChange = (value: string) => {
    if (value.startsWith('filter-')) {
      setCableFilter(value.replace('filter-', '') as 'all' | 'normal' | 'broken');
    }
  };

  return (
    <div className="app select-none">
      <div className="app-content">
        <div className="app-container">
          <div className="map-section">
            <Map cableFilter={cableFilter} />
          </div>
          <div className="control-panel">
            <TechClock />
            <div className="selector-container horizontal">
              <Select onValueChange={handleLanguageChange} value={`lang-${i18n.language}`}>
                <SelectTrigger className="control-select">
                  <Languages className="select-icon" />
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent className="control-select-content">
                  <SelectItem value="lang-en" className="control-select-item">
                    English
                  </SelectItem>
                  <SelectItem value="lang-zh-TW" className="control-select-item">
                    繁體中文
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select onValueChange={handleCableFilterChange} value={`filter-${cableFilter}`}>
                <SelectTrigger className="control-select">
                  <Eye className="select-icon" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent className="control-select-content">
                  <SelectItem value="filter-all" className="control-select-item">
                    {t('filter.all') || '混合'}
                  </SelectItem>
                  <SelectItem value="filter-normal" className="control-select-item">
                    {t('filter.normal') || '正常'}
                  </SelectItem>
                  <SelectItem value="filter-broken" className="control-select-item">
                    {t('filter.broken') || '斷線'}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={handleOpenIncident}
              className="incident-button"
              title={t('incident.show')}
            >
              <svg className="incident-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </button>
          )}
          <button
            onClick={handleOpenTimeline}
            className="timeline-button"
            title={t('timeline.show')}
          >
            <svg className="timeline-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button
            onClick={handleOpenAbout}
            className="about-button"
            title={t('about.show')}
          >
            <svg className="about-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          {!isMobile && (
            <div className={`incident-section ${isMobile ? 'full-width' : ''}`}>
              <IncidentList />
            </div>
          )}
          {isMobile && (
            <Modal
              isOpen={isIncidentOpen}
              onClose={handleCloseIncident}
              title={t('incidents.title')}
            >
              <IncidentList />
            </Modal>
          )}
          <Modal
            isOpen={isTimelineOpen}
            onClose={handleCloseTimeline}
            title={t('timeline.title')}
          >
            <UptimeTimeline
              cables={cables}
              startDate={timelineRange}
              endDate={now}
            />
          </Modal>
          <Modal
            isOpen={isAboutOpen}
            onClose={handleCloseAbout}
            title={t('about.title')}
          >
            <About />
          </Modal>
          <Modal
            isOpen={isWarningOpen}
            onClose={handleCloseWarning}
            title={t('warning.title')}
            maxWidth="550px"
            fullHeight={false}
          >
            <div className="warning-content">
              <p dangerouslySetInnerHTML={{ __html: t('warning.message') }} />
              <div className="warning-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={dontShowWarningAgain}
                    onChange={(e) => setDontShowWarningAgain(e.target.checked)}
                  />
                  <span>{t('warning.dontShowAgain')}</span>
                </label>
              </div>
              <button
                className="warning-acknowledge-btn"
                onClick={handleCloseWarning}
              >
                {t('warning.acknowledge')}
              </button>
            </div>
          </Modal>
        </div>
      </div>
    </div>
  );
}

export default App;
