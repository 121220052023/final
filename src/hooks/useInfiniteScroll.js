import { useState, useEffect, useCallback, useRef } from 'react';

export function useInfiniteScroll(fetchFn, options = {}) {
  const { initialPage = 1, enabled = true } = options;
  
  const [data, setData] = useState([]);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  
  const observer = useRef();
  const loadingRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && enabled) {
        setPage(prev => prev + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, enabled]);

  useEffect(() => {
    if (!enabled) return;
    
    const fetchData = async () => {
      try {
        setError(null);
        const result = await fetchFn(page);
        const items = result.results || [];
        
        if (page === 1) {
          setData(items);
        } else {
          setData(prev => [...prev, ...items]);
        }
        
        // TMDB returns total_pages, check if we have more
        setHasMore(page < (result.total_pages || 1));
      } catch (err) {
        console.error('Infinite scroll fetch error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, enabled, fetchFn]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setLoading(true);
    setHasMore(true);
    setError(null);
  }, []);

  return { data, loading, hasMore, loadingRef, error, reset };
}
