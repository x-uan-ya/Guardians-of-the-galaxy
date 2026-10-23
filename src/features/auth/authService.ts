/**
 * authService.ts
 * --------------
 * Authentication service for user management using localStorage
 */

import type { User, LoginCredentials, SignupCredentials, AuthResult, SecurityQuestion } from './authTypes';
import {
  isValidEmail,
  isValidPassword,
  passwordsMatch,
  hashPassword,
  verifyPassword,
} from './authValidation';

const USERS_STORAGE_KEY = 'mars-outpost-users';
const SESSION_STORAGE_KEY = 'mars-outpost-session';

/**
 * Available security questions
 */
export const SECURITY_QUESTIONS = [
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
  "What is your favorite color?",
  "What was your first car model?",
  "What is your favorite food?",
  "What high school did you attend?",
  "What is your favorite movie?",
] as const;

/**
 * Get all registered users from localStorage
 */
function getUsers(): User[] {
  try {
    const data = localStorage.getItem(USERS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Get security questions for a user (without answers)
 */
export function getUserSecurityQuestions(email: string): string[] {
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user || !user.securityQuestions) {
    return [];
  }
  
  return user.securityQuestions.map(sq => sq.question);
}
export function getAllRegisteredEmails(): string[] {
  const users = getUsers();
  return users.map(u => u.email);
}

/**
 * Save last used email for convenience
 */
export function saveLastEmail(email: string): void {
  try {
    localStorage.setItem('mars-outpost-last-email', email);
  } catch {
    // Storage unavailable - silently fail
  }
}

/**
 * Get last used email
 */
export function getLastEmail(): string | null {
  try {
    return localStorage.getItem('mars-outpost-last-email');
  } catch {
    return null;
  }
}

/**
 * Verify security answers for a user
 */
export function verifySecurityAnswers(email: string, answers: SecurityQuestion[]): AuthResult {
  // Find user
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { success: false, error: 'user-not-found' };
  }

  // Check if user has security questions
  if (!user.securityQuestions || user.securityQuestions.length < 2) {
    return { success: false, error: 'security-questions-required' };
  }

  // Verify each answer
  for (const providedAnswer of answers) {
    const storedQuestion = user.securityQuestions.find(
      sq => sq.question === providedAnswer.question
    );

    if (!storedQuestion) {
      return { success: false, error: 'security-answers-incorrect' };
    }

    // Normalize and verify answer
    const normalizedAnswer = providedAnswer.answer.toLowerCase().trim();
    if (!verifyPassword(normalizedAnswer, storedQuestion.answer)) {
      return { success: false, error: 'security-answers-incorrect' };
    }
  }

  return { success: true, user };
}

/**
 * Reset password for an existing user (requires security verification first)
 */
export function resetPassword(email: string, newPassword: string): AuthResult {
  // Validate email
  if (!isValidEmail(email)) {
    return { success: false, error: 'invalid-email' };
  }

  // Validate new password
  if (!isValidPassword(newPassword)) {
    return { success: false, error: 'password-too-short' };
  }

  // Find user
  const users = getUsers();
  const target = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!target) {
    return { success: false, error: 'user-not-found' };
  }

  // Update password
  target.passwordHash = hashPassword(newPassword);
  saveUsers(users);

  return { success: true, user: target };
}

/**
 * Save users to localStorage
 */
function saveUsers(users: User[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // Storage unavailable - silently fail
  }
}

/**
 * Generate unique user ID
 */
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Sign up a new user
 */
export function signup(credentials: SignupCredentials): AuthResult {
  const { email, password, confirmPassword, securityQuestions } = credentials;

  // Validate email
  if (!isValidEmail(email)) {
    return { success: false, error: 'invalid-email' };
  }

  // Validate password length
  if (!isValidPassword(password)) {
    return { success: false, error: 'password-too-short' };
  }

  // Check passwords match
  if (!passwordsMatch(password, confirmPassword)) {
    return { success: false, error: 'passwords-not-match' };
  }

  // Validate security questions
  if (!securityQuestions || securityQuestions.length < 2) {
    return { success: false, error: 'security-questions-required' };
  }

  // Check if user already exists
  const users = getUsers();
  const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    return { success: false, error: 'email-already-exists' };
  }

  // Hash security answers for storage
  const hashedSecurityQuestions = securityQuestions.map(sq => ({
    question: sq.question,
    answer: hashPassword(sq.answer.toLowerCase().trim()), // Normalize and hash
  }));

  // Create new user
  const newUser: User = {
    id: generateUserId(),
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    securityQuestions: hashedSecurityQuestions,
    createdAt: new Date().toISOString(),
  };

  // Save user
  users.push(newUser);
  saveUsers(users);

  // Auto-login after signup
  saveSession(newUser);
  saveLastEmail(newUser.email);

  return { success: true, user: newUser };
}

/**
 * Log in an existing user
 */
export function login(credentials: LoginCredentials): AuthResult {
  const { email, password } = credentials;

  // Validate email
  if (!isValidEmail(email)) {
    return { success: false, error: 'invalid-email' };
  }

  // Find user
  const users = getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return { success: false, error: 'user-not-found' };
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    return { success: false, error: 'invalid-password' };
  }

  // Save session
  saveSession(user);
  saveLastEmail(user.email);

  return { success: true, user };
}

/**
 * Log out current user
 */
export function logout(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Storage unavailable - silently fail
  }
}

/**
 * Get current session
 */
export function getCurrentSession(): User | null {
  try {
    const data = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!data) return null;

    const sessionData = JSON.parse(data);
    
    // Verify user still exists
    const users = getUsers();
    const user = users.find(u => u.id === sessionData.userId);
    
    return user || null;
  } catch {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getCurrentSession() !== null;
}

/**
 * Save session to localStorage
 */
function saveSession(user: User): void {
  try {
    const sessionData = {
      userId: user.id,
      timestamp: Date.now(),
    };
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
  } catch {
    // Storage unavailable - silently fail
  }
}
