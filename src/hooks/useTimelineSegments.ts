import { useMemo } from 'react';

export interface TimelineSegment {
  startTime: Date;
  endTime: Date;
  status: 'online' | 'disconnected' | 'partial_disconnected' | 'notice';
}

export interface Incident {
  date: string;
  status: string;
  cableid: string;
  segment: string;
  description: string;
  resolved_at?: string;
}

export interface UseTimelineSegmentsProps {
  cables: { id: string }[];
  incidents: Incident[];
  startDate: Date;
  endDate: Date;
}

export function useTimelineSegments({ cables, incidents, startDate, endDate }: UseTimelineSegmentsProps) {
  return useMemo(() => {
    const newSegments: { [cableId: string]: TimelineSegment[] } = {};

    // Initialize all cables as online for the entire period
    cables.forEach(cable => {
      newSegments[cable.id] = [{
        startTime: startDate,
        endTime: endDate,
        status: 'online',
      }];
    });

    // Add offline segments for incidents
    incidents.forEach(incident => {
      const cableId = incident.cableid;
      if (!newSegments[cableId]) {
        newSegments[cableId] = [{
          startTime: startDate,
          endTime: endDate,
          status: 'online',
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
            status: 'online',
          });
        }
        newSegments[cableId].push({
          startTime: incidentStart,
          endTime: incidentEnd,
          status: incident.status as TimelineSegment['status'],
        });
        if (incidentEnd < onlineSegment.endTime) {
          newSegments[cableId].push({
            startTime: incidentEnd,
            endTime: onlineSegment.endTime,
            status: 'online',
          });
        }
      }
    });
    // Sort segments by start time for each cable
    Object.keys(newSegments).forEach(cableId => {
      newSegments[cableId].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    });
    return newSegments;
  }, [cables, incidents, startDate, endDate]);
}
