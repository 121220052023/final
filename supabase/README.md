# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up
2. Create a new project
3. Wait for the database to be provisioned

## 2. Get Your Credentials

Go to **Project Settings > API** and copy:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon/public key** → `VITE_SUPABASE_ANON_KEY`

## 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 4. Run the SQL Schema

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Copy the entire contents of `supabase/schema.sql`
4. Paste and click **Run**
5. Verify all tables, policies, and functions were created successfully

## 5. Enable Auth Providers

Go to **Authentication > Providers** and enable:
- **Email** (enabled by default)
- **Google** - Add your Google OAuth credentials
- **GitHub** - Add your GitHub OAuth credentials

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase

### GitHub OAuth Setup
1. Go to [GitHub Settings > Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set callback URL: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase

## 6. Verify Setup

1. Sign up a new user through the app
2. Check the **Authentication > Users** table in Supabase
3. Check the **Table Editor** to verify the `profiles` table was auto-populated
4. All RLS policies should be active

## Database Tables Created

| Table | Purpose |
|---|---|
| `profiles` | User profiles with username, avatar, role |
| `watchlist` | Cloud-synced watchlist |
| `liked_movies` | Cloud-synced liked movies |
| `watch_history` | Viewing progress tracking |
| `reviews` | Movie reviews and ratings |
| `review_likes` | Review like tracking |
| `collections` | User-curated movie lists |
| `collection_movies` | Movies in collections |
| `family_groups` | Parental control groups |
| `family_members` | Parent/child membership |
| `parental_settings` | Content filtering rules |
| `child_profiles` | Per-child overrides |
| `watch_requests` | Approval queue |
| `activity_logs` | Parental monitoring |
| `notifications` | In-app notifications |

## Helper Functions

- `is_parent(uuid)` - Check if user is a parent
- `is_child(uuid)` - Check if user is a child
- `get_effective_max_rating(uuid)` - Get child's effective rating limit
- `is_bedtime(uuid)` - Check if child is in bedtime hours
- `has_remaining_watch_time(uuid)` - Check if child has watch time left
