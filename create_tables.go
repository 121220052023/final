package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	connStr := "postgres://postgres.jqsoyffbqwiyggsvlfzk:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impxc295ZmZicXdpeWdnc3ZsZnprIiwicm9sZSI6InJvb3QiLCJpYXQiOjE3NzU1NjEzMzQsImV4cCI6MjA5MTEzNzMzNH0.LbTiz5z7i4tVd0OJTSpyhkEjd4LMJXavsxbyDULFxnU@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
	
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// Create watchlist table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS watchlist (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			movie_id TEXT NOT NULL,
			movie_type TEXT DEFAULT 'movie',
			title TEXT NOT NULL,
			poster_url TEXT,
			year TEXT,
			added_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(user_id, movie_id, movie_type)
		)
	`)
	if err != nil {
		log.Printf("Watchlist table error: %v", err)
	} else {
		fmt.Println("Watchlist table created!")
	}

	// Create liked_movies table
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS liked_movies (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id UUID NOT NULL,
			movie_id TEXT NOT NULL,
			movie_type TEXT DEFAULT 'movie',
			title TEXT NOT NULL,
			poster_url TEXT,
			year TEXT,
			liked_at TIMESTAMPTZ DEFAULT NOW(),
			UNIQUE(user_id, movie_id, movie_type)
		)
	`)
	if err != nil {
		log.Printf("Liked movies table error: %v", err)
	} else {
		fmt.Println("Liked movies table created!")
	}

	// Create policies for watchlist
	policies := []string{
		`CREATE POLICY IF NOT EXISTS "view_watchlist" ON watchlist FOR SELECT USING (true)`,
		`CREATE POLICY IF NOT EXISTS "add_watchlist" ON watchlist FOR INSERT WITH CHECK (true)`,
		`CREATE POLICY IF NOT EXISTS "delete_watchlist" ON watchlist FOR DELETE USING (true)`,
		`CREATE POLICY IF NOT EXISTS "view_liked" ON liked_movies FOR SELECT USING (true)`,
		`CREATE POLICY IF NOT EXISTS "add_liked" ON liked_movies FOR INSERT WITH CHECK (true)`,
		`CREATE POLICY IF NOT EXISTS "delete_liked" ON liked_movies FOR DELETE USING (true)`,
	}

	for _, p := range policies {
		_, err = db.Exec(p)
		if err != nil {
			log.Printf("Policy error: %v", err)
		}
	}
	fmt.Println("All policies created!")
}
