import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { watchHistoryService } from '../services/supabaseService'

export const useWatchHistory = (movie) => {
  const { user } = useAuth()
  const intervalRef = useRef(null)
  const [progress, setProgress] = useState(0)
  const [lastPosition, setLastPosition] = useState(0)
  const [isTracking, setIsTracking] = useState(false)

  useEffect(() => {
    if (!user || !movie) return

    const loadHistory = async () => {
      try {
        const history = await watchHistoryService.get(100)
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
  }, [user, movie])

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

    if (movie && lastPosition > 0) {
      try {
        const estimatedDuration = 7200
        const progressPercent = Math.min((lastPosition / estimatedDuration) * 100, 100)
        await watchHistoryService.addOrUpdate(movie, progressPercent, lastPosition)
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
