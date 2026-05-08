const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

// Helper to build headers with auth token
function authHeaders(token) {
  return {
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation',
  }
}

export const watchlistService = {
  get: async (userId, token) => {
    if (!userId || !token) return []
    const url = `${SUPABASE_URL}/rest/v1/watchlist?select=*&user_id=eq.${encodeURIComponent(userId)}&order=added_at.desc`
    const response = await fetch(url, { headers: authHeaders(token) })
    if (!response.ok) {
      return []
    }
    return await response.json()
  },

  add: async (movie, userId, token) => {
    if (!userId || !token) throw new Error('Not authenticated')
    const url = `${SUPABASE_URL}/rest/v1/watchlist?select=*&on_conflict=user_id,movie_id,movie_type`
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        user_id: userId,
        movie_id: movie.imdbID,
        movie_type: movie.Type || 'movie',
        title: movie.Title,
        poster_url: movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : 'N/A',
        year: movie.Year,
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`watchlistService.add failed: ${response.status} - ${err}`)
    }
    const data = await response.json()
    return data[0] || data
  },

  remove: async (movieId, userId, token) => {
    if (!userId || !token) throw new Error('Not authenticated')
    const url = `${SUPABASE_URL}/rest/v1/watchlist?user_id=eq.${encodeURIComponent(userId)}&movie_id=eq.${encodeURIComponent(movieId)}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders(token),
    })
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`watchlistService.remove failed: ${response.status} - ${err}`)
    }
  },
}

export const likedMoviesService = {
  get: async (userId, token) => {
    if (!userId || !token) return []
    const url = `${SUPABASE_URL}/rest/v1/liked_movies?select=*&user_id=eq.${encodeURIComponent(userId)}&order=liked_at.desc`
    const response = await fetch(url, { headers: authHeaders(token) })
    if (!response.ok) {
      return []
    }
    return await response.json()
  },

  add: async (movie, userId, token) => {
    if (!userId || !token) throw new Error('Not authenticated')
    const url = `${SUPABASE_URL}/rest/v1/liked_movies?select=*&on_conflict=user_id,movie_id,movie_type`
    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        user_id: userId,
        movie_id: movie.imdbID,
        movie_type: movie.Type || 'movie',
        title: movie.Title,
        poster_url: movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : 'N/A',
        year: movie.Year,
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`likedMoviesService.add failed: ${response.status} - ${err}`)
    }
    const data = await response.json()
    return data[0] || data
  },

  remove: async (movieId, userId, token) => {
    if (!userId || !token) throw new Error('Not authenticated')
    const url = `${SUPABASE_URL}/rest/v1/liked_movies?user_id=eq.${encodeURIComponent(userId)}&movie_id=eq.${encodeURIComponent(movieId)}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders(token),
    })
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`likedMoviesService.remove failed: ${response.status} - ${err}`)
    }
  },
}

export const watchHistoryService = {
  get: async (userId, token, limit = 20) => {
    if (!userId || !token) return []
    const url = `${SUPABASE_URL}/rest/v1/watch_history?select=*&user_id=eq.${encodeURIComponent(userId)}&order=watched_at.desc&limit=${limit}`
    const response = await fetch(url, { headers: authHeaders(token) })
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`watchHistoryService.get failed: ${response.status} - ${err}`)
    }
    return await response.json()
  },

  addOrUpdate: async (movie, userId, token, progress = 0, lastPosition = 0, genre = null) => {
    if (!userId || !token) throw new Error('Not authenticated')
    const url = `${SUPABASE_URL}/rest/v1/watch_history?select=*&user_id=eq.${encodeURIComponent(userId)}&movie_id=eq.${encodeURIComponent(movie.imdbID)}&movie_type=eq.${encodeURIComponent(movie.Type || 'movie')}`
    
    // Check if entry exists
    const existingResponse = await fetch(url, { headers: authHeaders(token) })
    let existingTime = 0
    if (existingResponse.ok) {
      const existing = await existingResponse.json()
      if (existing.length > 0) {
        existingTime = existing[0].last_position || 0
      }
    }
    
    // Accumulate time
    const totalPosition = existingTime + lastPosition
    const estimatedDuration = (movie.Type || 'movie') === 'tv' ? 2700 : 7200
    const totalProgress = Math.min((totalPosition / estimatedDuration) * 100, 100)

    const upsertUrl = `${SUPABASE_URL}/rest/v1/watch_history?select=*&on_conflict=user_id,movie_id,movie_type`
    const response = await fetch(upsertUrl, {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        user_id: userId,
        movie_id: movie.imdbID,
        movie_type: movie.Type || 'movie',
        title: movie.Title,
        poster_url: movie.Poster !== 'N/A' ? movie.Poster : null,
        genre: genre || movie.Genre || null,
        progress: totalProgress,
        last_position: totalPosition,
        completed: totalProgress >= 95,
      }),
    })
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`watchHistoryService.addOrUpdate failed: ${response.status} - ${err}`)
    }
    const data = await response.json()
    return data[0] || data
  },

  remove: async (movieId, userId, token) => {
    if (!userId || !token) throw new Error('Not authenticated')
    const url = `${SUPABASE_URL}/rest/v1/watch_history?user_id=eq.${encodeURIComponent(userId)}&movie_id=eq.${encodeURIComponent(movieId)}`
    const response = await fetch(url, {
      method: 'DELETE',
      headers: authHeaders(token),
    })
    if (!response.ok) {
      const err = await response.text()
      throw new Error(`watchHistoryService.remove failed: ${response.status} - ${err}`)
    }
  },
}
