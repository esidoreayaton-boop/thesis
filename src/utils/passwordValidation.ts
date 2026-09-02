/**
 * Password Validation Utility
 * Rule: Minimum 8 characters total, must contain at least:
 * - 1 uppercase letter (A-Z)
 * - 1 lowercase letter (a-z)
 * - 1 number (0-9)
 * - 1 special character (!@#$%^&* etc.)
 */
export function validatePasswordComplexity(password: string): { isValid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least 1 uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least 1 lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least 1 numeric digit (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least 1 special character (e.g. @, $, !, %, *, #, ?, &).' };
  }
  return { isValid: true };
}
