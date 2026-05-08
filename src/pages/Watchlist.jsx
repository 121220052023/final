import { BookmarkPlus, Clapperboard } from 'lucide-react';
import { useWatchlist } from '../context/WatchlistContext';
import SavedShelfPage from '../components/SavedShelfPage';

export default function Watchlist() {
  const { watchlist, removeFromWatchlist, clearWatchlist } = useWatchlist();

  return (
    <SavedShelfPage
      title="Watch Later"
      description="A cleaner watch later shelf for titles you want to return to, without losing them in the main browsing pages."
      items={watchlist}
      emptyTitle="Your watch later shelf is empty"
      emptyCopy="Save movies and series from anywhere in the app and they will appear here in the new layout."
      accent="Watch later"
      clearLabel={`Clear watch later (${watchlist.length})`}
      onClear={() => {
        if (window.confirm(`Remove all ${watchlist.length} saved titles from watch later?`)) {
          clearWatchlist();
        }
      }}
      onRemove={removeFromWatchlist}
      EmptyIcon={BookmarkPlus}
      HeroIcon={Clapperboard}
    />
  );
}
