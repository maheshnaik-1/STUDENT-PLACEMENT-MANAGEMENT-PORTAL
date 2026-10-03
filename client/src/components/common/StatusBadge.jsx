import React from 'react';
import {
  Clock,
  CheckCircle,
  FileCheck2,
  Code2,
  Users2,
  XCircle,
  Calendar,
  PlayCircle,
  CheckCheck,
} from 'lucide-react';

const StatusBadge = ({ status, type = 'application' }) => {
  const getBadgeConfig = () => {
    switch (status) {
      // Application statuses
      case 'Applied':
        return {
          className: 'badge-applied',
          icon: <Clock size={13} />,
          label: 'Applied',
        };
      case 'Shortlisted':
        return {
          className: 'badge-shortlisted',
          icon: <FileCheck2 size={13} />,
          label: 'Shortlisted',
        };
      case 'Technical Round':
        return {
          className: 'badge-technical',
          icon: <Code2 size={13} />,
          label: 'Tech Round',
        };
      case 'Interview':
        return {
          className: 'badge-interview',
          icon: <Users2 size={13} />,
          label: 'Interview',
        };
      case 'Selected':
        return {
          className: 'badge-selected',
          icon: <CheckCircle size={13} />,
          label: 'Selected / Offer',
        };
      case 'Rejected':
        return {
          className: 'badge-rejected',
          icon: <XCircle size={13} />,
          label: 'Not Selected',
        };

      // Drive statuses
      case 'Upcoming':
        return {
          className: 'badge-upcoming',
          icon: <Calendar size={13} />,
          label: 'Upcoming',
        };
      case 'Ongoing':
        return {
          className: 'badge-ongoing',
          icon: <PlayCircle size={13} />,
          label: 'Registration Open',
        };
      case 'Completed':
        return {
          className: 'badge-completed',
          icon: <CheckCheck size={13} />,
          label: 'Drive Completed',
        };
      case 'Cancelled':
        return {
          className: 'badge-rejected',
          icon: <XCircle size={13} />,
          label: 'Cancelled',
        };

      default:
        return {
          className: 'badge-upcoming',
          icon: <Clock size={13} />,
          label: status || 'Pending',
        };
    }
  };

  const { className, icon, label } = getBadgeConfig();

  return (
    <span className={`badge ${className}`}>
      {icon}
      <span>{label}</span>
    </span>
  );
};

export default StatusBadge;
