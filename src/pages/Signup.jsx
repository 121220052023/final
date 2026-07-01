import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const getErrorMessage = (err) => {
    const msg = err?.message || ''
    if (msg.includes('already registered') || msg.includes('already exists')) return 'An account with this email already exists. Sign in instead.'
    if (msg.includes('Invalid email')) return 'Enter a valid email address.'
    if (msg.includes('Password should be at least 6 characters')) return 'Password must be at least 6 characters.'
    if (msg.includes('rate_limit') || msg.includes('Too many')) return 'Too many attempts. Wait a moment.'
    if (msg.includes('network') || msg.includes('Network')) return 'Connection lost. Check your internet.'
    if (msg.includes('username') && msg.includes('already')) return 'This username is taken. Choose another.'
    return 'Failed to create account. Check your details and try again.'
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    if (!email.trim()) {
      setError('Enter your email address.')
      setLoading(false)
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.')
      setLoading(false)
      return
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.')
      setLoading(false)
      return
    }
    if (!username.trim()) {
      setError('Choose a username.')
      setLoading(false)
      return
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters.')
      setLoading(false)
      return
    }
    if (!/^[a-zA-Z]/.test(username)) {
      setError('Username must start with a letter.')
      setLoading(false)
      return
    }

    try {
      const data = await signUp({ email: email.trim(), password, username: username.trim() });
      if (data?.user) {
        fetch('/api/email/send', {
          method: 'POST',
          keepalive: true,
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': import.meta.env.VITE_USER_EVENT_KEY,
          },
          body: JSON.stringify({
            eventType: 'welcome',
            email: data.user.email,
            name: username.trim(),
          }),
        }).catch(() => {});
      }
      if (data?.user && !data?.session) {
        setSuccess(true);
      } else if (data?.user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle();
        if (profile?.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold text-foreground">
            Ocean of Movies
          </Link>
        </div>

        <div className="border border-border bg-card rounded-xl p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20 mb-4">
                <Mail className="h-6 w-6 text-green-500" />
              </div>
              <h2 className="text-lg font-bold text-foreground mb-2">Verify your email</h2>
              <p className="text-sm leading-6 text-muted-foreground mb-6">
                We&apos;ve sent a verification link to <span className="font-semibold text-foreground">{email}</span>.
                Check your inbox to complete registration.
              </p>
              <Link
                to="/login"
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 inline-flex items-center justify-center"
              >
                Go to Sign in
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-foreground mb-1">Create account</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Build your personal movie experience
              </p>

              {error ? (
                <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Username</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="w-full rounded-lg border border-border bg-transparent py-2.5 pl-10 pr-3.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px] focus:shadow-primary/15"
                      placeholder="username"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full rounded-lg border border-border bg-transparent py-2.5 pl-10 pr-3.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px] focus:shadow-primary/15"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="w-full rounded-lg border border-border bg-transparent py-2.5 pr-10 pl-3.5 text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px] focus:shadow-primary/15"
                      placeholder="At least 6 characters"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create account'}
                </button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-2 text-xs font-semibold uppercase text-muted-foreground">Or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-border bg-transparent py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-muted"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <p className="mt-5 text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}