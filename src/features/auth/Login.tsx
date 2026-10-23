/**
 * Login.tsx
 * ---------
 * Login page with email/password authentication
 */

import { useState, useEffect, type ReactElement, type FormEvent } from 'react';
import { login, getLastEmail } from './authService';
import type { AuthError } from './authTypes';
import { ForgotEmail } from './ForgotEmail';
import { ForgotPassword } from './ForgotPassword';

interface LoginProps {
  onLoginSuccess: () => void;
  onSwitchToSignup: () => void;
}

const ERROR_MESSAGES: Record<AuthError, string> = {
  'invalid-email': 'Please enter a valid email address',
  'password-too-short': 'Password must be at least 8 characters',
  'passwords-not-match': 'Passwords do not match',
  'email-already-exists': 'This email is already registered',
  'user-not-found': 'No account found with this email',
  'invalid-password': 'Incorrect password',
  'security-questions-required': 'Security questions are required',
  'security-answers-incorrect': 'Security answers are incorrect',
  'unknown-error': 'An unexpected error occurred',
};

export function Login({ onLoginSuccess, onSwitchToSignup }: LoginProps): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotEmail, setShowForgotEmail] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  // Pre-fill last used email
  useEffect(() => {
    const lastEmail = getLastEmail();
    if (lastEmail) {
      setEmail(lastEmail);
    }
  }, []);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    // Attempt login
    const result = login({ email, password });

    if (result.success) {
      onLoginSuccess();
    } else {
      setError(result.error ? ERROR_MESSAGES[result.error] : 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-space-950 bg-[url('/mars-bg.webp')] bg-cover bg-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md animate-fadeIn">
        <div className="rounded-lg border-2 border-mars-orange/50 bg-space-900/95 p-8 shadow-2xl shadow-mars-orange/20">
          {/* Header */}
          <div className="mb-6 text-center">
            <div className="mb-3 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-mars-red to-mars-deep shadow-glow">
                <span className="text-3xl" aria-hidden>🛰️</span>
              </div>
            </div>
            <h1 className="mb-1 font-mono text-2xl font-bold tracking-tight text-slate-100">
              MARS<span className="text-mars-orange">:</span> OUTPOST ZERO
            </h1>
            <p className="text-sm text-gray-400">Mission Control Access</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Message */}
            {error && (
              <div className="rounded-md border border-red-500/50 bg-red-950/50 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-space-600 bg-space-800 px-4 py-2 text-white placeholder-gray-500 focus:border-mars-orange focus:outline-none focus:ring-2 focus:ring-mars-orange/50"
                placeholder="astronaut@mars.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-space-600 bg-space-800 px-4 py-2 text-white placeholder-gray-500 focus:border-mars-orange focus:outline-none focus:ring-2 focus:ring-mars-orange/50"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-gradient-to-r from-mars-red to-mars-orange px-4 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-400">Don't have an account? </span>
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="font-semibold text-mars-orange hover:text-mars-red transition-colors"
            >
              Sign Up
            </button>
          </div>

          {/* Forgot Links */}
          <div className="mt-3 flex flex-wrap justify-center gap-4 text-xs">
            <button
              type="button"
              onClick={() => setShowForgotEmail(true)}
              className="text-gray-400 hover:text-mars-orange transition-colors underline"
            >
              Forgot Email?
            </button>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-gray-400 hover:text-mars-orange transition-colors underline"
            >
              Forgot Password?
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Email Modal */}
      {showForgotEmail && (
        <ForgotEmail
          onClose={() => setShowForgotEmail(false)}
          onSelectEmail={(selectedEmail) => {
            setEmail(selectedEmail);
            setError('');
          }}
        />
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPassword
          onClose={() => setShowForgotPassword(false)}
          onSuccess={() => {
            setError('');
            setPassword('');
          }}
          initialEmail={email}
        />
      )}
    </div>
  );
}
