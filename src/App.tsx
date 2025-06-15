import type { LatLngTuple } from 'leaflet';
import { useState, useEffect, Suspense } from 'react';
import Map from './components/Map';
import UptimeTimeline from './components/UptimeTimeline';
import About from './components/About';
import Modal from './components/Modal';
import IncidentList from './components/IncidentList';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';
import './App.css';
import './i18n';

// Sample timeline data for cables
const now = new Date();
const timelineRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
const desktopMapCenter: LatLngTuple = [24, 124.5];
const midwidthMapCenter: LatLngTuple = [24, 123];
const mobileMapCenter: LatLngTuple = [24, 121.1];

function App() {
  const { t } = useTranslation();
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mapCenter, setMapCenter] = useState<LatLngTuple>(
    window.innerWidth < 768 ? mobileMapCenter : window.innerWidth < 1024 ? midwidthMapCenter : desktopMapCenter
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setMapCenter(window.innerWidth < 768 ? mobileMapCenter : window.innerWidth < 1024 ? midwidthMapCenter : desktopMapCenter);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleOpenTimeline = () => setIsTimelineOpen(true);
  const handleCloseTimeline = () => setIsTimelineOpen(false);
  const handleOpenAbout = () => setIsAboutOpen(true);
  const handleCloseAbout = () => setIsAboutOpen(false);

  return (
    <div className="app">
      <LanguageSwitcher />
      <div className="app-content">
        <div className="app-container">
          <div className="map-section">
            <Map center={mapCenter} />
          </div>
          {!isMobile && (
            <button
              onClick={handleOpenTimeline}
              className="timeline-button"
              title={t('timeline.show')}
            >
              <svg className="timeline-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
          )}
          {!isMobile && (
            <button
              onClick={handleOpenAbout}
              className="about-button"
              title={t('about.show')}
            >
              <svg className="about-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          <div className={`incident-section ${isMobile ? 'full-width' : ''}`}>
            <Suspense>
              <IncidentList />
            </Suspense>
          </div>
          <Modal
            isOpen={isTimelineOpen}
            onClose={handleCloseTimeline}
            title={t('timeline.title')}
          >
          <Suspense>
            <UptimeTimeline
              startDate={timelineRange}
              endDate={now}
            />
          </Suspense>
          </Modal>
          <Modal
            isOpen={isAboutOpen}
            onClose={handleCloseAbout}
            title={t('about.title')}
          >
            <About />
          </Modal>
        </div>
      </div>
    </div>
  );
}

export default App;
