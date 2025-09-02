import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as Tooltip from '@radix-ui/react-tooltip';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { BarChart3, Calendar, Clock, Grid } from 'lucide-react';
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

type ViewMode = 'timeline' | 'heatmap';

export default function UptimeTimeline({ cables, startDate, endDate }: UptimeTimelineProps) {
  const { t } = useTranslation();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [segments, setSegments] = useState<Record<string, TimelineSegment[]>>({});
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [selectedCable, setSelectedCable] = useState<string | null>(null);

  useEffect(() => {
    fetch('/data/incidents.json')
      .then((response) => response.json())
      .then((data: Incident[]) => {
        setIncidents(data);

        const newSegments: Record<string, TimelineSegment[]> = {};

        cables.forEach((cable) => {
          newSegments[cable.id] = [{
            startTime: startDate,
            endTime: endDate,
            status: 'online',
          }];
        });

        // Add offline segments for incidents
        data.forEach((incident) => {
          const cableId = incident.cableid;
          if (!newSegments[cableId]) {
            newSegments[cableId] = [{
              startTime: startDate,
              endTime: endDate,
              status: 'online',
            }];
          }

          const onlineSegment = newSegments[cableId].find((seg) =>
            seg.status === 'online'
            && new Date(incident.date) >= seg.startTime
            && new Date(incident.date) <= seg.endTime,
          );

          if (onlineSegment) {
            const incidentStart = new Date(incident.date);
            const incidentEnd = incident.resolved_at ? new Date(incident.resolved_at) : endDate;

            newSegments[cableId] = newSegments[cableId].filter((seg) => seg !== onlineSegment);

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
              status: incident.status as 'disconnected' | 'partial_disconnected' | 'notice',
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

        Object.keys(newSegments).forEach((cableId) => {
          newSegments[cableId].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
        });

        setSegments(newSegments);
      })
      .catch((error) => console.error('Error loading incidents:', error));
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
      year: 'numeric',
    });
  };

  const formatDateTime = (date: Date) => {
    const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(isMidnight
        ? {}
        : {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }),
    });
  };

  const generateCalendarData = () => {
    if (!selectedCable) return [];

    const cableSegments = segments[selectedCable] || [];
    const months = [];

    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= end) {
      const year = current.getFullYear();
      const month = current.getMonth();

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const firstDayOfWeek = firstDay.getDay();

      const days = [];

      for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(null);
      }

      for (let day = 1; day <= lastDay.getDate(); day++) {
        const date = new Date(year, month, day);
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        let dayStatus = 'online';
        const dayIncidents: Incident[] = [];

        if (date >= startDate && date <= endDate) {
          for (const segment of cableSegments) {
            if (segment.startTime <= dayEnd && segment.endTime >= dayStart) {
              if (segment.status === 'disconnected') {
                dayStatus = 'disconnected';
              }
              else if (segment.status === 'partial_disconnected' && dayStatus !== 'disconnected') {
                dayStatus = 'partial_disconnected';
              }
              else if (segment.status === 'notice' && dayStatus === 'online') {
                dayStatus = 'notice';
              }

              const dayIncident = incidents.filter((incident) =>
                incident.cableid === selectedCable
                && new Date(incident.date) >= dayStart
                && new Date(incident.date) <= dayEnd,
              );
              dayIncidents.push(...dayIncident);
            }
          }
        }
        else {
          dayStatus = 'outside-range';
        }

        days.push({
          date,
          status: dayStatus,
          incidents: dayIncidents,
        });
      }

      months.push({
        year,
        month,
        monthName: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        days,
      });

      current.setMonth(current.getMonth() + 1);
    }

    return months;
  };

  const calendarData = generateCalendarData();

  return (
    <Tooltip.Provider>
      <div className="uptime-timeline">
        <div className="timeline-controls-bar">
          <div className="view-mode-switch">
            <button
              className={`mode-button ${viewMode === 'timeline' ? 'active' : ''}`}
              onClick={() => setViewMode('timeline')}
              title="Timeline View"
            >
              <BarChart3 size={16} />
              Timeline
            </button>
            <button
              className={`mode-button ${viewMode === 'heatmap' ? 'active' : ''}`}
              onClick={() => setViewMode('heatmap')}
              title="Calendar Heatmap"
            >
              <Grid size={16} />
              Heatmap
            </button>
          </div>
          {viewMode === 'heatmap' && (
            <select
              className="cable-selector"
              value={selectedCable || ''}
              onChange={(e) => setSelectedCable(e.target.value || null)}
            >
              <option value="">Select Cable</option>
              {cables.map((cable) => (
                <option key={cable.id} value={cable.id}>
                  {cable.name}
                </option>
              ))}
            </select>
          )}
          <div className="timeline-period">
            <Calendar className="timeline-period-icon" />
            <span>
              {formatDate(startDate)}
              {' '}
              -
              {' '}
              {formatDate(endDate)}
            </span>
          </div>
        </div>

        <div className="timeline-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getStatusColor('online') }} />
            <span>{getStatusLabel('online')}</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getStatusColor('disconnected') }} />
            <span>{getStatusLabel('disconnected')}</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getStatusColor('partial_disconnected') }} />
            <span>{getStatusLabel('partial_disconnected')}</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: getStatusColor('notice') }} />
            <span>{getStatusLabel('notice')}</span>
          </div>
        </div>

        {viewMode === 'timeline'
          ? (
              <>
                <ScrollArea.Root className="timeline-scroll-area">
                  <ScrollArea.Viewport className="timeline-viewport">
                    <div className="timeline-content">
                      <div className="cable-names">
                        {cables.map((cable) => (
                          <div key={cable.id} className="cable-name">
                            <span className="cable-name-text">{cable.name}</span>
                            <span className="cable-id">
                              (
                              {cable.id.toUpperCase()}
                              )
                            </span>
                          </div>
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

                                    const incident = incidents.find((inc) =>
                                      inc.cableid === cable.id
                                      && new Date(inc.date).getTime() === segment.startTime.getTime(),
                                    );

                                    const duration = segment.endTime.getTime() - segment.startTime.getTime();
                                    const durationDays = Math.ceil(duration / (1000 * 60 * 60 * 24));

                                    return (
                                      <Tooltip.Root key={index}>
                                        <Tooltip.Trigger asChild>
                                          <div
                                            className={`timeline-segment timeline-segment-${segment.status}`}
                                            style={{
                                              left: `${start}%`,
                                              width: `${width}%`,
                                              backgroundColor: getStatusColor(segment.status),
                                            }}
                                          />
                                        </Tooltip.Trigger>
                                        <Tooltip.Portal>
                                          <Tooltip.Content className="timeline-tooltip" sideOffset={5}>
                                            <div className="tooltip-content">
                                              <div className="tooltip-header">
                                                <div className="tooltip-status">
                                                  <div
                                                    className="tooltip-status-indicator"
                                                    style={{ backgroundColor: getStatusColor(segment.status) }}
                                                  />
                                                  {getStatusLabel(segment.status)}
                                                </div>
                                                <span className="tooltip-duration">
                                                  {durationDays}
                                                  {' '}
                                                  days
                                                </span>
                                              </div>
                                              <div className="tooltip-period">
                                                <Clock className="tooltip-icon" />
                                                <span>
                                                  {formatDateTime(segment.startTime)}
                                                  {' '}
                                                  -
                                                  {' '}
                                                  {formatDateTime(segment.endTime)}
                                                </span>
                                              </div>
                                              {incident && (
                                                <div className="tooltip-description">
                                                  <p>{incident.description}</p>
                                                </div>
                                              )}
                                            </div>
                                            <Tooltip.Arrow className="timeline-tooltip-arrow" />
                                          </Tooltip.Content>
                                        </Tooltip.Portal>
                                      </Tooltip.Root>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </ScrollArea.Viewport>
                  <ScrollArea.Scrollbar className="timeline-scrollbar" orientation="horizontal">
                    <ScrollArea.Thumb className="timeline-scroll-thumb" />
                  </ScrollArea.Scrollbar>
                </ScrollArea.Root>

                <div className="timeline-axis">
                  <span className="axis-label">{formatDate(startDate)}</span>
                  <span className="axis-label axis-label-middle">{formatDate(new Date(startDate.getTime() + totalDuration / 2))}</span>
                  <span className="axis-label">{formatDate(endDate)}</span>
                </div>
              </>
            )
          : (
              <ScrollArea.Root className="timeline-scroll-area">
                <ScrollArea.Viewport className="timeline-viewport">
                  <div className="heatmap-content">
                    {selectedCable
                      ? (
                          <>
                            <div className="heatmap-header">
                              <h4 className="heatmap-cable-name">
                                {cables.find((c) => c.id === selectedCable)?.name}
                                {' '}
                                (
                                {selectedCable.toUpperCase()}
                                )
                              </h4>
                            </div>
                            <div className="calendar-months">
                              {calendarData.map((monthData, monthIndex) => (
                                <div key={monthIndex} className="calendar-month">
                                  <h5 className="month-header">{monthData.monthName}</h5>
                                  <div className="calendar-weekdays">
                                    <div className="weekday-header">Sun</div>
                                    <div className="weekday-header">Mon</div>
                                    <div className="weekday-header">Tue</div>
                                    <div className="weekday-header">Wed</div>
                                    <div className="weekday-header">Thu</div>
                                    <div className="weekday-header">Fri</div>
                                    <div className="weekday-header">Sat</div>
                                  </div>
                                  <div className="calendar-grid">
                                    {monthData.days.map((day, dayIndex) => (
                                      <div key={dayIndex} className="calendar-cell">
                                        {day
                                          ? (
                                              <Tooltip.Root>
                                                <Tooltip.Trigger asChild>
                                                  <div
                                                    className={`calendar-day calendar-day-${day.status}`}
                                                    style={{
                                                      backgroundColor: day.status === 'outside-range'
                                                        ? 'rgba(107, 114, 128, 0.3)'
                                                        : getStatusColor(day.status),
                                                    }}
                                                  >
                                                    <span className="day-number">{day.date.getDate()}</span>
                                                  </div>
                                                </Tooltip.Trigger>
                                                <Tooltip.Portal>
                                                  <Tooltip.Content className="timeline-tooltip" sideOffset={5}>
                                                    <div className="tooltip-content">
                                                      <div className="tooltip-header">
                                                        <div className="tooltip-status">
                                                          <div
                                                            className="tooltip-status-indicator"
                                                            style={{
                                                              backgroundColor: day.status === 'outside-range'
                                                                ? 'rgba(107, 114, 128, 0.5)'
                                                                : getStatusColor(day.status),
                                                            }}
                                                          />
                                                          {day.status === 'outside-range' ? 'Out of Range' : getStatusLabel(day.status)}
                                                        </div>
                                                      </div>
                                                      <div className="tooltip-period">
                                                        <Calendar className="tooltip-icon" />
                                                        <span>{day.date.toLocaleDateString()}</span>
                                                      </div>
                                                      {day.incidents.length > 0 && (
                                                        <div className="tooltip-description">
                                                          {day.incidents.map((incident, i) => (
                                                            <p key={i}>{incident.description}</p>
                                                          ))}
                                                        </div>
                                                      )}
                                                    </div>
                                                    <Tooltip.Arrow className="timeline-tooltip-arrow" />
                                                  </Tooltip.Content>
                                                </Tooltip.Portal>
                                              </Tooltip.Root>
                                            )
                                          : (
                                              <div className="calendar-day-empty"></div>
                                            )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )
                      : (
                          <div className="heatmap-placeholder">
                            <p>Please select a cable to view its calendar heatmap</p>
                          </div>
                        )}
                  </div>
                </ScrollArea.Viewport>
              </ScrollArea.Root>
            )}
      </div>
    </Tooltip.Provider>
  );
}
