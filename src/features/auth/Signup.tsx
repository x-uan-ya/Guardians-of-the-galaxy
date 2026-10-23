/**
 * Signup.tsx
 * ----------
 * Signup page with email/password/confirm password registration
 */

import { useState, type ReactElement, type FormEvent } from 'react';
import { signup, SECURITY_QUESTIONS } from './authService';
import type { AuthError, SecurityQuestion } from './authTypes';

interface SignupProps {
  onSignupSuccess: () => void;
  onSwitchToLogin: () => void;
}

const ERROR_MESSAGES: Record<AuthError, string> = {
  'invalid-email': 'Please enter a valid email address',
  'password-too-short': 'Password must be at least 8 characters',
  'passwords-not-match': 'Passwords do not match',
  'email-already-exists': 'This email is already registered',
  'user-not-found': 'No account found with this email',
  'invalid-password': 'Incorrect password',
  'security-questions-required': 'Please answer both security questions',
  'security-answers-incorrect': 'Security answers are incorrect',
  'unknown-error': 'An unexpected error occurred',
};

export function Signup({ onSignupSuccess, onSwitchToLogin }: SignupProps): ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityQuestion1, setSecurityQuestion1] = useState('');
  const [securityAnswer1, setSecurityAnswer1] = useState('');
  const [securityQuestion2, setSecurityQuestion2] = useState('');
  const [securityAnswer2, setSecurityAnswer2] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Basic validation
    if (!email || !password || !confirmPassword || !securityQuestion1 || !securityAnswer1 || !securityQuestion2 || !securityAnswer2) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    // Check that security questions are different
    if (securityQuestion1 === securityQuestion2) {
      setError('Please choose two different security questions');
      setIsLoading(false);
      return;
    }

    // Prepare security questions
    const securityQuestions: SecurityQuestion[] = [
      { question: securityQuestion1, answer: securityAnswer1 },
      { question: securityQuestion2, answer: securityAnswer2 },
    ];

    // Attempt signup
    const result = signup({ email, password, confirmPassword, securityQuestions });

    if (result.success) {
      onSignupSuccess();
    } else {
      setError(result.error ? ERROR_MESSAGES[result.error] : 'Signup failed');
    }

    setIsLoading(false);
  };

  // Real-time password validation feedback
  const passwordLengthValid = password.length >= 8 || password.length === 0;
  const passwordsMatchValid = password === confirmPassword || confirmPassword.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-space-950 bg-[url('/mars-bg.webp')] bg-cover bg-center bg-no-repeat overflow-y-auto">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm -z-10" />

      {/* Signup Card - Centered with min-height */}
      <div className="min-h-screen flex items-center justify-center py-8 px-4">
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
            <p className="text-sm text-gray-400">Create Your Account</p>
          </div>

          {/* Signup Form */}
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
                className={`w-full rounded-md border px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  passwordLengthValid
                    ? 'border-space-600 bg-space-800 focus:border-mars-orange focus:ring-mars-orange/50'
                    : 'border-red-500/50 bg-red-950/20 focus:border-red-500 focus:ring-red-500/50'
                }`}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
              />
              {password.length > 0 && !passwordLengthValid && (
                <p className="mt-1 text-xs text-red-400">
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div>
              <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-md border px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  passwordsMatchValid
                    ? 'border-space-600 bg-space-800 focus:border-mars-orange focus:ring-mars-orange/50'
                    : 'border-red-500/50 bg-red-950/20 focus:border-red-500 focus:ring-red-500/50'
                }`}
                placeholder="Re-enter your password"
                required
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && !passwordsMatchValid && (
                <p className="mt-1 text-xs text-red-400">
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Password Requirements */}
            <div className="rounded-md bg-space-800/50 p-3 text-xs text-gray-400">
              <p className="mb-1 font-semibold text-gray-300">Password Requirements:</p>
              <ul className="space-y-0.5 pl-4">
                <li className={password.length >= 8 ? 'text-green-400' : ''}>
                  • At least 8 characters
                </li>
              </ul>
            </div>

            {/* Security Questions */}
            <div className="rounded-md border border-mars-orange/30 bg-mars-deep/20 p-4 space-y-4">
              <p className="text-sm font-semibold text-mars-orange">Security Questions (for password recovery)</p>
              
              {/* Question 1 */}
              <div>
                <label htmlFor="security-q1" className="mb-1 block text-sm font-medium text-gray-300">
                  Security Question 1
                </label>
                <select
                  id="security-q1"
                  value={securityQuestion1}
                  onChange={(e) => setSecurityQuestion1(e.target.value)}
                  className="w-full rounded-md border border-space-600 bg-space-800 px-4 py-2 text-white focus:border-mars-orange focus:outline-none focus:ring-2 focus:ring-mars-orange/50 mb-2"
                  required
                >
                  <option value="">Select a question...</option>
                  {SECURITY_QUESTIONS.filter(q => q !== securityQuestion2).map((q, i) => (
                    <option key={i} value={q}>{q}</option>
                  ))}
                </select>
                <input
                  id="security-a1"
                  type="text"
                  value={securityAnswer1}
                  onChange={(e) => setSecurityAnswer1(e.target.value)}
                  className="w-full rounded-md border border-space-600 bg-space-800 px-4 py-2 text-white placeholder-gray-500 focus:border-mars-orange focus:outline-none focus:ring-2 focus:ring-mars-orange/50"
                  placeholder="Your answer"
                  required
                  disabled={!securityQuestion1}
                />
              </div>

              {/* Question 2 */}
              <div>
                <label htmlFor="security-q2" className="mb-1 block text-sm font-medium text-gray-300">
                  Security Question 2
                </label>
                <select
                  id="security-q2"
                  value={securityQuestion2}
                  onChange={(e) => setSecurityQuestion2(e.target.value)}
                  className="w-full rounded-md border border-space-600 bg-space-800 px-4 py-2 text-white focus:border-mars-orange focus:outline-none focus:ring-2 focus:ring-mars-orange/50 mb-2"
                  required
                >
                  <option value="">Select a question...</option>
                  {SECURITY_QUESTIONS.filter(q => q !== securityQuestion1).map((q, i) => (
                    <option key={i} value={q}>{q}</option>
                  ))}
                </select>
                <input
                  id="security-a2"
                  type="text"
                  value={securityAnswer2}
                  onChange={(e) => setSecurityAnswer2(e.target.value)}
                  className="w-full rounded-md border border-space-600 bg-space-800 px-4 py-2 text-white placeholder-gray-500 focus:border-mars-orange focus:outline-none focus:ring-2 focus:ring-mars-orange/50"
                  placeholder="Your answer"
                  required
                  disabled={!securityQuestion2}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !passwordLengthValid || !passwordsMatchValid}
              className="w-full rounded-md bg-gradient-to-r from-mars-red to-mars-orange px-4 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-gray-400">Already have an account? </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="font-semibold text-mars-orange hover:text-mars-red transition-colors"
            >
              Log In
            </button>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
