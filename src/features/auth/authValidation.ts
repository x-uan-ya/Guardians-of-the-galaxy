/**
 * authValidation.ts
 * -----------------
 * Validation utilities for authentication
 */

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password meets requirements (at least 8 characters)
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Check if passwords match
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}

/**
 * Simple hash function for passwords (NOTE: In production, use proper bcrypt/argon2)
 * For this demo, we'll use a simple hash
 */
export function hashPassword(password: string): string {
  // Simple hash for demo purposes - in production use bcrypt
  let hash = 0;
  const combined = password + 'mars-salt-2024';
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Verify password against hash
 */
export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
