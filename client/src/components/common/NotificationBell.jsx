import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  Award,
  Calendar,
  XCircle,
  FileText,
  Briefcase,
  Info,
  ExternalLink,
  Code2,
  Loader2,
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/**
 * Format timestamp into relative time string
 */
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
};

/**
 * Get icon and colors for each notification type
 */
const getNotificationTypeConfig = (type) => {
  switch (type) {
    case 'SELECTED':
      return {
        icon: <CheckCircle2 size={18} />,
        bgColor: '#ecfdf5',
        color: '#059669',
        borderColor: '#a7f3d0',
      };
    case 'SHORTLISTED':
      return {
        icon: <Award size={18} />,
        bgColor: '#eef2ff',
        color: '#4f46e5',
        borderColor: '#c7d2fe',
      };
    case 'TECHNICAL_ROUND':
      return {
        icon: <Code2 size={18} />,
        bgColor: '#f5f3ff',
        color: '#7c3aed',
        borderColor: '#ddd6fe',
      };
    case 'INTERVIEW':
      return {
        icon: <Calendar size={18} />,
        bgColor: '#fffbeb',
        color: '#d97706',
        borderColor: '#fde68a',
      };
    case 'REJECTED':
      return {
        icon: <XCircle size={18} />,
        bgColor: '#fef2f2',
        color: '#dc2626',
        borderColor: '#fecaca',
      };
    case 'APPLICATION_SUBMITTED':
      return {
        icon: <FileText size={18} />,
        bgColor: '#eff6ff',
        color: '#2563eb',
        borderColor: '#bfdbfe',
      };
    case 'DRIVE_UPDATE':
      return {
        icon: <Briefcase size={18} />,
        bgColor: '#f0fdfa',
        color: '#0d9488',
        borderColor: '#99f6e4',
      };
    default:
      return {
        icon: <Info size={18} />,
        bgColor: '#f1f5f9',
        color: '#475569',
        borderColor: '#cbd5e1',
      };
  }
};

