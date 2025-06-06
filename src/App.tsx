import { Icon } from 'leaflet';
import type { LatLngTuple } from 'leaflet';
import { useState, useEffect } from 'react';
import Map from './components/Map';
import UptimeTimeline from './components/UptimeTimeline';
import Modal from './components/Modal';
import IncidentList from './components/IncidentList';

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

function App() {
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);

  // Debug state changes
  useEffect(() => {
    console.log('Modal state changed:', isTimelineOpen);
  }, [isTimelineOpen]);

  const handleOpenTimeline = () => {
    console.log('Opening timeline...');
    setIsTimelineOpen(true);
  };

  const handleCloseTimeline = () => {
    console.log('Closing timeline...');
    setIsTimelineOpen(false);
  };

  // Example data
  const mapCenter: LatLngTuple = [25.0330, 121.5654]; // Taipei coordinates
  const markers = [
    { position: [25.0330, 121.5654] as LatLngTuple, title: 'Location 1' },
    { position: [25.0340, 121.5754] as LatLngTuple, title: 'Location 2', customIcon },
  ];
  const lines = [
    {
      positions: [
        [25.0330, 121.5654] as LatLngTuple,
        [25.0340, 121.5754] as LatLngTuple,
      ],
      color: '#ff0000',
    },
  ];

  // Example timeline data
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const timelineSegments = [
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
  ];

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Map center={mapCenter} markers={markers} lines={lines} />
      
      {/* Timeline Button */}
      <div style={{ position: 'absolute', bottom: '20px', right: '20px', zIndex: 1000 }}>
        <button
          onClick={handleOpenTimeline}
          className="bg-white rounded-lg shadow-lg p-3 hover:bg-gray-50 transition-colors"
          title="Show Uptime Timeline"
        >
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>
    
      {/* Incident List Section */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 1000 }}>
        <IncidentList incidents={sampleIncidents} />
      </div>

      {/* Timeline Modal */}
      <Modal
        isOpen={isTimelineOpen}
        onClose={handleCloseTimeline}
        title="Uptime Timeline"
      >
        <UptimeTimeline
          segments={timelineSegments}
          startDate={oneHourAgo}
          endDate={now}
        />
      </Modal>
    </div>
  );
}

export default App;
