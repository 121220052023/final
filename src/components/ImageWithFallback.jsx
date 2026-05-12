import { useState } from 'react';
import { ImageOff } from 'lucide-react';

export default function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackText = 'No Image',
  icon: Icon = ImageOff,
}) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex flex-col items-center justify-center bg-surface-container text-muted-foreground ${className}`}>
        <Icon className="h-10 w-10 mb-2 opacity-40" />
        {fallbackText && <span className="text-xs font-medium opacity-50">{fallbackText}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
