import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Lock, Mail, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const benefitList = [
  'Personal For You recommendations',
  'Saved watch later and liked shelves',
  'Watch history that improves your front page',
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signIn({ email, password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-28">
      <div className="page-shell-wide grid gap-5 pb-16 lg:grid-cols-[minmax(0,1.05fr)_30rem]">
        <section className="editorial-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,69,39,0.16),transparent_24%),linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.08)_100%)]" />
          <div className="relative z-10 max-w-2xl">
            <div className="section-label">Sign in</div>
            <h1 className="display-font mt-3 text-5xl font-bold leading-[0.92] md:text-6xl">
              Return to your saved ocean.
            </h1>
            <p className="mt-5 text-base leading-8 text-muted-foreground">
              Continue where you stopped, reopen the titles you saved for later, and let the new For You page learn from your actual viewing habits.
            </p>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {benefitList.map((item) => (
                <div key={item} className="stat-tile flex items-start gap-3">
                  <Sparkles className="mt-1 h-4 w-4 text-primary" />
                  <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="editorial-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-8">
            <Link to="/" className="display-font text-3xl font-bold text-foreground">
              Ocean of Movies
            </Link>
            <h2 className="mt-6 text-2xl font-bold text-foreground">Welcome back</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Sign in to restore your shelves, history, and recommendations.
            </p>
          </div>

          {error ? (
            <div className="mb-4 rounded-[1.2rem] border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="auth-input pr-12"
                  placeholder="Your password"
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
              <div className="mt-2 flex justify-end">
                <Link to="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
            </button>
          </form>



          <p className="mt-6 text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-primary">
              Create one
            </Link>
          </p>
        </section>
      </div>
    </div>
  );
}
