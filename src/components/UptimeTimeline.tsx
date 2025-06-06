import React from 'react';
import './UptimeTimeline.css';

interface TimelineSegment {
  startTime: Date;
  endTime: Date;
  status: 'online' | 'warning' | 'offline';
}

interface UptimeTimelineProps {
  segments: TimelineSegment[];
  startDate: Date;
  endDate: Date;
}

export default function UptimeTimeline({ segments, startDate, endDate }: UptimeTimelineProps) {
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

  return (
    <div className="uptime-timeline">
      <div className="timeline-container">
        <div className="timeline-segments">
          {segments.map((segment, index) => {
            const start = ((segment.startTime.getTime() - startDate.getTime()) / totalDuration) * 100;
            const width = ((segment.endTime.getTime() - segment.startTime.getTime()) / totalDuration) * 100;
            
            return (
              <div
                key={index}
                className="timeline-segment"
                style={{
                  left: `${start}%`,
                  width: `${width}%`,
                  backgroundColor: getStatusColor(segment.status)
                }}
                title={`${getStatusLabel(segment.status)}: ${segment.startTime.toLocaleTimeString()} - ${segment.endTime.toLocaleTimeString()}`}
              />
            );
          })}
        </div>
      </div>

      <div className="timeline-legend">
        <div className="legend-item">
          <div className="legend-color online"></div>
          <span className="legend-label">Online</span>
        </div>
        <div className="legend-item">
          <div className="legend-color warning"></div>
          <span className="legend-label">Warning</span>
        </div>
        <div className="legend-item">
          <div className="legend-color offline"></div>
          <span className="legend-label">Offline</span>
        </div>
      </div>

      <div className="timeline-range">
        <span>{startDate.toLocaleTimeString()}</span>
        <span>{endDate.toLocaleTimeString()}</span>
      </div>

      <div className="status-summary">
        <h3 className="summary-title">Status Summary</h3>
        <div className="summary-content">
          {segments.map((segment, index) => {
            const duration = segment.endTime.getTime() - segment.startTime.getTime();
            const minutes = Math.floor(duration / (1000 * 60));
            
            return (
              <div key={index} className="summary-item">
                <span className="summary-status">{getStatusLabel(segment.status)}</span>
                <span className="summary-duration">{minutes} minutes</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 