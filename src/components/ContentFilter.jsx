import { useParentalControls } from '../context/ParentalControlContext'

const ContentFilter = ({ children, movie, fallback }) => {
  const { isContentAllowed, isBedtime, hasWatchTimeRemaining, isChild } = useParentalControls()

  if (!isChild) return children

  if (!isContentAllowed(movie)) {
    return fallback || (
      <div className="p-8 bg-red-500/10 -500/20 rounded-2xl text-center">
        <h3 className="text-lg font-bold text-red-500 mb-2">Content Restricted</h3>
        <p className="text-muted-foreground text-sm">This content does not meet your parental control settings.</p>
      </div>
    )
  }

  if (isBedtime()) {
    return fallback || (
      <div className="p-8 bg-amber-500/10 -500/20 rounded-2xl text-center">
        <h3 className="text-lg font-bold text-amber-500 mb-2">Bedtime Mode</h3>
        <p className="text-muted-foreground text-sm">Content viewing is not allowed during bedtime hours.</p>
      </div>
    )
  }

  if (!hasWatchTimeRemaining()) {
    return fallback || (
      <div className="p-8 bg-blue-500/10 -500/20 rounded-2xl text-center">
        <h3 className="text-lg font-bold text-blue-500 mb-2">Daily Limit Reached</h3>
        <p className="text-muted-foreground text-sm">You&apos;ve reached your daily watch time limit. Try again tomorrow!</p>
      </div>
    )
  }

  return children
}

export default ContentFilter
