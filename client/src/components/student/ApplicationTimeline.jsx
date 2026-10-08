import React from 'react';
import StatusBadge from '../common/StatusBadge';
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  Sparkles,
  XCircle,
  Calendar,
  Layers,
  Award,
  MessageSquare,
} from 'lucide-react';

const getStatusConfig = (status) => {
  switch (status) {
    case 'Applied':
      return {
        icon: FileCheck2,
        color: '#2563eb',
        bg: '#eff6ff',
        borderColor: '#bfdbfe',
      };
    case 'Shortlisted':
      return {
        icon: CheckCircle2,
        color: '#4f46e5',
        bg: '#eef2ff',
        borderColor: '#c7d2fe',
      };
    case 'Technical Round':
      return {
        icon: Layers,
        color: '#d97706',
        bg: '#fffbeb',
        borderColor: '#fde68a',
      };
    case 'Interview':
      return {
        icon: Calendar,
        color: '#7c3aed',
        bg: '#f5f3ff',
        borderColor: '#ddd6fe',
      };
    case 'Selected':
      return {
        icon: Award,
        color: '#16a34a',
        bg: '#f0fdf4',
        borderColor: '#bbf7d0',
      };
    case 'Rejected':
      return {
        icon: XCircle,
        color: '#dc2626',
        bg: '#fef2f2',
        borderColor: '#fecaca',
      };
    default:
      return {
        icon: Clock,
        color: '#64748b',
        bg: '#f8fafc',
        borderColor: '#e2e8f0',
      };
  }
};

/**
 * Builds chronological timeline steps supporting real statusHistory and legacy fallback
 */
const resolveTimelineEvents = (application) => {
  if (!application) return [];

  // Case 1: Real recorded statusHistory exists
  if (Array.isArray(application.statusHistory) && application.statusHistory.length > 0) {
    const sorted = [...application.statusHistory].sort(
      (a, b) => new Date(a.changedAt || a.createdAt) - new Date(b.changedAt || b.createdAt)
    );

    return sorted.map((entry, idx) => ({
      status: entry.status || 'Applied',
      remarks: entry.remarks || '',
      timestamp: entry.changedAt || application.appliedAt,
      isCurrent: idx === sorted.length - 1,
    }));
  }

  // Case 2: Legacy fallback (No statusHistory recorded)
  const legacyEvents = [
    {
      status: 'Applied',
      remarks: 'Application submitted successfully.',
      timestamp: application.appliedAt || application.createdAt,
      isCurrent: application.status === 'Applied',
    },
  ];

  if (application.status && application.status !== 'Applied') {
    legacyEvents.push({
      status: application.status,
      remarks: application.remarks || '',
      timestamp: application.updatedAt || application.appliedAt,
      isCurrent: true,
    });
  }

  return legacyEvents;
};

const ApplicationTimeline = ({ application }) => {
  if (!application) return null;

  const events = resolveTimelineEvents(application);

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1.25rem',
        marginTop: '1rem',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={16} color="#2563eb" />
          <span
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: '#1e293b',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Application Lifecycle Timeline
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {events.length} Recorded Stage{events.length > 1 ? 's' : ''}
        </span>
      </div>

      <div style={{ position: 'relative', paddingLeft: '1.75rem' }}>
        {/* Continuous vertical line connecting timeline nodes */}
        {events.length > 1 && (
          <div
            style={{
              position: 'absolute',
              left: '11px',
              top: '12px',
              bottom: '16px',
              width: '2px',
              background: '#e2e8f0',
              zIndex: 0,
            }}
          />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {events.map((event, idx) => {
            const config = getStatusConfig(event.status);
            const Icon = config.icon;

            return (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {/* Node icon bullet */}
                <div
                  style={{
                    position: 'absolute',
                    left: '-1.75rem',
                    top: '0',
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: config.bg,
                    border: `2px solid ${config.color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: event.isCurrent ? `0 0 0 4px ${config.bg}` : 'none',
                  }}
                >
                  <Icon size={12} color={config.color} />
                </div>

                {/* Event Content Container */}
                <div
                  style={{
                    background: event.isCurrent ? '#f8fafc' : '#ffffff',
                    border: `1px solid ${event.isCurrent ? config.borderColor : '#f1f5f9'}`,
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '0.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <StatusBadge status={event.status} />
                      {event.isCurrent && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '999px',
                            background: '#dbeafe',
                            color: '#1e40af',
                            textTransform: 'uppercase',
                          }}
                        >
                          Current Status
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {event.timestamp
                        ? new Date(event.timestamp).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Date not recorded'}
                    </div>
                  </div>

                  {/* Stage Feedback / Remarks */}
                  {event.remarks && event.remarks.trim() ? (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#334155',
                        marginTop: '0.4rem',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '0.35rem',
                        background: '#ffffff',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <MessageSquare
                        size={13}
                        color="#64748b"
                        style={{ flexShrink: 0, marginTop: '2px' }}
                      />
                      <span>{event.remarks}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ApplicationTimeline;
