import { createContext, useContext, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const NotificationsContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationsContext);
  if (!context) throw new Error('useNotifications must be used within a NotificationsProvider');
  return context;
};

async function fetchNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data || [];
}

async function fetchUnreadCount(userId) {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
  return count || 0;
}

export const NotificationsProvider = ({ children }) => {
  const { user, session } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: () => fetchNotifications(user.id),
    enabled: !!user,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notificationsUnread', user?.id],
    queryFn: () => fetchUnreadCount(user.id),
    enabled: !!user,
  });

  useEffect(() => {
    if (!user?.id || !session?.access_token) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData(['notifications', user.id], (old = []) => {
            return [payload.new, ...old];
          });
          queryClient.setQueryData(['notificationsUnread', user.id], (old = 0) => old + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.setQueryData(['notifications', user.id], (old = []) => {
            return old.map(n => n.id === payload.new.id ? payload.new : n);
          });
          if (payload.new.is_read && !payload.old.is_read) {
            queryClient.setQueryData(['notificationsUnread', user.id], (old = 0) => Math.max(0, old - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, session?.access_token, queryClient]);

  const markReadMutation = useMutation({
    mutationFn: async (notificationId) => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      const previousNotifications = queryClient.getQueryData(['notifications', user?.id]);
      queryClient.setQueryData(['notifications', user?.id], (old = []) =>
        old.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      queryClient.setQueryData(['notificationsUnread', user?.id], (old = 0) => Math.max(0, old - 1));
      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      queryClient.setQueryData(['notifications', user?.id], context.previousNotifications);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      const previousNotifications = queryClient.getQueryData(['notifications', user?.id]);
      queryClient.setQueryData(['notifications', user?.id], (old = []) =>
        old.map(n => ({ ...n, is_read: true }))
      );
      queryClient.setQueryData(['notificationsUnread', user?.id], 0);
      return { previousNotifications };
    },
    onError: (err, variables, context) => {
      queryClient.setQueryData(['notifications', user?.id], context.previousNotifications);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (notificationId) => {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
    },
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', user?.id] });
      const previousNotifications = queryClient.getQueryData(['notifications', user?.id]);
      const notification = previousNotifications?.find(n => n.id === notificationId);
      queryClient.setQueryData(['notifications', user?.id], (old = []) =>
        old.filter(n => n.id !== notificationId)
      );
      if (notification && !notification.is_read) {
        queryClient.setQueryData(['notificationsUnread', user?.id], (old = 0) => Math.max(0, old - 1));
      }
      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      queryClient.setQueryData(['notifications', user?.id], context.previousNotifications);
    },
  });

  const markRead = useCallback(
    (notificationId) => markReadMutation.mutate(notificationId),
    [markReadMutation]
  );

  const markAllRead = useCallback(
    () => markAllReadMutation.mutate(),
    [markAllReadMutation]
  );

  const deleteNotification = useCallback(
    (notificationId) => deleteMutation.mutate(notificationId),
    [deleteMutation]
  );

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markRead,
        markAllRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};
