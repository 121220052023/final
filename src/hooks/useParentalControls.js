import { useState, useEffect } from 'react'
import { useParentalControls } from '../context/ParentalControlContext'

export const useParentalAccess = () => {
  const { user, isContentAllowed, isBedtime, hasWatchTimeRemaining, requiresApproval } = useParentalControls()
  const [isBlocked, setIsBlocked] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  const checkContentAccess = (movie) => {
    if (!user) return { allowed: true }

    if (!isContentAllowed(movie)) {
      return { allowed: false, reason: 'content_restricted' }
    }

    if (isBedtime()) {
      return { allowed: false, reason: 'bedtime' }
    }

    if (!hasWatchTimeRemaining()) {
      return { allowed: false, reason: 'time_limit_reached' }
    }

    if (requiresApproval()) {
      return { allowed: false, reason: 'requires_approval' }
    }

    return { allowed: true }
  }

  return { checkContentAccess, isBlocked, blockReason }
}
