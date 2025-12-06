import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);

  const { signIn, signUp, signInWithProvider, signInWithMagicLink, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signIn(email, password);
      if (res.error) throw res.error;
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await signUp(email, password);
      if (res.error) throw res.error;
      setError('Check your email to confirm your account');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await signInWithMagicLink(email);
      if (res?.error) throw res.error;
      setError('Magic link sent! Check your inbox');
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await resetPassword(email);
      if (res?.error) throw res.error;
      setError('Password reset link sent if email exists');
      setResetMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-8 py-10 text-white">
            <h1 className="text-3xl font-bold text-center">Welcome to MyGarage</h1>
            <p className="text-orange-100 text-center mt-2 text-sm">Sign in or create your account</p>
          </div>

          <div className="px-8 pt-8 pb-10">
            {/* Error / Success Message */}
            {error && (
              <div
                className={`mb-6 p-4 rounded-lg text-sm font-medium transition-all ${
                  error.includes('sent') || error.includes('Check')
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {error}
              </div>
            )}

            {/* Reset Mode */}
            {resetMode ? (
              <div className="space-y-5">
                <h3 className="text-lg font-semibold text-gray-800">Reset Your Password</h3>
                <p className="text-sm text-gray-600">Enter your email and we'll send you a reset link.</p>
                <div className="flex gap-3">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                    required
                  />
                  <button
                    onClick={handleResetPassword}
                    disabled={loading}
                    className="px-6 py-3 bg-gray-900 text-white font-medium rounded-xl hover:bg-black transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Sending...' : 'Send'}
                  </button>
                </div>
                <button
                  onClick={() => setResetMode(false)}
                  className="text-orange-600 hover:text-orange-700 text-sm font-medium"
                >
                  ← Back to sign in
                </button>
              </div>
            ) : (
              <>
                {/* Login Form */}
                <form onSubmit={handleSignIn} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSignUp}
                      disabled={loading}
                      className="flex-1 py-3.5 border-2 border-orange-600 text-orange-600 hover:bg-orange-50 font-semibold rounded-xl transition"
                    >
                      Sign Up
                    </button>
                  </div>
                </form>

                {/* Divider */}
                <div className="my-8 flex items-center">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <span className="px-4 text-sm text-gray-500 font-medium">OR</span>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                {/* Social Login */}
                <div className="space-y-3">
                  <button
                    onClick={() => signInWithProvider('google')}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => signInWithProvider('facebook')}
                      className="flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
                    >
                      <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385h-3.047v-3.469h3.047v-2.637c0-3.007 1.791-4.668 4.532-4.668 1.313 0 2.372.103 2.372.103v2.605h-1.345c-1.312 0-1.719.816-1.719 1.652v1.945h2.926l-.467 3.469h-2.459v8.385c5.737-.899 10.125-5.864 10.125-11.854z"/>
                      </svg>
                      Facebook
                    </button>
                    <button
                      onClick={() => signInWithProvider('apple')}
                      className="flex items-center justify-center gap-2 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition font-medium"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53-1.74-2.53-.57-6.14 1.24-7.92 1.02-.99 2.43-1.61 3.86-1.61 1.42 0 2.31.91 3.47.91 1.18 0 1.51-.92 3.56-.92 1.3.01 2.39.85 3.18 2.15-2.74 1.63-2.31 4.86.68 6.39zm-4.18-12.3c.69-1.04.99-2.05.92-3.2-1.03.04-2.27.69-3.01 1.56-.66.79-1.23 1.78-1.08 2.83 1.14.09 2.31-.58 3.17-1.19z"/>
                      </svg>
                      Apple
                    </button>
                  </div>
                </div>

                {/* Links */}
                <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between text-sm">
                  <button
                    onClick={handleMagicLink}
                    disabled={loading}
                    className="text-orange-600 hover:text-orange-700 font-medium transition"
                  >
                    Send magic link
                  </button>
                  <button
                    onClick={() => setResetMode(true)}
                    className="text-gray-600 hover:text-gray-800 font-medium transition"
                  >
                    Forgot password?
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          By continuing, you agree to MyGarage's{' '}
          <a href="#" className="text-orange-600 hover:underline font-medium">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-orange-600 hover:underline font-medium">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}