import { createContext, useState, useEffect, useContext, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ParentalControlContext = createContext({})

export const useParentalControls = () => {
  const context = useContext(ParentalControlContext)
  if (!context) throw new Error('useParentalControls must be used within ParentalControlProvider')
  return context
}

export const ParentalControlProvider = ({ children }) => {
  const { user, profile } = useAuth()
  const [familyGroup, setFamilyGroup] = useState(null)
  const [parentalSettings, setParentalSettings] = useState(null)
  const [childProfile, setChildProfile] = useState(null)
  const [familyMembers, setFamilyMembers] = useState([])
  const [isParent, setIsParent] = useState(false)
  const [isChild, setIsChild] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadFamilyData = useCallback(async () => {
    if (!user) {
      setFamilyGroup(null)
      setParentalSettings(null)
      setChildProfile(null)
      setFamilyMembers([])
      setIsParent(false)
      setIsChild(false)
      setLoading(false)
      return
    }

    try {
      const { data: memberData, error: memberError } = await supabase
        .from('family_members')
        .select('*, family_groups(*)')
        .eq('user_id', user.id)

      // If table doesn't exist, gracefully handle it
      if (memberError) {
        console.log('Parental controls tables not set up yet:', memberError.message)
        setFamilyGroup(null)
        setParentalSettings(null)
        setChildProfile(null)
        setFamilyMembers([])
        setIsParent(false)
        setIsChild(false)
        setLoading(false)
        return
      }

      if (memberData && memberData.length > 0) {
        const member = memberData[0]
        setFamilyGroup(member.family_groups)
        setIsParent(member.role === 'parent')
        setIsChild(member.role === 'child')

        const { data: members } = await supabase
          .from('family_members')
          .select('*, profiles(username, full_name, avatar_url)')
          .eq('group_id', member.group_id)
        setFamilyMembers(members || [])

        if (member.role === 'parent') {
          const { data: settings } = await supabase
            .from('parental_settings')
            .select('*')
            .eq('group_id', member.group_id)
            .single()
          setParentalSettings(settings)
        }

        if (member.role === 'child') {
          const { data: cp } = await supabase
            .from('child_profiles')
            .select('*')
            .eq('child_user_id', user.id)
            .eq('group_id', member.group_id)
            .single()
          setChildProfile(cp)

          const { data: settings } = await supabase
            .from('parental_settings')
            .select('*')
            .eq('group_id', member.group_id)
            .single()
          setParentalSettings(settings)
        }
      } else {
        setFamilyGroup(null)
        setParentalSettings(null)
        setChildProfile(null)
        setFamilyMembers([])
        setIsParent(false)
        setIsChild(false)
      }
    } catch (error) {
      console.error('Error loading family data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadFamilyData()
  }, [loadFamilyData])

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
    return parentalSettings.require_approval
  }, [isChild, parentalSettings])

  const createFamilyGroup = async (name) => {
    if (!user) throw new Error('Not authenticated')
    const { data: group, error: groupError } = await supabase
      .from('family_groups')
      .insert({ name, created_by: user.id })
      .select()
      .single()
    if (groupError) throw groupError

    await supabase
      .from('family_members')
      .insert({ group_id: group.id, user_id: user.id, role: 'parent' })

    await supabase
      .from('parental_settings')
      .insert({ group_id: group.id })

    await supabase
      .from('profiles')
      .update({ role: 'parent' })
      .eq('id', user.id)

    await loadFamilyData()
    return group
  }

  const addChildToGroup = async (childEmail, role = 'child') => {
    if (!familyGroup) throw new Error('No family group')
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', childEmail)
      .limit(1)

    if (!users || users.length === 0) throw new Error('User not found')

    const { error } = await supabase
      .from('family_members')
      .insert({ group_id: familyGroup.id, user_id: users[0].id, role })
    if (error) throw error

    if (role === 'child') {
      await supabase
        .from('child_profiles')
        .insert({ group_id: familyGroup.id, child_user_id: users[0].id })
    }

    await loadFamilyData()
  }

  const updateParentalSettings = async (settings) => {
    if (!familyGroup) throw new Error('No family group')
    const { data, error } = await supabase
      .from('parental_settings')
      .upsert({ group_id: familyGroup.id, ...settings })
      .select()
      .single()
    if (error) throw error
    setParentalSettings(data)
    return data
  }

  const updateChildProfile = async (childUserId, updates) => {
    if (!familyGroup) throw new Error('No family group')
    const { data, error } = await supabase
      .from('child_profiles')
      .upsert({ group_id: familyGroup.id, child_user_id: childUserId, ...updates })
      .select()
      .single()
    if (error) throw error
    if (childUserId === user?.id) setChildProfile(data)
    return data
  }

  const logActivity = async (action, details = {}) => {
    if (!user || !familyGroup) return
    await supabase
      .from('activity_logs')
      .insert({ user_id: user.id, group_id: familyGroup.id, action, details })
  }

  const value = {
    familyGroup,
    parentalSettings,
    childProfile,
    familyMembers,
    isParent,
    isChild,
    loading,
    isContentAllowed,
    isBedtime,
    hasWatchTimeRemaining,
    requiresApproval,
    createFamilyGroup,
    addChildToGroup,
    updateParentalSettings,
    updateChildProfile,
    logActivity,
    refreshFamilyData: loadFamilyData,
  }

  return <ParentalControlContext.Provider value={value}>{children}</ParentalControlContext.Provider>
}
