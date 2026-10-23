/**
 * authTypes.ts
 * ------------
 * Type definitions for authentication system
 */

export interface SecurityQuestion {
  question: string;
  answer: string;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  securityQuestions: SecurityQuestion[];
  createdAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  currentUser: User | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  confirmPassword: string;
  securityQuestions: SecurityQuestion[];
}

export interface SecurityAnswers {
  question1: string;
  answer1: string;
  question2: string;
  answer2: string;
}

export type AuthError =
  | 'invalid-email'
  | 'password-too-short'
  | 'passwords-not-match'
  | 'email-already-exists'
  | 'user-not-found'
  | 'invalid-password'
  | 'security-questions-required'
  | 'security-answers-incorrect'
  | 'unknown-error';

export interface AuthResult {
  success: boolean;
  error?: AuthError;
  user?: User;
}
