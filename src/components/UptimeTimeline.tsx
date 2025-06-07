import React from 'react';
import './UptimeTimeline.css';

interface Cable {
  id: string;
  name: string;
}

interface TimelineSegment {
  startTime: Date;
  endTime: Date;
  status: 'online' | 'warning' | 'offline';
}

interface UptimeTimelineProps {
  cables: Cable[];
  segments: { [cableId: string]: TimelineSegment[] };
  startDate: Date;
  endDate: Date;
}

export default function UptimeTimeline({ cables, segments, startDate, endDate }: UptimeTimelineProps) {
  const totalDuration = endDate.getTime() - startDate.getTime();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'var(--color-uptime-online)';
      case 'warning':
        return 'var(--color-uptime-warning)';
      case 'offline':
        return 'var(--color-uptime-offline)';
      default:
        return 'var(--color-uptime-offline)';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online':
        return 'Online';
      case 'warning':
        return 'Warning';
      case 'offline':
        return 'Offline';
      default:
        return 'Unknown';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="uptime-timeline">
      {cables.map((cable) => (
        <div key={cable.id} className="cable-timeline">
          <h3 className="cable-name">{cable.name}</h3>
          <div className="timeline-container">
            <div className="timeline-segments">
              {(segments[cable.id] || []).map((segment, index) => {
                const start = ((segment.startTime.getTime() - startDate.getTime()) / totalDuration) * 100;
                const width = ((segment.endTime.getTime() - segment.startTime.getTime()) / totalDuration) * 100;

                return (
                  <div
                    key={index}
                    className="timeline-segment"
                    style={{
                      left: `${start}%`,
                      width: `${width}%`,
                      backgroundColor: getStatusColor(segment.status),
                    }}
                    title={`${getStatusLabel(segment.status)}: ${segment.startTime.toLocaleTimeString()} - ${segment.endTime.toLocaleTimeString()}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      ))}
      <div className="timeline-axis">
        <span>{formatTime(startDate)}</span>
        <span>{formatTime(new Date(startDate.getTime() + totalDuration / 2))}</span>
        <span>{formatTime(endDate)}</span>
      </div>
    </div>
  );
} 