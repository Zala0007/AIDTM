'use client';

import { useState } from 'react';
import Icon from '@/components/ui/AppIcon';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  timestamp: string;
  isRead: boolean;
}

interface NotificationIndicatorProps {
  notifications?: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  className?: string;
}

const NotificationIndicator = ({
  notifications = [],
  onNotificationClick,
  onMarkAllRead,
  className = '',
}: NotificationIndicatorProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'error':
        return 'ExclamationCircleIcon';
      case 'warning':
        return 'ExclamationTriangleIcon';
      case 'success':
        return 'CheckCircleIcon';
      default:
        return 'InformationCircleIcon';
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'error':
        return 'text-error';
      case 'warning':
        return 'text-warning';
      case 'success':
        return 'text-success';
      default:
        return 'text-accent';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (onNotificationClick) {
      onNotificationClick(notification);
    }
    setIsOpen(false);
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 rounded-md text-foreground hover:bg-muted transition-smooth focus-ring interactive-lift"
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
      >
        <Icon name="BellIcon" size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-error rounded-full animate-pulse-subtle">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-notification"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-xl z-notification animate-fade-in">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-heading font-semibold text-lg text-foreground">
                Notifications
              </h3>
              {unreadCount > 0 && onMarkAllRead && (
                <button
                  onClick={onMarkAllRead}
                  className="font-caption text-sm text-accent hover:text-accent/80 transition-smooth focus-ring rounded px-2 py-1"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <Icon
                    name="BellSlashIcon"
                    size={48}
                    className="text-muted-foreground mb-3"
                  />
                  <p className="font-body text-sm text-muted-foreground text-center">
                    No notifications at this time
                  </p>
                </div>
              ) : (
                <div className="py-2">
                  {notifications.map((notification) => (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full flex items-start gap-3 px-4 py-3 transition-smooth hover:bg-muted focus-ring ${
                        !notification.isRead ? 'bg-muted/50' : ''
                      }`}
                    >
                      <Icon
                        name={getNotificationIcon(notification.type) as any}
                        size={20}
                        className={`flex-shrink-0 mt-0.5 ${getNotificationColor(notification.type)}`}
                      />
                      <div className="flex-1 text-left">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-body font-medium text-sm text-foreground">
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <span className="flex-shrink-0 w-2 h-2 bg-accent rounded-full mt-1" />
                          )}
                        </div>
                        <p className="font-body text-sm text-muted-foreground mb-1">
                          {notification.message}
                        </p>
                        <span className="font-caption text-xs text-muted-foreground">
                          {notification.timestamp}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationIndicator;