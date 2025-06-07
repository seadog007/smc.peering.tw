import { Icon } from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import { useState, useEffect } from 'react';
import Map from './components/Map';
import UptimeTimeline from './components/UptimeTimeline';
import Modal from './components/Modal';
import IncidentList from './components/IncidentList';
import './App.css';
import landingPoints from './data/landing-points.json';

const sampleIncidents = [
  {
    id: '1',
    title: 'Network Latency Issue',
    timestamp: '2024-03-20 14:30',
    status: 'active' as const,
    description: 'Increased latency detected in the northern region.'
  },
];

// Example custom marker icon
const customIcon = new Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

// Sample timeline data for cables
const now = new Date();
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
const timelineSegments = {
  'apcn-2': [
    {
      startTime: oneHourAgo,
      endTime: new Date(oneHourAgo.getTime() + 20 * 60 * 1000),
      status: 'online' as const,
    },
    {
      startTime: new Date(oneHourAgo.getTime() + 20 * 60 * 1000),
      endTime: new Date(oneHourAgo.getTime() + 30 * 60 * 1000),
      status: 'warning' as const,
    },
    {
      startTime: new Date(oneHourAgo.getTime() + 30 * 60 * 1000),
      endTime: now,
      status: 'online' as const,
    },
  ],
  'eac-c2c': [
    {
      startTime: oneHourAgo,
      endTime: new Date(oneHourAgo.getTime() + 10 * 60 * 1000),
      status: 'online' as const,
    },
    {
      startTime: new Date(oneHourAgo.getTime() + 10 * 60 * 1000),
      endTime: new Date(oneHourAgo.getTime() + 45 * 60 * 1000),
      status: 'offline' as const,
    },
    {
      startTime: new Date(oneHourAgo.getTime() + 45 * 60 * 1000),
      endTime: now,
      status: 'online' as const,
    },
  ]
};

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

  const markers: any[] = [];
  const lines: any[] = [];

  return (
    <div className="app-container">
      <div className="map-section">
        <Map center={mapCenter} markers={markers} lines={lines} />
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
        <IncidentList incidents={sampleIncidents} />
      </div>
      <Modal
        isOpen={isTimelineOpen}
        onClose={handleCloseTimeline}
        title="Uptime Timeline"
      >
        <UptimeTimeline
          cables={cables}
          segments={timelineSegments}
          startDate={oneHourAgo}
          endDate={now}
        />
      </Modal>
    </div>
  );
}

export default App;
