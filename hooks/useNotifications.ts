import { useState, useEffect, useCallback } from 'react';

export interface Notification {
  _id: string;
  type: 'follow' | 'like' | 'comment';
  fromUserId: {
    _id: string;
    username: string;
    profileImage?: string;
  };
  postId?: {
    _id: string;
    title: string;
  };
  message: string;
  read: boolean;
  createdAt: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (unreadOnly) params.append('unread', 'true');
      
      const response = await fetch(`/api/notifications?${params}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (notificationIds?: string[]) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          notificationIds,
          markAllRead: !notificationIds,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount);
        
        if (notificationIds) {
          setNotifications(prev =>
            prev.map(n =>
              notificationIds.includes(n._id) ? { ...n, read: true } : n
            )
          );
        } else {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();

    const eventSource = new EventSource('/api/notifications/sse', {
      withCredentials: true,
    });

    eventSource.onopen = () => {
      setSseConnected(true);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'update') {
        setUnreadCount(data.unreadCount);
        if (data.notifications && data.notifications.length > 0) {
          setNotifications(data.notifications);
        }
      }
    };

    eventSource.onerror = () => {
      setSseConnected(false);
      eventSource.close();
      
      setTimeout(() => {
        fetchNotifications();
      }, 5000);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    sseConnected,
    fetchNotifications,
    markAsRead,
  };
};