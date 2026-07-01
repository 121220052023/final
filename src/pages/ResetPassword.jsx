import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, Lock, CheckCircle2, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [recovering, setRecovering] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const recoverSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          if (!cancelled) setSessionReady(true);
        } else {
          const hash = window.location.hash;
          if (hash && hash.includes('type=recovery')) {
            await new Promise(r => setTimeout(r, 2000));
            const { data: { session: s } } = await supabase.auth.getSession();
            if (s?.user && !cancelled) {
              setSessionReady(true);
            } else if (!cancelled) {
              setError('Could not verify your reset link. It may have expired. Please request a new one.');
            }
          } else {
            if (!cancelled) setError('Invalid or missing reset link. Please request a new password reset.');
          }
        }
      } catch {
        if (!cancelled) setError('Something went wrong. Please request a new reset link.');
      } finally {
        if (!cancelled) setRecovering(false);
      }
    };

    recoverSession();
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update password. Your reset link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (recovering) {
    return (
      <div className="min-h-screen bg-background pt-28">
        <div className="mx-auto max-w-md px-6">
          <section className="editorial-panel rounded-[2rem] p-6 sm:p-8 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Verifying your reset link...</p>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-28">
      <div className="mx-auto max-w-md px-6">
        <section className="editorial-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Set new password</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {sessionReady ? 'Enter your new password below.' : 'Use the link from your email to reset your password.'}
            </p>
          </div>

          {!sessionReady ? (
            <div className="rounded-[1.2rem] border border-amber-500/20 bg-amber-500/8 p-6 text-center">
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" />
              <p className="mt-3 text-sm text-muted-foreground">{error || 'Session not found.'}</p>
              <p className="mt-4 text-sm">
                <button onClick={() => navigate('/forgot-password')} className="font-semibold text-primary hover:underline">
                  Request a new reset link
                </button>
              </p>
            </div>
          ) : success ? (
            <div className="rounded-[1.2rem] border border-green-500/20 bg-green-500/8 p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-bold text-foreground">Password updated!</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Your password has been reset successfully. Redirecting you to sign in...
              </p>
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
                  <label className="mb-2 block text-sm font-semibold text-foreground">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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

                <div>
                  <label className="mb-2 block text-sm font-semibold text-foreground">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="auth-input pr-12"
                      placeholder="Confirm your new password"
                      minLength={6}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update password'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
