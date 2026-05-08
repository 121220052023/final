import { Heart, HeartCrack } from 'lucide-react';
import { useLikedMovies } from '../context/LikedMoviesContext';
import SavedShelfPage from '../components/SavedShelfPage';

export function LikedMovies() {
  const { likedMovies, removeFromLikedMovies, clearLikedMovies } = useLikedMovies();

  return (
    <SavedShelfPage
      title="Liked Titles"
      description="This shelf tells Ocean of Movies what should influence your taste profile. Keep the titles you genuinely want the recommendation system to remember."
      items={likedMovies}
      emptyTitle="No liked titles yet"
      emptyCopy="Use the heart actions across the app to build a shelf of movies and series that should shape your future recommendations."
      accent="Liked shelf"
      clearLabel="Clear liked titles"
      onClear={() => {
        if (window.confirm('Remove all liked titles?')) {
          clearLikedMovies();
        }
      }}
      onRemove={removeFromLikedMovies}
      EmptyIcon={HeartCrack}
      HeroIcon={Heart}
    />
  );
}

export default LikedMovies;
