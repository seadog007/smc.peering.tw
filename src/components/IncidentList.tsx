import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './IncidentList.css';

interface Incident {
  date: string;
  status: string;
  cableid: string;
  segment: string;
  title: string;
  description: string;
  reparing_at: string;
  resolved_at: string;
}

export default function IncidentList() {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [showHistorical, setShowHistorical] = useState(false);

  useEffect(() => {
    // Load incidents from JSON file
    fetch('/data/incidents.json')
      .then(response => response.json())
      .then((data: Incident[]) => {
        // Sort incidents by date, most recent first
        const sortedIncidents = data.sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setIncidents(sortedIncidents);
      })
      .catch(error => console.error('Error loading incidents:', error));
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;
    
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(isMidnight ? {} : {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    });
  };

  const filteredIncidents = incidents.filter(incident => 
    showHistorical ? incident.resolved_at : !incident.resolved_at
  );

  return (
    <div className="incident-list">
      <div className="incident-list-header">
        <h2 className="incident-list-title">
          {showHistorical ? t('incidents.historicalTitle') : t('incidents.activeTitle')}
        </h2>
        <button 
          className="toggle-button"
          onClick={() => setShowHistorical(!showHistorical)}
        >
          {showHistorical ? t('common.showActive') : t('common.showHistorical')}
        </button>
      </div>
      <div className="incident-list-container">
        {filteredIncidents.map((incident, index) => (
          <div
            key={`${incident.cableid}-${incident.date}-${index}`}
            className="incident-card"
          >
            <div className="incident-header">
              <h3 className="incident-title">
                {incident.title}
              </h3>
              <span className={`incident-status ${incident.resolved_at ? 'status-resolved' : 'status-active'}`}>
                {incident.resolved_at ? t('common.resolved') : t('common.active')}
              </span>
            </div>
            <div className="incident-timestamps">
              <p className="incident-timestamp">
                {t('incidents.started_at')}: {formatDate(incident.date)}
              </p>
              {incident.reparing_at && (
                <p className="incident-timestamp">
                  {t('incidents.reparing_at')}: {formatDate(incident.reparing_at)}
                </p>
              )}
              {incident.resolved_at && (
                <p className="incident-timestamp">
                  {t('incidents.resolved_at')}: {formatDate(incident.resolved_at)}
                </p>
              )}
            </div>
            <p className="incident-description">{incident.description}</p>
          </div>
        ))}
        {filteredIncidents.length === 0 && (
          <div className="incident-card">
            <p className="incident-description">
              {showHistorical ? t('common.noHistoricalIncidents') : t('common.noActiveIncidents')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
} 