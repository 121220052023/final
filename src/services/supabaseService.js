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

async function requestJson(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...authHeaders(token),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Supabase request failed: ${response.status} - ${err}`)
  }

  if (response.status === 204) return null
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

function encode(value) {
  return encodeURIComponent(value ?? '')
}

function normalizeMovieRow(movie, userId) {
  return {
    user_id: userId,
    movie_id: movie.id?.toString() || movie.imdbID?.toString(),
    movie_type: movie.type || movie.Type || movie.media_type || 'movie',
    title: movie.title || movie.Title,
    poster_url: movie.poster_url || (movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
      : (movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null)),
    year: movie.year || movie.release_date?.substring(0, 4) || movie.Year || null,
  }
}

async function findLibraryRow(table, movieId, movieType, userId, token) {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*&user_id=eq.${encode(userId)}&movie_id=eq.${encode(movieId)}&movie_type=eq.${encode(movieType)}&limit=1`
  const rows = await requestJson(url, token)
  return Array.isArray(rows) ? rows[0] : null
}

async function saveLibraryRow(table, row, token) {
  const existing = await findLibraryRow(table, row.movie_id, row.movie_type, row.user_id, token)
  if (existing?.id) {
    const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encode(existing.id)}&select=*`
    const data = await requestJson(url, token, {
      method: 'PATCH',
      body: JSON.stringify(row),
    })
    return Array.isArray(data) ? data[0] : data
  }

  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*`
  const data = await requestJson(url, token, {
    method: 'POST',
    body: JSON.stringify(row),
  })
  return Array.isArray(data) ? data[0] : data
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
    return saveLibraryRow('watchlist', normalizeMovieRow(movie, userId), token)
  },

  remove: async (movieId, userId, token) => {
    if (!userId || !token) throw new Error('Not authenticated')
    const url = `${SUPABASE_URL}/rest/v1/watchlist?user_id=eq.${encode(userId)}&movie_id=eq.${encode(movieId)}`
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
    return saveLibraryRow('liked_movies', normalizeMovieRow(movie, userId), token)
  },

  remove: async (movieId, userId, token) => {
    if (!userId || !token) throw new Error('Not authenticated')
    const url = `${SUPABASE_URL}/rest/v1/liked_movies?user_id=eq.${encode(userId)}&movie_id=eq.${encode(movieId)}`
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

export const notificationService = {
  get: async (userId, token) => {
    if (!userId || !token) return []
    const url = `${SUPABASE_URL}/rest/v1/notifications?select=*&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
    const response = await fetch(url, { headers: authHeaders(token) })
    if (!response.ok) return []
    return await response.json()
  },

  markRead: async (notificationId, userId, token) => {
    if (!userId || !token) throw new Error('Not authenticated')
    const url = `${SUPABASE_URL}/rest/v1/notifications?id=eq.${encode(notificationId)}`
    await fetch(url, {
      method: 'PATCH',
      headers: authHeaders(token),
      body: JSON.stringify({ is_read: true }),
    })
  },

  delete: async (notificationId, userId, token) => {
    if (!userId || !token) throw new Error('Not authenticated')
    const url = `${SUPABASE_URL}/rest/v1/notifications?id=eq.${encode(notificationId)}`
    await fetch(url, {
      method: 'DELETE',
      headers: authHeaders(token),
    })
  },
}
