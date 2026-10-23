/**
 * ForgotPassword.tsx
 * ------------------
 * Two-step password reset: verify security questions, then reset password
 */

import { useState, type ReactElement, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { resetPassword, verifySecurityAnswers, getUserSecurityQuestions, getAllRegisteredEmails } from './authService';
import type { AuthError, SecurityQuestion } from './authTypes';

interface ForgotPasswordProps {
  onClose: () => void;
  onSuccess: () => void;
  initialEmail?: string;
}

const ERROR_MESSAGES: Record<AuthError, string> = {
  'invalid-email': 'Please enter a valid email address',
  'password-too-short': 'New password must be at least 8 characters',
  'passwords-not-match': 'Passwords do not match',
  'email-already-exists': 'This email is already registered',
  'user-not-found': 'No account found with this email address',
  'invalid-password': 'Incorrect password',
  'security-questions-required': 'Please answer all security questions',
  'security-answers-incorrect': 'Security answers are incorrect. Please try again.',
  'unknown-error': 'An unexpected error occurred',
};

type Step = 'email' | 'security' | 'password' | 'success';

export function ForgotPassword({ onClose, onSuccess, initialEmail = '' }: ForgotPasswordProps): ReactElement {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState(initialEmail);
  const [securityQuestions, setSecurityQuestions] = useState<string[]>([]);
  const [answer1, setAnswer1] = useState('');
  const [answer2, setAnswer2] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const registeredEmails = getAllRegisteredEmails();

  const handleEmailSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!email) {
      setError('Please enter your email');
      setIsLoading(false);
      return;
    }

    // Get user's security questions
    const questions = getUserSecurityQuestions(email);
    
    if (questions.length === 0) {
      setError('No account found with this email address');
      setIsLoading(false);
      return;
    }

    setSecurityQuestions(questions);
    setStep('security');
    setIsLoading(false);
  };

  const handleSecuritySubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!answer1 || !answer2) {
      setError('Please answer both security questions');
      setIsLoading(false);
      return;
    }

    // Verify security answers
    const answers: SecurityQuestion[] = [
      { question: securityQuestions[0] ?? '', answer: answer1 },
      { question: securityQuestions[1] ?? '', answer: answer2 },
    ];

    const result = verifySecurityAnswers(email, answers);

    if (result.success) {
      setStep('password');
    } else {
      setError(result.error ? ERROR_MESSAGES[result.error] : 'Verification failed');
    }

    setIsLoading(false);
  };

  const handlePasswordSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    // Reset password
    const result = resetPassword(email, newPassword);

    if (result.success) {
      setStep('success');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } else {
      setError(result.error ? ERROR_MESSAGES[result.error] : 'Password reset failed');
    }

    setIsLoading(false);
  };

  const passwordValid = newPassword.length >= 8 || newPassword.length === 0;
  const passwordsMatch = newPassword === confirmPassword || confirmPassword.length === 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md rounded-lg border-2 border-mars-orange/50 bg-space-900/95 p-6 shadow-2xl shadow-mars-orange/20 animate-fadeIn">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-4">
          <h2 className="text-xl font-bold text-white mb-2">Reset Password</h2>
          <p className="text-sm text-gray-400">
            {step === 'email' && 'Enter your email to begin'}
            {step === 'security' && 'Answer your security questions'}
            {step === 'password' && 'Create a new password'}
            {step === 'success' && 'Password reset successful!'}
          </p>
        </div>

        {/* Step Indicator */}
        {step !== 'success' && (
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className={`h-2 w-2 rounded-full ${step === 'email' ? 'bg-mars-orange' : 'bg-gray-600'}`} />
            <div className={`h-2 w-2 rounded-full ${step === 'security' ? 'bg-mars-orange' : 'bg-gray-600'}`} />
            <div className={`h-2 w-2 rounded-full ${step === 'password' ? 'bg-mars-orange' : 'bg-gray-600'}`} />
          </div>
        )}

        {/* Success Message */}
        {step === 'success' && (
          <div className="rounded-md border border-green-500/50 bg-green-950/50 p-4 text-center">
            <div className="text-4xl mb-2">✅</div>
            <p className="font-semibold text-green-400 mb-1">Password Reset Successful!</p>
            <p className="text-sm text-green-300">Redirecting to login...</p>
          </div>
        )}

        {/* Step 1: Email */}
        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-500/50 bg-red-950/50 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="reset-email" className="mb-1 block text-sm font-medium text-gray-300">
                Email Address
              </label>
              <input
                id="reset-email"
                type="email"
                list="registered-emails"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-space-600 bg-space-800 px-4 py-2 text-white placeholder-gray-500 focus:border-mars-orange focus:outline-none focus:ring-2 focus:ring-mars-orange/50"
                placeholder="Enter your email"
                required
                autoComplete="email"
              />
              <datalist id="registered-emails">
                {registeredEmails.map((e, i) => (
                  <option key={i} value={e} />
                ))}
              </datalist>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-gradient-to-r from-mars-red to-mars-orange px-4 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Checking...' : 'Continue'}
            </button>
          </form>
        )}

        {/* Step 2: Security Questions */}
        {step === 'security' && (
          <form onSubmit={handleSecuritySubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-500/50 bg-red-950/50 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="rounded-md bg-space-800/50 p-3 text-xs text-gray-400 mb-4">
              <p><strong className="text-gray-300">Email:</strong> {email}</p>
            </div>

            <div>
              <label htmlFor="answer1" className="mb-1 block text-sm font-medium text-gray-300">
                {securityQuestions[0]}
              </label>
              <input
                id="answer1"
                type="text"
                value={answer1}
                onChange={(e) => setAnswer1(e.target.value)}
                className="w-full rounded-md border border-space-600 bg-space-800 px-4 py-2 text-white placeholder-gray-500 focus:border-mars-orange focus:outline-none focus:ring-2 focus:ring-mars-orange/50"
                placeholder="Your answer"
                required
              />
            </div>

            <div>
              <label htmlFor="answer2" className="mb-1 block text-sm font-medium text-gray-300">
                {securityQuestions[1]}
              </label>
              <input
                id="answer2"
                type="text"
                value={answer2}
                onChange={(e) => setAnswer2(e.target.value)}
                className="w-full rounded-md border border-space-600 bg-space-800 px-4 py-2 text-white placeholder-gray-500 focus:border-mars-orange focus:outline-none focus:ring-2 focus:ring-mars-orange/50"
                placeholder="Your answer"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-md bg-gradient-to-r from-mars-red to-mars-orange px-4 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify Answers'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setAnswer1('');
                setAnswer2('');
                setError('');
              }}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
              ← Back to email
            </button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md border border-red-500/50 bg-red-950/50 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="rounded-md bg-green-950/30 border border-green-500/50 p-3 text-xs text-green-400 mb-4">
              <p>✓ Security verification passed!</p>
            </div>

            <div>
              <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-gray-300">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full rounded-md border px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  passwordValid
                    ? 'border-space-600 bg-space-800 focus:border-mars-orange focus:ring-mars-orange/50'
                    : 'border-red-500/50 bg-red-950/20 focus:border-red-500 focus:ring-red-500/50'
                }`}
                placeholder="At least 8 characters"
                required
                autoComplete="new-password"
              />
              {newPassword.length > 0 && !passwordValid && (
                <p className="mt-1 text-xs text-red-400">
                  Password must be at least 8 characters
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirm-new-password" className="mb-1 block text-sm font-medium text-gray-300">
                Confirm New Password
              </label>
              <input
                id="confirm-new-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full rounded-md border px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${
                  passwordsMatch
                    ? 'border-space-600 bg-space-800 focus:border-mars-orange focus:ring-mars-orange/50'
                    : 'border-red-500/50 bg-red-950/20 focus:border-red-500 focus:ring-red-500/50'
                }`}
                placeholder="Re-enter new password"
                required
                autoComplete="new-password"
              />
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-1 text-xs text-red-400">
                  Passwords do not match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !passwordValid || !passwordsMatch}
              className="w-full rounded-md bg-gradient-to-r from-mars-red to-mars-orange px-4 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
