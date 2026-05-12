import { supabase } from '../lib/supabase'

export const parentalService = {
  getFamilyMembership: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('family_members')
      .select('id,user_id,family_group_id,role,created_at')
      .eq('user_id', user.id)
      .limit(1)

    if (error) throw error
    return data?.[0] || null
  },

  getWatchRequests: async (groupId) => {
    if (!groupId) return []
    const { data, error } = await supabase
      .from('watch_requests')
      .select('*')
      .eq('group_id', groupId)
      .order('requested_at', { ascending: false })
    if (error) throw error
    return data || []
  },

  createWatchRequest: async (request) => {
    const { data, error } = await supabase
      .from('watch_requests')
      .insert(request)
      .select()
      .single()
    if (error) throw error
    return data
  },

  reviewWatchRequest: async (requestId, status, reviewedBy, parentMessage = null) => {
    const { data, error } = await supabase
      .from('watch_requests')
      .update({
        status,
        reviewed_by: reviewedBy,
        reviewed_at: new Date().toISOString(),
        parent_message: parentMessage,
      })
      .eq('id', requestId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  getActivityLogs: async (groupId) => {
    if (!groupId) return []
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return data || []
  },

  logActivity: async (userId, groupId, action, details = {}) => {
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: userId,
        group_id: groupId,
        action,
        details,
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  getNotifications: async (userId) => {
    if (!userId) return []
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data || []
  },

  markNotificationRead: async (notificationId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
    if (error) throw error
  },

  markAllNotificationsRead: async (userId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    if (error) throw error
  },

  getUnreadNotificationCount: async (userId) => {
    if (!userId) return 0
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    if (error) throw error
    return count || 0
  },

  createNotification: async (notification) => {
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
