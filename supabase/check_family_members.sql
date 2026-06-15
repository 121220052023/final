SELECT column_name FROM information_schema.columns 
WHERE table_name = 'family_members' AND table_schema = 'public'
ORDER BY ordinal_position;