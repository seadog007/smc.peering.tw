import React, { useEffect, useState } from 'react';
import './IncidentList.css';

interface Incident {
  date: string;
  status: string;
  cableid: string;
  segment: string;
  title: string;
  description: string;
  resolved_at: string;
}

export default function IncidentList() {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    // Load incidents from JSON file
    fetch('/src/data/incidents.json')
      .then(response => response.json())
      .then((data: Incident[]) => {
        // Filter for active incidents and sort by date, most recent first
        const activeIncidents = data
          .filter(incident => !incident.resolved_at)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setIncidents(activeIncidents);
      })
      .catch(error => console.error('Error loading incidents:', error));
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="incident-list">
      <h2 className="incident-list-title">Active Incidents</h2>
      <div className="incident-list-container">
        {incidents.map((incident, index) => (
          <div
            key={`${incident.cableid}-${incident.date}-${index}`}
            className="incident-card"
          >
            <div className="incident-header">
              <h3 className="incident-title">
                {incident.title}
              </h3>
              <span className="incident-status status-active">
                Active
              </span>
            </div>
            <div className="incident-timestamps">
              <p className="incident-timestamp">
                Started: {formatDate(incident.date)}
              </p>
            </div>
            <p className="incident-description">{incident.description}</p>
          </div>
        ))}
        {incidents.length === 0 && (
          <div className="incident-card">
            <p className="incident-description">No active incidents</p>
          </div>
        )}
      </div>
    </div>
  );
} 