const NotificationBell = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  // Context-aware dropdown positioning anchored to the notification bell:
  // 1. Anchor dropdown directly beneath the bell with an 8px offset.
  // 2. Maximum width approximately 380px (never overflowing viewport).
  // 3. Height constrained by remaining viewport space so header stays visible and list scrolls.
  // 4. On desktop, anchor to bell's right edge if bell is on the right; anchor to bell's left edge
  //    if bell is near left edge or navbar wrapped. Safely clamp within [margin, viewport - margin].
  // 5. On mobile (<=640px), center horizontally with consistent 16px side margins.
  const calculateDropdownPosition = useCallback(() => {
    if (typeof window === 'undefined') {
      return {};
    }

    const bellBtn = buttonRef.current || containerRef.current;
    if (!bellBtn) {
      return {
        position: 'fixed',
        top: '64px',
        right: '16px',
        width: 'min(380px, calc(100vw - 32px))',
        maxWidth: '380px',
      };
    }

    const bellRect = bellBtn.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 16;
    const panelWidth = Math.min(380, viewportWidth - margin * 2);

    // Position directly below bell
    const top = bellRect && bellRect.bottom > 0 ? Math.round(bellRect.bottom + 8) : 64;

    // Height constrained to available vertical space below top
    const maxAvailableHeight = Math.max(200, viewportHeight - top - margin);
    const maxHeight = Math.min(480, maxAvailableHeight);

    // Mobile (<=640px): Centered horizontally with consistent 16px side margins
    if (viewportWidth <= 640) {
      return {
        position: 'fixed',
        top: `${top}px`,
        left: `${margin}px`,
        right: `${margin}px`,
        margin: '0 auto',
        maxWidth: `${panelWidth}px`,
        maxHeight: `${maxHeight}px`,
        width: 'auto',
      };
    }

    // Desktop (>640px): Context-aware anchor to notification bell
    const bellCenter = bellRect.left + bellRect.width / 2;
    const isRightHalf = bellCenter > viewportWidth / 2;

    const rightAlignedLeft = Math.round(bellRect.right - panelWidth);
    const leftAlignedLeft = Math.round(bellRect.left);

    let left;
    if (isRightHalf) {
      // Bell is on the right side: prefer anchoring to bell's right edge
      if (rightAlignedLeft >= margin) {
        left = rightAlignedLeft;
      } else if (leftAlignedLeft + panelWidth <= viewportWidth - margin) {
        left = leftAlignedLeft;
      } else {
        left = margin;
      }
    } else {
      // Bell is on the left side (or navbar wrapped): prefer anchoring to bell's left edge
      if (leftAlignedLeft + panelWidth <= viewportWidth - margin) {
        left = leftAlignedLeft;
      } else if (rightAlignedLeft >= margin) {
        left = rightAlignedLeft;
      } else {
        left = viewportWidth - margin - panelWidth;
      }
    }

    // Clamp strictly within viewport margins
    left = Math.max(margin, Math.min(viewportWidth - margin - panelWidth, Math.round(left)));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      right: 'auto',
      width: `${panelWidth}px`,
      maxWidth: '380px',
      maxHeight: `${maxHeight}px`,
      margin: '0',
    };
  }, []);

  // Fetch unread count & recent notifications
  const fetchNotificationData = useCallback(
    async (isBackground = false) => {
      if (!isAuthenticated) return;

      if (!isBackground) setLoading(true);
      try {
        const [resList, resCount] = await Promise.all([
          api.notifications.getAll({ limit: 30 }),
          api.notifications.getUnreadCount(),
        ]);

        if (resList?.success && Array.isArray(resList.data)) {
          setNotifications(resList.data);
        }
        if (resCount?.success && typeof resCount.count === 'number') {
          setUnreadCount(resCount.count);
        } else if (typeof resList?.unreadCount === 'number') {
          setUnreadCount(resList.unreadCount);
        }
      } catch (err) {
        // Silently handle error for background checks
        if (!isBackground) {
          console.error('Failed to fetch notifications:', err.message);
        }
      } finally {
        if (!isBackground) setLoading(false);
      }
    },
    [isAuthenticated]
  );

  // Initial load and periodic polling (every 30 seconds)
  useEffect(() => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotificationData(false);

    const interval = setInterval(() => {
      fetchNotificationData(true);
    }, 30000);

    // Refresh immediately when window gains focus
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotificationData(true);
      }
    };

    const handleCustomUpdate = () => {
      fetchNotificationData(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('notification-updated', handleCustomUpdate);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('notification-updated', handleCustomUpdate);
    };
  }, [isAuthenticated, fetchNotificationData]);

  // Reposition dropdown whenever opened, or when window resizes/scrolls
  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const newStyle = calculateDropdownPosition();
      setDropdownStyle((prev) => {
        if (
          prev.position === newStyle.position &&
          prev.top === newStyle.top &&
          prev.left === newStyle.left &&
          prev.right === newStyle.right &&
          prev.width === newStyle.width &&
          prev.maxWidth === newStyle.maxWidth &&
          prev.maxHeight === newStyle.maxHeight &&
          prev.margin === newStyle.margin
        ) {
          return prev;
        }
        return newStyle;
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, calculateDropdownPosition]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Toggle dropdown open/close
  const toggleDropdown = () => {
    if (!isOpen) {
      setDropdownStyle(calculateDropdownPosition());
      fetchNotificationData(false);
    }
    setIsOpen((prev) => !prev);
  };

  // Mark single notification as read & optionally navigate
  const handleItemClick = async (item) => {
    // Optimistically update local read state
    if (!item.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await api.notifications.markAsRead(item._id);
      } catch (err) {
        console.error('Error marking notification as read:', err.message);
      }
    }

    setIsOpen(false);

    if (item.link) {
      navigate(item.link);
    }
  };

  // Mark all notifications as read
  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    if (markingAll || unreadCount === 0) return;

    setMarkingAll(true);
    // Optimistically mark all read
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    try {
      await api.notifications.markAllAsRead();
    } catch (err) {
      console.error('Error marking all as read:', err.message);
      // Re-fetch on error to ensure accurate state
      fetchNotificationData(true);
    } finally {
      setMarkingAll(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="notification-bell-container" ref={containerRef}>
      {/* Bell Button */}
      <button
        ref={buttonRef}
        type="button"
        className={`notification-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={toggleDropdown}
        title="Notifications"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell size={19} className="bell-icon" />
        {unreadCount > 0 && (
          <span className="notification-badge-count">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="notification-dropdown" style={dropdownStyle}>
          {/* Header */}
          <div className="notification-dropdown-header">
            <div className="header-title-area">
              <span className="header-title">Notifications</span>
              {unreadCount > 0 && (
                <span className="unread-pill">{unreadCount} new</span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                className="mark-all-read-btn"
                onClick={handleMarkAllRead}
                disabled={markingAll}
              >
                <CheckCheck size={14} />
                <span>{markingAll ? 'Marking...' : 'Mark all as read'}</span>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="notification-dropdown-body">
            {loading ? (
              <div className="notification-loading-state">
                <Loader2 size={24} className="spinning-loader" />
                <span>Loading notifications...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty-state">
                <div className="empty-state-icon">
                  <Bell size={28} />
                </div>
                <div className="empty-state-title">No notifications yet</div>
                <div className="empty-state-desc">
                  You're all caught up! Updates regarding placement drives and applications will appear here.
                </div>
              </div>
            ) : (
              <ul className="notification-list">
                {notifications.map((item) => {
                  const typeConfig = getNotificationTypeConfig(item.type);
                  return (
                    <li
                      key={item._id}
                      className={`notification-item ${item.isRead ? 'read' : 'unread'}`}
                      onClick={() => handleItemClick(item)}
                    >
                      {/* Left Type Icon */}
                      <div
                        className="notif-type-icon-wrapper"
                        style={{
                          backgroundColor: typeConfig.bgColor,
                          color: typeConfig.color,
                          borderColor: typeConfig.borderColor,
                        }}
                      >
                        {typeConfig.icon}
                      </div>

                      {/* Content Area */}
                      <div className="notif-content-area">
                        <div className="notif-header-row">
                          <span className="notif-item-title">{item.title}</span>
                          {!item.isRead && <span className="notif-unread-dot" />}
                        </div>
                        <p className="notif-item-message">{item.message}</p>
                        <div className="notif-footer-row">
                          <span className="notif-timestamp">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                          {item.link && (
                            <span className="notif-view-link">
                              View details <ExternalLink size={11} />
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
