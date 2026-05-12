import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { resetPassword } = useAuth();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await resetPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-28">
      <div className="mx-auto max-w-md px-6">
        <section className="editorial-panel rounded-[2rem] p-6 sm:p-8">
          <div className="mb-8">
            <Link 
              to="/login" 
              className="group mb-6 flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to Sign in
            </Link>
            <h1 className="text-2xl font-bold text-foreground">Forgot password?</h1>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="rounded-[1.2rem] border border-green-500/20 bg-green-500/8 p-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-bold text-foreground">Check your email</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                We've sent a password reset link to <span className="font-semibold text-foreground">{email}</span>.
              </p>
              <button 
                onClick={() => setSuccess(false)}
                className="mt-6 text-sm font-semibold text-primary hover:underline"
              >
                Didn't receive the email? Try again
              </button>
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

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
