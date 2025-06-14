import type { LatLngTuple } from 'leaflet';
import { useState, useEffect } from 'react';
import Map from './components/Map';
import UptimeTimeline from './components/UptimeTimeline';
import Modal from './components/Modal';
import IncidentList from './components/IncidentList';
import './App.css';

// Sample timeline data for cables
const now = new Date();
const timelineRange = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

function App() {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [cables, setCables] = useState<{ id: string, name: string }[]>([]);
  const [mapCenter, setMapCenter] = useState<LatLngTuple>(
    window.innerWidth < 768 ? [23.5, 121] : [23.7, 123]
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setMapCenter(mobile ? [23.5, 121] : [23.7, 123]);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Dynamically import cable data to pass to timeline
    const loadCables = async () => {
      const cableFiles = import.meta.glob<{ default: { id: string, name: string } }>('/src/data/cables/*.json');
      const loadedCables = [];
      for (const path in cableFiles) {
        const module = await cableFiles[path]();
        loadedCables.push({
          id: module.default.id,
          name: module.default.name
        });
      }
      setCables(loadedCables);
    };
    loadCables();
  }, []);

  const handleOpenTimeline = () => setIsTimelineOpen(true);
  const handleCloseTimeline = () => setIsTimelineOpen(false);

  return (
    <div className="app-container">
      <div className="map-section">
        <Map center={mapCenter} />
      </div>
      {!isMobile && (
        <button
          onClick={handleOpenTimeline}
          className="timeline-button"
          title="Show Uptime Timeline"
        >
          <svg className="timeline-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      )}
      <div className={`incident-section ${isMobile ? 'full-width' : ''}`}>
        <IncidentList />
      </div>
      <Modal
        isOpen={isTimelineOpen}
        onClose={handleCloseTimeline}
        title="Uptime Timeline"
      >
        <UptimeTimeline
          cables={cables}
          startDate={timelineRange}
          endDate={now}
        />
      </Modal>
    </div>
  );
}

export default App;
