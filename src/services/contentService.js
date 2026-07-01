import { supabase } from '../lib/supabase'
import { tmdbApi } from './tmdb'
import * as imdbService from './imdbService'

const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'

function tmdbToLocal(movie, type = 'movie') {
  const isTv = type === 'tv' || movie.first_air_date || movie.media_type === 'tv'
  const title = movie.title || movie.name || movie.original_title || movie.original_name
  const year = (movie.release_date || movie.first_air_date || '').split('-')[0]
  return {
    tmdb_id: movie.id,
    title,
    description: movie.overview || null,
    release_year: year || null,
    genres: movie.genre_ids || movie.genres?.map(g => g.name) || null,
    poster_url: movie.poster_path ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}` : null,
    rating: movie.vote_average?.toString() || null,
    runtime: movie.runtime || null,
    director: null,
    cast_list: null,
    language: movie.original_language || 'en',
  }
}

function localToMediaItem(local) {
  return {
    id: local.tmdb_id?.toString() || local.id,
    tmdbID: local.tmdb_id?.toString() || local.id,
    title: local.title,
    year: local.release_year || '',
    poster_url: local.poster_url || null,
    overview: local.description || '',
    genres: local.genres || [],
    genre_ids: Array.isArray(local.genres) ? [] : [],
    rating: local.rating ? parseFloat(local.rating) : null,
    director: local.director || '',
    cast_list: local.cast_list || [],
    type: 'movie',
    backdrop: null,
    adult: false,
    isLocalOverride: true,
    runtime: local.runtime || null,
    language: local.language || 'en',
  }
}

async function getLocalByTmdbIds(tmdbIds, table = 'movies') {
  if (!tmdbIds.length) return new Map()
  const { data } = await supabase
    .from(table)
    .select('*')
    .in('tmdb_id', tmdbIds)
  const map = new Map()
  if (data) data.forEach(item => map.set(item.tmdb_id, item))
  return map
}

export const contentService = {
  async getMovieDetails(tmdbId, type = 'movie') {
    const table = type === 'tv' ? 'series' : 'movies'
    const { data: local } = await supabase
      .from(table)
      .select('*')
      .eq('tmdb_id', tmdbId)
      .maybeSingle()
    if (local) return localToMediaItem(local)
    return imdbService.getMovieDetails(tmdbId, type)
  },

  async searchMovies(query, page = 1) {
    const tmdb = await imdbService.searchMovies(query, page)
    const tmdbIds = tmdb.movies.map(m => parseInt(m.id)).filter(Boolean)
    const localMap = await getLocalByTmdbIds(tmdbIds, 'movies')
    const merged = tmdb.movies.map(m => {
      const local = localMap.get(parseInt(m.id))
      return local ? { ...m, ...localToMediaItem(local), isLocalOverride: true } : m
    })
    return { ...tmdb, movies: merged }
  },

  async getTrendingMovies(page = 1) {
    const tmdb = await imdbService.getTrendingMovies(page)
    const tmdbIds = tmdb.movies.map(m => parseInt(m.id)).filter(Boolean)
    const localMap = await getLocalByTmdbIds(tmdbIds, 'movies')
    const merged = tmdb.movies.map(m => {
      const local = localMap.get(parseInt(m.id))
      return local ? { ...m, ...localToMediaItem(local), isLocalOverride: true } : m
    })
    return { ...tmdb, movies: merged }
  },

  async getPopularForSlider() {
    const tmdb = await imdbService.getPopularMoviesForSlider()
    const tmdbIds = tmdb.map(m => parseInt(m.id)).filter(Boolean)
    const localMap = await getLocalByTmdbIds(tmdbIds, 'movies')
    return tmdb.map(m => {
      const local = localMap.get(parseInt(m.id))
      return local ? { ...m, ...localToMediaItem(local), isLocalOverride: true } : m
    })
  },

  async getUpcomingMovies(page = 1) {
    const tmdb = await imdbService.getUpcomingMovies(page)
    const tmdbIds = tmdb.movies.map(m => parseInt(m.id)).filter(Boolean)
    const localMap = await getLocalByTmdbIds(tmdbIds, 'movies')
    const merged = tmdb.movies.map(m => {
      const local = localMap.get(parseInt(m.id))
      return local ? { ...m, ...localToMediaItem(local), isLocalOverride: true } : m
    })
    return { ...tmdb, movies: merged }
  },

  async getMoviesByGenre(genreId, page = 1) {
    const tmdb = await imdbService.getMoviesByGenre(genreId, page)
    const tmdbIds = tmdb.movies.map(m => parseInt(m.id)).filter(Boolean)
    const localMap = await getLocalByTmdbIds(tmdbIds, 'movies')
    const merged = tmdb.movies.map(m => {
      const local = localMap.get(parseInt(m.id))
      return local ? { ...m, ...localToMediaItem(local), isLocalOverride: true } : m
    })
    return { ...tmdb, movies: merged }
  },

  async getAllLocalMovies(page = 1, limit = 20) {
    const from = (page - 1) * limit
    const { data, count } = await supabase
      .from('movies')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, from + limit - 1)
    return { movies: (data || []).map(localToMediaItem), total: count || 0 }
  },

  async getAllLocalSeries(page = 1, limit = 20) {
    const from = (page - 1) * limit
    const { data, count } = await supabase
      .from('series')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(from, from + limit - 1)
    return { series: (data || []), total: count || 0 }
  },

  async _mergeTmdbResults(results = [], table = 'movies') {
    const ids = results.map(r => r.id).filter(Boolean)
    if (!ids.length) return results
    const localMap = await getLocalByTmdbIds(ids, table)
    return results.map(r => {
      const local = localMap.get(r.id)
      if (!local) return r
      const isTv = table === 'series'
      return {
        ...r,
        title: local.title || r.title,
        name: local.title || r.name,
        overview: local.description || r.overview,
        poster_path: local.poster_url || r.poster_path,
        release_date: local.release_year ? `${local.release_year}-01-01` : r.release_date,
        first_air_date: local.release_year ? `${local.release_year}-01-01` : r.first_air_date,
        vote_average: local.rating ? parseFloat(local.rating) : r.vote_average,
        genre_ids: local.genres ? (typeof local.genres === 'string' ? [] : []) : r.genre_ids,
        runtime: local.runtime || r.runtime,
        original_language: local.language || r.original_language,
        isLocalOverride: true,
      }
    })
  },

  async mergeTmdbResults(results = [], table = 'movies') {
    return this._mergeTmdbResults(results, table)
  },

  async saveMovieEdit(tmdbData, edits, adminId) {
    if (!edits.title?.trim()) throw new Error('Title required')
    const existing = await supabase
      .from('movies')
      .select('id')
      .eq('tmdb_id', tmdbData.id)
      .maybeSingle()
    const payload = {
      tmdb_id: tmdbData.id,
      title: edits.title || tmdbData.title || tmdbData.name,
      description: edits.description || edits.overview || tmdbData.overview || null,
      release_year: edits.release_year || (tmdbData.release_date || '').split('-')[0] || null,
      genres: edits.genres
        ? (typeof edits.genres === 'string' ? edits.genres.split(',').map(s => s.trim()) : edits.genres)
        : tmdbData.genres?.map(g => g.name || g) || null,
      poster_url: edits.poster_url || (tmdbData.poster_path ? `${TMDB_IMAGE_BASE_URL}${tmdbData.poster_path}` : null),
      rating: edits.rating || tmdbData.vote_average?.toString() || null,
      runtime: edits.runtime ? parseInt(edits.runtime) : tmdbData.runtime || null,
      director: edits.director || null,
      cast_list: edits.cast_list
        ? (typeof edits.cast_list === 'string' ? edits.cast_list.split(',').map(s => s.trim()) : edits.cast_list)
        : null,
      language: edits.language || tmdbData.original_language || 'en',
      added_by: adminId,
    }
    if (existing.data?.id) {
      const { error } = await supabase.from('movies').update(payload).eq('id', existing.data.id)
      if (error) throw error
      return { action: 'updated' }
    } else {
      const { error } = await supabase.from('movies').insert(payload)
      if (error) throw error
      return { action: 'created' }
    }
  },

  async deleteLocalMovie(id) {
    const { error } = await supabase.from('movies').delete().eq('id', id)
    if (error) throw error
  },

  async getPopularMovies(page = 1) {
    const data = await tmdbApi.getPopularMovies(page)
    const merged = await this._mergeTmdbResults(data.results || [])
    return { ...data, results: merged }
  },

  async getTopRatedMovies(page = 1) {
    const data = await tmdbApi.getTopRatedMovies(page)
    const merged = await this._mergeTmdbResults(data.results || [])
    return { ...data, results: merged }
  },

  async getNowPlayingMovies(page = 1) {
    const data = await tmdbApi.getNowPlayingMovies(page)
    const merged = await this._mergeTmdbResults(data.results || [])
    return { ...data, results: merged }
  },

  async getTrendingMoviesTMDB(timeWindow = 'week', page = 1) {
    const data = await tmdbApi.getTrendingMovies(timeWindow, page)
    const merged = await this._mergeTmdbResults(data.results || [])
    return { ...data, results: merged }
  },

  async getPopularTVShows(page = 1) {
    const data = await tmdbApi.getPopularTVShows(page)
    const merged = await this._mergeTmdbResults(data.results || [], 'series')
    return { ...data, results: merged }
  },

  async getTopRatedTVShows(page = 1) {
    const data = await tmdbApi.getTopRatedTVShows(page)
    const merged = await this._mergeTmdbResults(data.results || [], 'series')
    return { ...data, results: merged }
  },

  async getOnTheAirTVShows(page = 1) {
    const data = await tmdbApi.getOnTheAirTVShows(page)
    const merged = await this._mergeTmdbResults(data.results || [], 'series')
    return { ...data, results: merged }
  },

  async getAiringTodayTVShows(page = 1) {
    const data = await tmdbApi.getAiringTodayTVShows(page)
    const merged = await this._mergeTmdbResults(data.results || [], 'series')
    return { ...data, results: merged }
  },

  async getTrendingTVShows(timeWindow = 'week', page = 1) {
    const data = await tmdbApi.getTrendingTVShows(timeWindow, page)
    const merged = await this._mergeTmdbResults(data.results || [], 'series')
    return { ...data, results: merged }
  },

  async searchMulti(query, page = 1) {
    const data = await tmdbApi.searchMovies(query, page)
    const merged = await this._mergeTmdbResults((data.results || []).filter(r => r.media_type !== 'person'))
    return { ...data, results: merged }
  },

  async getMovieRecommendations(movieId) {
    const data = await tmdbApi.getMovieRecommendations(movieId)
    const merged = await this._mergeTmdbResults(data.results || [])
    return { ...data, results: merged }
  },

  async getTVRecommendations(tvId) {
    const data = await tmdbApi.getTVRecommendations(tvId)
    const merged = await this._mergeTmdbResults(data.results || [], 'series')
    return { ...data, results: merged }
  },
}

export const tmdbSource = {
  async search(query, page = 1) {
    const data = await tmdbApi.searchMovies(query, page)
    return data.results?.filter(r => r.media_type !== 'person') || []
  },

  async getPopular(page = 1) {
    const data = await tmdbApi.getPopularMovies(page)
    return data.results || []
  },

  async getDetails(id, type = 'movie') {
    if (type === 'tv') return tmdbApi.getTVShowDetails(id)
    return tmdbApi.getMovieDetails(id)
  },
}
