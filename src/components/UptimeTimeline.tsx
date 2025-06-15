import { useTranslation } from 'react-i18next';
import { useIncidents } from '../hooks/useIncidents';
import { useTimelineSegments } from '../hooks/useTimelineSegments';
import './UptimeTimeline.css';

interface Cable {
  id: string;
  name: string;
}

interface UptimeTimelineProps {
  cables: Cable[];
  startDate: Date;
  endDate: Date;
}

export default function UptimeTimeline({ cables, startDate, endDate }: UptimeTimelineProps) {
  const { t } = useTranslation();
  const incidents = useIncidents();
  const segments = useTimelineSegments({ cables, incidents, startDate, endDate });

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