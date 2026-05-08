import { supabase } from '../lib/supabase'

export const parentalService = {
  getWatchRequests: async (status = 'pending') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: memberData } = await supabase
      .from('family_members')
      .select('group_id, role')
      .eq('user_id', user.id)
      .single()

    if (!memberData) return []

    let query = supabase
      .from('watch_requests')
      .select('*')
      .eq('group_id', memberData.group_id)
      .order('requested_at', { ascending: false })

    if (memberData.role === 'child') {
      query = query.eq('child_user_id', user.id)
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  createWatchRequest: async (movie, groupId) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('watch_requests')
      .insert({
        child_user_id: user.id,
        group_id: groupId,
        movie_id: movie.imdbID,
        movie_type: movie.Type || 'movie',
        movie_title: movie.Title,
        movie_poster: movie.Poster !== 'N/A' ? movie.Poster : null,
        movie_year: movie.Year,
        movie_rating: movie.Rated,
        movie_genre: movie.Genre,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  reviewWatchRequest: async (requestId, status, parentMessage = '') => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('watch_requests')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id,
        parent_message: parentMessage,
      })
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error

    if (status === 'approved' || status === 'denied') {
      const request = data
      await supabase
        .from('notifications')
        .insert({
          user_id: request.child_user_id,
          type: 'request_reviewed',
          title: status === 'approved' ? 'Request Approved' : 'Request Denied',
          message: status === 'approved'
            ? `Your request to watch "${request.movie_title}" has been approved!`
            : parentMessage
              ? `Your request to watch "${request.movie_title}" was denied: ${parentMessage}`
              : `Your request to watch "${request.movie_title}" was denied.`,
          link: `/movie/${request.movie_id}`,
        })
    }

    return data
  },

  getActivityLogs: async (groupId, limit = 50) => {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*, profiles(username, full_name, avatar_url)')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },

  getNotifications: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
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

  markAllNotificationsRead: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    if (error) throw error
  },

  getUnreadNotificationCount: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    if (error) return 0
    return count || 0
  },
}
