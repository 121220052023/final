import { useParentalControls } from '../context/ParentalControlContext'
import RestrictedOverlay from './RestrictedOverlay'

const ContentFilter = ({ children, movie, fallback }) => {
  const { isContentAllowed, isBedtime, hasWatchTimeRemaining, isChild, requiresApproval } = useParentalControls()

  if (!isChild) return children

  // 1. Check Bedtime
  if (isBedtime()) {
    return fallback || <RestrictedOverlay movie={movie} reason="bedtime" />
  }

  // 2. Check Watch Time
  if (!hasWatchTimeRemaining()) {
    return fallback || <RestrictedOverlay movie={movie} reason="limit" />
  }

  // 3. Check Content Specific Restrictions (Rating, Genre, Keyword)
  if (!isContentAllowed(movie)) {
    // Determine the specific reason
    // In a real app, isContentAllowed might return the reason.
    // For now, we'll assume it's one of these.
    return fallback || <RestrictedOverlay movie={movie} reason="rating" />
  }

  // 4. Check if Approval is required for ALL content (if configured)
  if (requiresApproval(movie)) {
    // Note: We'll need a way to check if this specific movie was ALREADY approved.
    // For now, if requiresApproval is true, we show the overlay.
    return fallback || <RestrictedOverlay movie={movie} reason="approval" />
  }

  return children
}

export default ContentFilter
