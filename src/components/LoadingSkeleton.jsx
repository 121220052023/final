const LoadingSkeleton = () => {
  return (
    <div className="movie-card">
      <div className="shimmer h-96 w-full"></div>
      <div className="p-4 space-y-2">
        <div className="shimmer h-6 w-3/4 rounded"></div>
        <div className="shimmer h-4 w-1/2 rounded"></div>
        <div className="shimmer h-4 w-full rounded"></div>
        <div className="shimmer h-4 w-full rounded"></div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;

