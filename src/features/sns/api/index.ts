import { PaginatedResponse, Post, Comment, Like, Follow, User, Message, Conversation, Notification } from '../types';

const API_BASE = '/api/sns';

export const snsApi = {
  posts: {
    getAll: async (params?: { page?: number; limit?: number }) => {
      const query = new URLSearchParams(params as any).toString();
      const res = await fetch(`${API_BASE}/posts?${query}`);
      if (!res.ok) throw new Error('Failed to fetch posts');
      return res.json() as Promise<PaginatedResponse<Post>>;
    },
    
    getById: async (id: string) => {
      const res = await fetch(`${API_BASE}/posts/${id}`);
      if (!res.ok) throw new Error('Failed to fetch post');
      return res.json() as Promise<Post>;
    },
    
    create: async (data: { content: string; images?: string[] }) => {
      const res = await fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create post');
      return res.json() as Promise<Post>;
    },
    
    update: async (id: string, data: { content: string; images?: string[] }) => {
      const res = await fetch(`${API_BASE}/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update post');
      return res.json() as Promise<Post>;
    },
    
    delete: async (id: string) => {
      const res = await fetch(`${API_BASE}/posts/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete post');
      return res.json();
    },
    
    like: async (id: string) => {
      const res = await fetch(`${API_BASE}/posts/${id}/like`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to like post');
      return res.json() as Promise<Like>;
    },
    
    unlike: async (id: string) => {
      const res = await fetch(`${API_BASE}/posts/${id}/like`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to unlike post');
      return res.json();
    },
  },
  
  comments: {
    getByPost: async (postId: string) => {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments`);
      if (!res.ok) throw new Error('Failed to fetch comments');
      return res.json() as Promise<Comment[]>;
    },
    
    create: async (postId: string, content: string) => {
      const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error('Failed to create comment');
      return res.json() as Promise<Comment>;
    },
    
    delete: async (commentId: string) => {
      const res = await fetch(`${API_BASE}/comments/${commentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete comment');
      return res.json();
    },
  },
  
  users: {
    getProfile: async (username: string) => {
      const res = await fetch(`${API_BASE}/users/${username}`);
      if (!res.ok) throw new Error('Failed to fetch user profile');
      return res.json() as Promise<User>;
    },
    
    follow: async (userId: string) => {
      const res = await fetch(`${API_BASE}/users/${userId}/follow`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Failed to follow user');
      return res.json() as Promise<Follow>;
    },
    
    unfollow: async (userId: string) => {
      const res = await fetch(`${API_BASE}/users/${userId}/follow`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to unfollow user');
      return res.json();
    },
  },
  
  messages: {
    getConversations: async () => {
      const res = await fetch(`${API_BASE}/messages/conversations`);
      if (!res.ok) throw new Error('Failed to fetch conversations');
      return res.json() as Promise<Conversation[]>;
    },
    
    getMessages: async (conversationId: string) => {
      const res = await fetch(`${API_BASE}/messages/conversations/${conversationId}`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json() as Promise<Message[]>;
    },
    
    send: async (recipientId: string, content: string) => {
      const res = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId, content }),
      });
      if (!res.ok) throw new Error('Failed to send message');
      return res.json() as Promise<Message>;
    },
  },
  
  notifications: {
    getAll: async () => {
      const res = await fetch(`${API_BASE}/notifications`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json() as Promise<Notification[]>;
    },
    
    markAsRead: async (id: string) => {
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error('Failed to mark notification as read');
      return res.json();
    },
    
    markAllAsRead: async () => {
      const res = await fetch(`${API_BASE}/notifications/read-all`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error('Failed to mark all notifications as read');
      return res.json();
    },
  },
};