import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { watchHistoryService } from '../services/supabaseService'

export const useWatchHistory = (movie) => {
  const { user, session } = useAuth()
  const intervalRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [lastPosition, setLastPosition] = useState(0)
  const [isTracking, setIsTracking] = useState(false)

  useEffect(() => {
    if (!user || !session || !movie) return

    const loadHistory = async () => {
      try {
        const history = await watchHistoryService.get(user.id, session.access_token, 100)
        const movieHistory = history.find(h => h.movie_id === movie.imdbID)
        if (movieHistory) {
          setProgress(movieHistory.progress)
          setLastPosition(movieHistory.last_position)
        }
      } catch (error) {
        console.error('Error loading watch history:', error)
      }
    }

    loadHistory()
  }, [user, session, movie])

  const startTracking = () => {
    setIsTracking(true)
    intervalRef.current = setInterval(() => {
      setLastPosition(prev => prev + 1)
    }, 1000)
  }

  const stopTracking = async () => {
    setIsTracking(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (movie && user && session && lastPosition > 0) {
      try {
        const estimatedDuration = 7200
        const progressPercent = Math.min((lastPosition / estimatedDuration) * 100, 100)
        await watchHistoryService.addOrUpdate(
          movie,
          user.id,
          session.access_token,
          progressPercent,
          lastPosition,
          movie.Genre
        )
      } catch (error) {
        console.error('Error saving watch history:', error)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  return { progress, lastPosition, isTracking, startTracking, stopTracking, setLastPosition }
}
