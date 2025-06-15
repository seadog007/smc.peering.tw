import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './UptimeTimeline.css';

interface Cable {
  id: string;
  name: string;
}

interface TimelineSegment {
  startTime: Date;
  endTime: Date;
  status: 'online' | 'disconnected' | 'partial_disconnected' | 'notice';
}

interface Incident {
  date: string;
  status: string;
  cableid: string;
  segment: string;
  description: string;
  resolved_at: string;
}

interface UptimeTimelineProps {
  cables: Cable[];
  startDate: Date;
  endDate: Date;
}

export default function UptimeTimeline({ cables, startDate, endDate }: UptimeTimelineProps) {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [segments, setSegments] = useState<{ [cableId: string]: TimelineSegment[] }>({});


  useEffect(() => {
    // Load incidents from JSON file
    fetch('/data/incidents.json')
      .then(response => response.json())
      .then((data: Incident[]) => {
        setIncidents(data);
        
        // Convert incidents to timeline segments
        const newSegments: { [cableId: string]: TimelineSegment[] } = {};
        
        // Initialize all cables as online for the entire period
        cables.forEach(cable => {
          newSegments[cable.id] = [{
            startTime: startDate,
            endTime: endDate,
            status: 'online'
          }];
        });

        // Add offline segments for incidents
        data.forEach(incident => {
          const cableId = incident.cableid;
          if (!newSegments[cableId]) {
            newSegments[cableId] = [{
              startTime: startDate,
              endTime: endDate,
              status: 'online'
            }];
          }

          // Find the online segment that contains this incident
          const onlineSegment = newSegments[cableId].find(seg => 
            seg.status === 'online' && 
            new Date(incident.date) >= seg.startTime && 
            new Date(incident.date) <= seg.endTime
          );

          if (onlineSegment) {
            // Split the online segment into three parts: before, during, and after the incident
            const incidentStart = new Date(incident.date);
            const incidentEnd = incident.resolved_at ? new Date(incident.resolved_at) : endDate;
            
            // Remove the original online segment
            newSegments[cableId] = newSegments[cableId].filter(seg => seg !== onlineSegment);
            
            // Add the three new segments
            if (incidentStart > onlineSegment.startTime) {
              newSegments[cableId].push({
                startTime: onlineSegment.startTime,
                endTime: incidentStart,
                status: 'online'
              });
            }
            
            newSegments[cableId].push({
              startTime: incidentStart,
              endTime: incidentEnd,
              status: incident.status as 'disconnected' | 'partial_disconnected' | 'notice'
            });
            
            if (incidentEnd < onlineSegment.endTime) {
              newSegments[cableId].push({
                startTime: incidentEnd,
                endTime: onlineSegment.endTime,
                status: 'online'
              });
            }
          }
        });

        // Sort segments by start time for each cable
        Object.keys(newSegments).forEach(cableId => {
          newSegments[cableId].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        });

        setSegments(newSegments);
      })
      .catch(error => console.error('Error loading incidents:', error));
  }, [cables, startDate, endDate]);

  const totalDuration = endDate.getTime() - startDate.getTime();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'var(--color-uptime-online)';
      case 'disconnected':
        return 'var(--color-uptime-disconnected)';
      case 'partial_disconnected':
        return 'var(--color-uptime-partial-disconnected)';
      case 'notice':
        return 'var(--color-uptime-notice)';
      default:
        return 'var(--color-uptime-unknown)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online':
        return t('common.online');
      case 'disconnected':
        return t('common.disconnected');
      case 'partial_disconnected':
        return t('common.partial_disconnected');
      case 'notice':
        return t('common.notice');
      default:
        return t('common.unknown');
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (date: Date) => {
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

  return (
    <div className="uptime-timeline">
      <div className="timeline-content">
        <div className="cable-names">
          {cables.map((cable) => (
            <div key={cable.id} className="cable-name">{cable.name}</div>
          ))}
        </div>
        <div className="timeline-rows">
          {cables.map((cable) => (
            <div key={cable.id} className="cable-timeline">
              <div className="timeline-row">
                <div className="timeline-container">
                  <div className="timeline-segments">
                    {(segments[cable.id] || []).map((segment, index) => {
                      const start = ((segment.startTime.getTime() - startDate.getTime()) / totalDuration) * 100;
                      const width = ((segment.endTime.getTime() - segment.startTime.getTime()) / totalDuration) * 100;

                      // Find the corresponding incident for this segment
                      const incident = incidents.find(inc => 
                        inc.cableid === cable.id && 
                        new Date(inc.date).getTime() === segment.startTime.getTime()
                      );

                      return (
                        <div
                          key={index}
                          className="timeline-segment"
                          style={{
                            left: `${start}%`,
                            width: `${width}%`,
                            backgroundColor: getStatusColor(segment.status),
                          }}
                          title={`${getStatusLabel(segment.status)}: ${formatDateTime(segment.startTime)} - ${formatDateTime(segment.endTime)}
${incident ? `Description: ${incident.description}` : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="timeline-axis">
        <span>{formatDate(startDate)}</span>
        <span>{formatDate(new Date(startDate.getTime() + totalDuration / 2))}</span>
        <span>{formatDate(endDate)}</span>
      </div>
    </div>
  );
} 