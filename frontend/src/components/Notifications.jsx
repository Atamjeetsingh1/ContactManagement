import React, { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import './Notifications.css';

const Notifications = ({ onClose, isOpen }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchNotifications();
    }
  }, [isOpen, user]);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        socket.off('notification');
      };
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data } = await notificationsAPI.getAll({ limit: 20 });
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'new_message':
        return '💬';
      case 'new_request':
        return '📝';
      case 'request_accepted':
        return '✅';
      case 'request_viewed':
        return '👁️';
      case 'contact_shared':
        return '📇';
      case 'review_received':
        return '⭐';
      case 'request_completed':
        return '🎉';
      default:
        return '🔔';
    }
  };

  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="notifications-dropdown" ref={dropdownRef}>
      <div className="notifications-header">
        <h3>Notifications</h3>
        {unreadCount > 0 && (
          <button className="mark-all-read-btn" onClick={handleMarkAllRead}>
            Mark all read
          </button>
        )}
      </div>

      <div className="notifications-list">
        {loading ? (
          <div className="notifications-loading">
            <div className="loader-ring" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="notifications-empty">
            <span className="empty-icon">🔔</span>
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map(notification => (
            <div
              key={notification._id}
              className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
              onClick={() => !notification.isRead && handleMarkRead(notification._id)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-time">{formatTime(notification.createdAt)}</div>
              </div>
              {!notification.isRead && <div className="notification-dot" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;
