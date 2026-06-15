SELECT column_name FROM information_schema.columns 
WHERE table_name = 'watch_requests' AND table_schema = 'public'
ORDER BY ordinal_position;