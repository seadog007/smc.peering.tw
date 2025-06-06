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
        return 'bg-uptime-online';
      case 'warning':
        return 'bg-uptime-warning';
      case 'offline':
        return 'bg-uptime-offline';
      default:
        return 'bg-gray-300';
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
        return status;
    }
  };

  return (
    <div className="space-y-4 text-gray-900">
      {/* Timeline */}
      <div className="timeline-container">
        <div className="flex h-full gap-1">
          {segments.map((segment, index) => {
            const segmentDuration = segment.endTime.getTime() - segment.startTime.getTime();
            const width = (segmentDuration / totalDuration) * 100;
            
            return (
              <div
                key={index}
                className={`timeline-segment ${getStatusColor(segment.status)}`}
                style={{ width: `${width}%` }}
                title={`${getStatusLabel(segment.status)}: ${segment.startTime.toLocaleString()} - ${segment.endTime.toLocaleString()}`}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-uptime-online"></div>
          <span className="text-sm text-gray-700">Online</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-uptime-warning"></div>
          <span className="text-sm text-gray-700">Warning</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-uptime-offline"></div>
          <span className="text-sm text-gray-700">Offline</span>
        </div>
      </div>

      {/* Time Range */}
      <div className="flex justify-between text-sm text-gray-600">
        <span>{startDate.toLocaleString()}</span>
        <span>{endDate.toLocaleString()}</span>
      </div>

      {/* Status Summary */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2 text-gray-900">Status Summary</h3>
        <div className="space-y-2">
          {segments.map((segment, index) => {
            const duration = segment.endTime.getTime() - segment.startTime.getTime();
            const minutes = Math.round(duration / (1000 * 60));
            
            return (
              <div key={index} className="flex justify-between items-center">
                <span className={`font-medium text-white ${getStatusColor(segment.status)} px-2 py-1 rounded`}>
                  {getStatusLabel(segment.status)}
                </span>
                <span className="text-gray-700">
                  {minutes} minutes
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
} 