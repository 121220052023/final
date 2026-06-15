import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Mail, User, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
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
    <div className="min-h-screen bg-background pt-28">
      <div className="page-shell-wide grid gap-5 pb-16 lg:grid-cols-[29rem_minmax(0,1.1fr)]">
        <section className="editorial-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-8">
            <Link to="/" className="display-font text-3xl font-bold text-foreground">
              Ocean of Movies
            </Link>
            <h1 className="mt-6 text-2xl font-bold text-foreground">Create your account</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Build a personal front page with history-aware recommendations, likes, and watch later shelves.
            </p>
          </div>

          {success ? (
            <div className="rounded-[1.2rem] border border-green-500/20 bg-green-500/8 p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/20">
                <Mail className="h-6 w-6 text-green-500" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-foreground">Verify your email</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                We&apos;ve sent a verification link to <span className="font-semibold text-foreground">{email}</span>. 
                Please check your inbox to complete your registration.
              </p>
              <Link 
                to="/login"
                className="btn-primary mt-8 w-full justify-center"
              >
                Go to Sign in
              </Link>
            </div>
          ) : (
            <>
              {error ? (
                <div className="mb-4 rounded-[1.2rem] border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Username</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      className="auth-input"
                      placeholder="username"
                      required
                    />
                  </div>
                </div>


                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="auth-input"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      className="auth-input pr-12"
                      placeholder="At least 6 characters"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create account'}
                </button>
              </form>

              <p className="mt-6 text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-primary">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </section>

        <section className="editorial-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(47,128,145,0.14),transparent_22%),radial-gradient(circle_at_bottom_right,rgba(216,69,39,0.14),transparent_28%)]" />
          <div className="relative z-10 max-w-3xl">
            <div className="section-label">Why join</div>
            <h2 className="display-font mt-3 text-5xl font-bold leading-[0.92] md:text-6xl">
              Make the site remember your taste.
            </h2>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              The redesign is built around personal continuity: what you watched, what you saved for later, and which genres keep returning in your activity.
            </p>

            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {[
                {
                  title: 'For You page',
                  copy: 'A recommendation page generated from history, likes, and saved shelves.',
                },
                {
                  title: 'Watch later',
                  copy: 'Keep a focused library of titles you do not want to lose.',
                },
                {
                  title: 'Liked shelf',
                  copy: 'Save the movies and series you want the app to learn from.',
                },
                {
                  title: 'History memory',
                  copy: 'Pick up where you left off and keep improving recommendations over time.',
                },
              ].map((item) => (
                <div key={item.title} className="stat-tile">
                  <div className="display-font text-xl font-bold text-foreground">{item.title}</div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
