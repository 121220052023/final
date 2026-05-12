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
          // Auto-reset time_used_today if it's a new day
          const { data: resetData, error: resetError } = await supabase
            .from('child_profiles')
            .update({ time_used_today: 0, last_active_date: today })
            .eq('user_id', user.id)
            .select()
            .single()
          if (resetError) throw resetError
          return resetData
        }
        return data
      } else if (userRole === 'child') {
        // Create initial child profile if missing
        const { data: newData, error: newError } = await supabase
          .from('child_profiles')
          .insert({ user_id: user.id, last_active_date: getTodayDate() })
          .select()
          .single()
        if (newError) throw newError
        return newData
      }
      return null
    },
    enabled: !!user && (userRole === 'child' || !!familyGroupId),
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
      const { data, error } = await supabase
        .from('child_profiles')
        .upsert({ user_id: childUserId, ...updates, updated_at: new Date().toISOString() })
        .select().single()
      if (error) throw error
      return data
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['childProfile', variables.childUserId] })
    }
  })

  // Helper Logic
  const isParent = userRole === 'parent'
  const isChild = userRole === 'child'
  const isLoading = isMembershipLoading || isGroupLoading || isMembersLoading || isSettingsLoading || isChildProfileLoading

  const isContentAllowed = useCallback((movie) => {
    if (!isChild || !parentalSettings) return true

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
      const title = (movie.Title || '').toLowerCase()
      const plot = (movie.Plot || '').toLowerCase()
      const hasBlocked = blockedKeywords.some(kw => title.includes(kw.toLowerCase()) || plot.includes(kw.toLowerCase()))
      if (hasBlocked) return false
    }

    if (parentalSettings.block_adult_content && movie.Rated === 'NC-17') return false

    return true
  }, [isChild, parentalSettings, childProfile])

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

  const requiresApproval = useCallback(() => {
    if (!isChild || !parentalSettings) return false
    return Boolean(parentalSettings.require_approval)
  }, [isChild, parentalSettings])

  const value = useMemo(() => ({
    familyGroup,
    parentalSettings,
    childProfile,
    familyMembers,
    isParent,
    isChild,
    loading: isLoading,
    isContentAllowed,
    isBedtime,
    hasWatchTimeRemaining,
    requiresApproval,
    createFamilyGroup: (name) => createGroupMutation.mutateAsync(name),
    addChildToGroup: (username, role) => addChildMutation.mutateAsync({ username, role }),
    updateParentalSettings: (settings) => updateSettingsMutation.mutateAsync(settings),
    updateChildProfile: (childUserId, updates) => updateChildProfileMutation.mutateAsync({ childUserId, updates }),
    refreshFamilyData: () => queryClient.invalidateQueries({ queryKey: ['familyMembership'] }),
  }), [
    familyGroup, parentalSettings, childProfile, familyMembers, 
    isParent, isChild, isLoading, isContentAllowed, 
    isBedtime, hasWatchTimeRemaining, requiresApproval,
    createGroupMutation, addChildMutation, updateSettingsMutation, updateChildProfileMutation,
    queryClient
  ])

  return <ParentalControlContext.Provider value={value}>{children}</ParentalControlContext.Provider>
}
