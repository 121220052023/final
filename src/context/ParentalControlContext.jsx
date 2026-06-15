import React, { createContext, useContext, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ParentalControlContext = createContext()

export const useParentalControls = () => useContext(ParentalControlContext)

const defaultParentalSettings = {
  max_rating: 'PG-13',
  blocked_genres: [],
  blocked_keywords: [],
  daily_watch_limit_minutes: 120,
  bedtime_start: '21:00',
  bedtime_end: '07:00',
  block_adult_content: true,
  require_approval: false,
}

const getTodayDate = () => new Date().toISOString().split('T')[0]

export const ParentalControlProvider = ({ children }) => {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // 1. Fetch Membership and Basic Info
  const { data: membershipData, isLoading: isMembershipLoading } = useQuery({
    queryKey: ['familyMembership', user?.id],
    queryFn: async () => {
      if (!user) return null
      const { data, error } = await supabase
        .from('family_members')
        .select('family_group_id, role')
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
    enabled: !!user,
    refetchInterval: 10000,
  })

  const familyGroupId = membershipData?.family_group_id
  const userRole = membershipData?.role

  // 2. Fetch Family Group Details
  const { data: familyGroup, isLoading: isGroupLoading } = useQuery({
    queryKey: ['familyGroup', familyGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_groups')
        .select('*')
        .eq('id', familyGroupId)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!familyGroupId,
  })

  // 3. Fetch Family Members (enriched with profiles)
  const { data: familyMembers = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ['familyMembers', familyGroupId],
    queryFn: async () => {
      const { data: members, error: membersError } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_group_id', familyGroupId)
      if (membersError) throw membersError

      const memberIds = members.map(m => m.user_id)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', memberIds)
      if (profilesError) throw profilesError

      const profilesById = profiles.reduce((acc, p) => ({ ...acc, [p.id]: p }), {})
      return members.map(m => ({
        ...m,
        profiles: profilesById[m.user_id] || null
      }))
    },
    enabled: !!familyGroupId,
  })

  // 4. Fetch Parental Settings
  const { data: parentalSettings, isLoading: isSettingsLoading } = useQuery({
    queryKey: ['parentalSettings', familyGroupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('parental_settings')
        .select('*')
        .eq('family_group_id', familyGroupId)
        .maybeSingle()
      if (error) throw error
      return data || defaultParentalSettings
    },
    enabled: !!familyGroupId,
  })

  // 5. Fetch Child Profile (if current user is child or we want to manage it)
  const { data: childProfile, isLoading: isChildProfileLoading } = useQuery({
    queryKey: ['childProfile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('child_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      
      if (error) throw error

      if (data) {
        const today = getTodayDate()
        if (data.last_active_date !== today) {
          const { data: resetData, error: resetError } = await supabase
            .from('child_profiles')
            .update({ time_used_today: 0, watch_count_today: 0, last_active_date: today })
            .eq('user_id', user.id)
            .select()
            .single()
          if (resetError) {
            return data
          }
          return resetData
        }
        return data
      } else if (userRole === 'child') {
        const { data: newData, error: newError } = await supabase
          .from('child_profiles')
          .insert({ user_id: user.id, last_active_date: getTodayDate() })
          .select()
          .single()
        if (newError) {
          return null
        }
        return newData
      }
      return null
    },
    enabled: !!user && (userRole === 'child' || !!familyGroupId),
    refetchInterval: 5000,
  })

  // 6. Fetch Pending Invitations (for child users)
  const { data: pendingInvitations = [], isLoading: isInvitationsLoading } = useQuery({
    queryKey: ['pendingInvitations', user?.email],
    queryFn: async () => {
      if (!user?.email) return []
      const { data, error } = await supabase
        .from('family_invitations')
        .select('*, family_groups(name)')
        .eq('child_email', user.email)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.email,
  })

  // 7b. Fetch Sent Invitations (for parent view)
  const { data: sentInvitations = [] } = useQuery({
    queryKey: ['sentInvitations', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const { data, error } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },
    enabled: !!user?.id,
  })

  // 8. Fetch Approved Movies for current user
  const { data: approvedMovies = [] } = useQuery({
    queryKey: ['approvedMovies', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watch_requests')
        .select('movie_id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
      if (error) throw error
      return data.map(r => r.movie_id)
    },
    enabled: !!user && userRole === 'child',
  })

  // Mutations
  const createGroupMutation = useMutation({
    mutationFn: async (name) => {
      const { data: group, error: groupError } = await supabase
        .from('family_groups')
        .insert({ name, created_by: user.id })
        .select().single()
      if (groupError) throw groupError

      await supabase.from('family_members').insert({
        family_group_id: group.id,
        user_id: user.id,
        role: 'parent'
      })

      await supabase.from('profiles').update({ role: 'parent' }).eq('id', user.id)
      await supabase.from('parental_settings').insert({
        family_group_id: group.id,
        ...defaultParentalSettings
      })
      return group
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembership'] })
    }
  })

  const addChildMutation = useMutation({
    mutationFn: async ({ username, role = 'child' }) => {
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .limit(1)

      if (!users?.length) throw new Error('User not found')

      const { error } = await supabase
        .from('family_members')
        .insert({ family_group_id: familyGroupId, user_id: users[0].id, role })
      if (error) throw error

      if (role === 'child') {
        await supabase.from('profiles').update({ role: 'user' }).eq('id', users[0].id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] })
    }
  })

  const createInvitationMutation = useMutation({
    mutationFn: async ({ childEmail, childName, message }) => {
      if (!familyGroupId) throw new Error('Create a family group first')

      const validatedEmail = childEmail.trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(validatedEmail)) {
        throw new Error('Enter a valid email address')
      }

      const { data: userExists } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', validatedEmail)
        .maybeSingle()
      if (!userExists) throw new Error('No account found with this email — they need to sign up first')

      const { data: existing } = await supabase
        .from('family_invitations')
        .select('id, status')
        .eq('family_group_id', familyGroupId)
        .eq('child_email', validatedEmail)
        .eq('status', 'pending')
        .maybeSingle()

      if (existing) throw new Error('An invitation has already been sent to this email')

      const { data, error } = await supabase
        .from('family_invitations')
        .insert({
          family_group_id: familyGroupId,
          parent_id: user.id,
          child_email: validatedEmail,
          child_name: childName || null,
          message: message || null,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations'] })
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] })
    }
  })

  const respondToInvitationMutation = useMutation({
    mutationFn: async ({ invitationId, status }) => {
      if (!['accepted', 'declined'].includes(status)) throw new Error('Invalid response')

      const { data: invitation, error: fetchError } = await supabase
        .from('family_invitations')
        .select('*')
        .eq('id', invitationId)
        .single()
      if (fetchError) throw fetchError
      if (invitation.child_email !== user.email) throw new Error('This invitation is not for you')

      // Update invitation status
      const { error: updateError } = await supabase
        .from('family_invitations')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', invitationId)
      if (updateError) throw updateError

      if (status === 'accepted') {
        // Add as family member
        const { error: memberError } = await supabase
          .from('family_members')
          .insert({
            family_group_id: invitation.family_group_id,
            user_id: user.id,
            role: 'child',
          })
        if (memberError) throw memberError

        await supabase.from('profiles').update({ role: 'child' }).eq('id', user.id)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingInvitations'] })
      queryClient.invalidateQueries({ queryKey: ['familyMembership'] })
      queryClient.invalidateQueries({ queryKey: ['familyMembers'] })
    }
  })

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings) => {
      const { data, error } = await supabase
        .from('parental_settings')
        .upsert({ family_group_id: familyGroupId, ...settings })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parentalSettings'] })
    }
  })

  const updateChildProfileMutation = useMutation({
    mutationFn: async ({ childUserId, updates }) => {
      if (!familyGroup) throw new Error('No family group')
      const { data, error } = await supabase
        .from('child_profiles')
        .upsert({ family_group_id: familyGroup.id, user_id: childUserId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'family_group_id,user_id' })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['childProfile', variables.childUserId] })
    }
  })

  const incrementWatchTimeMutation = useMutation({
    mutationFn: async (minutes) => {
      if (!isChild || !childProfile) return
      const { data, error } = await supabase
        .from('child_profiles')
        .update({ 
          time_used_today: (childProfile.time_used_today || 0) + minutes,
          watch_count_today: (childProfile.watch_count_today || 0) + 1,
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', user.id)
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['childProfile', user?.id] })
    }
  })

  // Helper Logic
  const isParent = userRole === 'parent'
  const isChild = userRole === 'child'
  const isLoading = isMembershipLoading || isGroupLoading || isMembersLoading || isSettingsLoading || isChildProfileLoading || isInvitationsLoading

  const isMovieApproved = useCallback((movie) => {
    const movieId = (movie.id || movie.imdbID)?.toString()
    return approvedMovies.includes(movieId)
  }, [approvedMovies])

  const isContentAllowed = useCallback((movie) => {
    if (!isChild || !parentalSettings) return true
    if (isMovieApproved(movie)) return true

    const maxRating = childProfile?.custom_max_rating || parentalSettings.max_rating || 'PG-13'
    const ratingOrder = { G: 0, PG: 1, 'PG-13': 2, R: 3, 'NC-17': 4 }
    const movieRating = movie.Rated || 'PG'
    const movieRatingValue = ratingOrder[movieRating] ?? 1
    const maxRatingValue = ratingOrder[maxRating] ?? 2

    if (movieRatingValue > maxRatingValue) return false

    const blockedGenres = childProfile?.custom_blocked_genres || parentalSettings.blocked_genres || []
    if (blockedGenres.length > 0 && movie.Genre) {
      const movieGenres = movie.Genre.split(', ').map(g => g.toLowerCase())
      const hasBlocked = blockedGenres.some(bg => movieGenres.includes(bg.toLowerCase()))
      if (hasBlocked) return false
    }

    const blockedKeywords = parentalSettings.blocked_keywords || []
    if (blockedKeywords.length > 0) {
      const title = (movie.Title || movie.title || '').toLowerCase()
      const plot = (movie.Plot || movie.overview || '').toLowerCase()
      const hasBlocked = blockedKeywords.some(kw => title.includes(kw.toLowerCase()) || plot.includes(kw.toLowerCase()))
      if (hasBlocked) return false
    }

    if (parentalSettings.block_adult_content && movie.Rated === 'NC-17') return false

    return true
  }, [isChild, parentalSettings, childProfile, isMovieApproved])

  const isBedtime = useCallback(() => {
    if (!isChild || !parentalSettings) return false

    const start = childProfile?.custom_bedtime_start || parentalSettings.bedtime_start
    const end = childProfile?.custom_bedtime_end || parentalSettings.bedtime_end
    if (!start || !end) return false

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const [startH, startM] = start.split(':').map(Number)
    const [endH, endM] = end.split(':').map(Number)
    const startTime = startH * 60 + startM
    const endTime = endH * 60 + endM

    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime
    }
    return currentTime >= startTime && currentTime <= endTime
  }, [isChild, parentalSettings, childProfile])

  const hasWatchTimeRemaining = useCallback(() => {
    if (!isChild || !parentalSettings) return true
    const limit = childProfile?.custom_daily_limit_minutes || parentalSettings.daily_watch_limit_minutes || 120
    const used = childProfile?.time_used_today || 0
    return used < limit
  }, [isChild, parentalSettings, childProfile])

  const isAccountLocked = useCallback(() => {
    if (!isChild) return false
    return childProfile?.account_locked === true
  }, [isChild, childProfile])

  const requiresApproval = useCallback((movie) => {
    if (!isChild || !parentalSettings) return false
    if (movie && isMovieApproved(movie)) return false
    return Boolean(parentalSettings.require_approval)
  }, [isChild, parentalSettings, isMovieApproved])

  const hasReachedWatchLimit = useCallback(() => {
    if (!isChild) return false
    const max = childProfile?.max_watch_count
    if (max === -1 || max === null || max === undefined) return false
    return (childProfile?.watch_count_today || 0) >= max
  }, [isChild, childProfile])

  const value = useMemo(() => ({
    familyGroup,
    parentalSettings,
    childProfile,
    familyMembers,
    pendingInvitations,
    sentInvitations,
    isParent,
    isChild,
    loading: isLoading,
    isContentAllowed,
    isBedtime,
    hasWatchTimeRemaining,
    isAccountLocked,
    hasReachedWatchLimit,
    requiresApproval,
    createFamilyGroup: (name) => createGroupMutation.mutateAsync(name),
    addChildToGroup: (username, role) => addChildMutation.mutateAsync({ username, role }),
    createInvitation: ({ childEmail, childName, message }) =>
      createInvitationMutation.mutateAsync({ childEmail, childName, message }),
    respondToInvitation: ({ invitationId, status }) =>
      respondToInvitationMutation.mutateAsync({ invitationId, status }),
    updateParentalSettings: (settings) => updateSettingsMutation.mutateAsync(settings),
    updateChildProfile: (childUserId, updates) => updateChildProfileMutation.mutateAsync({ childUserId, updates }),
    refreshFamilyData: () => queryClient.invalidateQueries({ queryKey: ['familyMembership'] }),
    incrementWatchTime: (minutes) => incrementWatchTimeMutation.mutateAsync(minutes),
    isMovieApproved,
  }), [
    familyGroup, parentalSettings, childProfile, familyMembers, pendingInvitations, sentInvitations,
    isParent, isChild, isLoading, isContentAllowed,
    isBedtime, hasWatchTimeRemaining,     isAccountLocked, hasReachedWatchLimit, requiresApproval,
    createGroupMutation, addChildMutation, createInvitationMutation, respondToInvitationMutation,
    updateSettingsMutation, updateChildProfileMutation,
    queryClient
  ])

  return <ParentalControlContext.Provider value={value}>{children}</ParentalControlContext.Provider>
}
