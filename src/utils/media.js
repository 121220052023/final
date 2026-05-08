export const getMediaId = (item) => item?.imdbID || item?.id?.toString() || item?.movie_id || null;

export const getDisplayTitle = (item, fallback = 'Untitled') =>
  item?.Title || item?.title || item?.name || item?.titleText || fallback;

export const getDisplayCopy = (item, fallback = 'No summary available yet.') =>
  item?.Plot || item?.overview || item?.description || fallback;

export const getPosterUrl = (item, fallback = 'https://via.placeholder.com/400x600?text=No+Poster') => {
  if (!item) return fallback;
  if (item.Poster && item.Poster !== 'N/A') return item.Poster;
  if (item.poster_url && item.poster_url !== 'N/A') return item.poster_url;
  if (item.poster_path) return `https://image.tmdb.org/t/p/w500${item.poster_path}`;
  return fallback;
};

export const getBackdropUrl = (item, fallback = 'https://via.placeholder.com/1400x900?text=Featured+Story') => {
  if (!item) return fallback;
  if (item.backdrop) return item.backdrop;
  if (item.backdrop_path) return `https://image.tmdb.org/t/p/original${item.backdrop_path}`;
  return getPosterUrl(item, fallback);
};

export const getYear = (item) =>
  item?.Year ||
  item?.year ||
  item?.release_date?.slice(0, 4) ||
  item?.first_air_date?.slice(0, 4) ||
  'Now';

export const getTypeLabel = (item) => {
  const type = item?.Type || item?.type || item?.media_type || item?.movie_type;
  return type === 'tv' ? 'Series' : 'Movie';
};

export const getRatingValue = (item) => {
  const value = item?.rating ?? item?.vote_average ?? item?.imdbRating;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

export const getGenreList = (item) => {
  if (!item) return [];
  if (Array.isArray(item.genre_names)) return item.genre_names;
  if (Array.isArray(item.genres)) {
    return item.genres.map((genre) => (typeof genre === 'string' ? genre : genre?.name)).filter(Boolean);
  }
  if (typeof item.Genre === 'string') {
    return item.Genre.split(',').map((genre) => genre.trim()).filter(Boolean);
  }
  if (typeof item.genre === 'string') {
    return item.genre.split(',').map((genre) => genre.trim()).filter(Boolean);
  }
  return [];
};

export const getPrimaryGenre = (item, fallback = 'Discovery') => getGenreList(item)[0] || fallback;

export const uniqueById = (items = []) => {
  const seen = new Set();
  return items.filter((item) => {
    const id = getMediaId(item);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

export const normalizeMediaItem = (item) => ({
  imdbID: getMediaId(item),
  Title: getDisplayTitle(item),
  Year: getYear(item),
  Poster: getPosterUrl(item),
  Plot: getDisplayCopy(item),
  Genre: getGenreList(item).join(', ') || item?.Genre || item?.genre || 'N/A',
  Type: item?.Type || item?.type || item?.media_type || item?.movie_type || 'movie',
  rating: getRatingValue(item),
  backdrop: getBackdropUrl(item, getPosterUrl(item)),
});

export const deriveTopGenres = (items = [], limit = 3) => {
  const counts = new Map();

  items.forEach((item) => {
    getGenreList(item).forEach((genre) => {
      const key = genre.toLowerCase();
      counts.set(key, {
        label: genre,
        count: (counts.get(key)?.count || 0) + 1,
      });
    });
  });

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => entry.label);
};
