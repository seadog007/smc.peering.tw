import React from 'react';
import './IncidentList.css';

interface Incident {
  id: string;
  title: string;
  timestamp: string;
  status: 'active' | 'resolved';
  description: string;
}

interface IncidentListProps {
  incidents: Incident[];
}

export default function IncidentList({ incidents }: IncidentListProps) {
  return (
    <div className="incident-list">
      <h2 className="incident-list-title">Incidents</h2>
      <div className="incident-list-container">
        {incidents.map((incident) => (
          <div
            key={incident.id}
            className="incident-card"
          >
            <div className="incident-header">
              <h3 className="incident-title">{incident.title}</h3>
              <span
                className={`incident-status ${incident.status === 'active' ? 'status-active' : 'status-resolved'}`}
              >
                {incident.status}
              </span>
            </div>
            <p className="incident-timestamp">{incident.timestamp}</p>
            <p className="incident-description">{incident.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
} 