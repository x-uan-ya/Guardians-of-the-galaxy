/**
 * ForgotEmail.tsx
 * ---------------
 * Modal showing all registered email addresses on this device
 */

import { type ReactElement } from 'react';
import { X } from 'lucide-react';
import { getAllRegisteredEmails } from './authService';

interface ForgotEmailProps {
  onClose: () => void;
  onSelectEmail: (email: string) => void;
}

export function ForgotEmail({ onClose, onSelectEmail }: ForgotEmailProps): ReactElement {
  const emails = getAllRegisteredEmails();

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
          <h2 className="text-xl font-bold text-white mb-2">Registered Email Addresses</h2>
          <p className="text-sm text-gray-400">
            Here are all the accounts registered on this device:
          </p>
        </div>

        {/* Email List */}
        {emails.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {emails.map((email, index) => (
              <button
                key={index}
                onClick={() => {
                  onSelectEmail(email);
                  onClose();
                }}
                className="w-full text-left rounded-md border border-space-600 bg-space-800 px-4 py-3 text-white hover:border-mars-orange hover:bg-space-700 transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-mars-orange">📧</span>
                  <span className="font-mono text-sm">{email}</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-yellow-600/50 bg-yellow-950/30 p-4 text-sm text-yellow-400">
            <p className="font-semibold mb-1">No accounts found</p>
            <p>No accounts have been created on this device yet.</p>
          </div>
        )}

        {/* Help Text */}
        <div className="mt-4 rounded-md bg-space-800/50 p-3 text-xs text-gray-400">
          <p className="mb-1"><strong className="text-gray-300">Note:</strong> These are accounts stored locally in your browser.</p>
          <p>Click an email to auto-fill it on the login page.</p>
        </div>
      </div>
    </div>
  );
}
