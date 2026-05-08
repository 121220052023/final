import { Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getBackdropUrl,
  getDisplayTitle,
  getMediaId,
  getPosterUrl,
  getPrimaryGenre,
  getTypeLabel,
  getYear,
} from '../utils/media';

export default function SavedShelfPage({
  title,
  description,
  items,
  emptyTitle,
  emptyCopy,
  accent = 'Saved Shelf',
  clearLabel,
  onClear,
  onRemove,
  EmptyIcon,
  HeroIcon,
}) {
  const navigate = useNavigate();
  const heroItem = items[0] || null;

  return (
    <div className="pb-20 pt-28">
      <div className="page-shell-wide space-y-10">
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(22rem,0.7fr)]">
          <div className="editorial-panel relative overflow-hidden rounded-[2rem]">
            <div className="grid min-h-[24rem] lg:grid-cols-[1.05fr_0.95fr]">
              <div className="relative flex flex-col justify-between p-6 sm:p-8 lg:p-10">
                <div className="section-label">{accent}</div>
                <div className="mt-6">
                  <h1 className="display-font text-5xl font-bold leading-[0.92] md:text-6xl">{title}</h1>
                  <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">{description}</p>
                </div>
                <div className="mt-8 flex flex-wrap gap-3">
                  <div className="stat-tile min-w-[11rem]">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Titles saved</div>
                    <div className="mt-2 text-3xl font-bold text-foreground">{items.length}</div>
                  </div>
                  {heroItem ? (
                    <div className="stat-tile min-w-[11rem]">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Lead genre</div>
                      <div className="mt-2 text-2xl font-bold text-foreground">{getPrimaryGenre(heroItem)}</div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="relative min-h-[18rem]">
                {heroItem ? (
                  <>
                    <img
                      src={getBackdropUrl(heroItem)}
                      alt={getDisplayTitle(heroItem)}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,18,20,0.08)_0%,rgba(17,18,20,0.18)_28%,rgba(17,18,20,0.68)_100%)]" />
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center bg-surface-container">
                    {HeroIcon ? <HeroIcon className="h-16 w-16 text-primary" /> : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="editorial-panel rounded-[2rem] p-6 sm:p-8">
            <div className="section-label">Actions</div>
            <div className="mt-5 space-y-4">
              <button onClick={() => navigate('/for-you')} className="btn-primary w-full justify-between px-5 py-3.5">
                Open For You
              </button>
              <button onClick={() => navigate('/history')} className="btn-secondary w-full justify-between px-5 py-3.5">
                Open history
              </button>
              {items.length > 0 && onClear ? (
                <button onClick={onClear} className="btn-secondary w-full justify-between px-5 py-3.5 text-red-400">
                  {clearLabel}
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {items.length === 0 ? (
          <section className="editorial-panel rounded-[2rem] p-10 text-center">
            {EmptyIcon ? <EmptyIcon className="mx-auto h-16 w-16 text-primary" /> : null}
            <h2 className="display-font mt-6 text-3xl font-bold text-foreground">{emptyTitle}</h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-8 text-muted-foreground">{emptyCopy}</p>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {items.map((item) => (
              <article key={getMediaId(item)} className="movie-card overflow-hidden rounded-[1.5rem]">
                <button onClick={() => navigate(`/movie/${getMediaId(item)}`, { state: { type: item.Type || 'movie' } })} className="group block w-full text-left">
                  <div className="aspect-[0.74] overflow-hidden">
                    <img
                      src={getPosterUrl(item)}
                      alt={getDisplayTitle(item)}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                </button>

                <div className="space-y-4 p-4">
                  <div>
                    <button
                      onClick={() => navigate(`/movie/${getMediaId(item)}`, { state: { type: item.Type || 'movie' } })}
                      className="display-font text-left text-xl font-bold text-foreground hover:text-primary"
                    >
                      {getDisplayTitle(item)}
                    </button>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {getTypeLabel(item)} • {getPrimaryGenre(item)} • {getYear(item)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/watch/${getMediaId(item)}`, { state: { type: item.Type || 'movie' } })}
                      className="btn-primary flex-1 justify-center px-4 py-2 text-sm"
                    >
                      Watch
                    </button>
                    {onRemove ? (
                      <button
                        onClick={() => onRemove(getMediaId(item))}
                        className="btn-secondary px-4 py-2 text-sm text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
