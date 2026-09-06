/**
 * Password Validation Utility
 * Rule: Minimum 8 characters total, must contain at least:
 * - 1 uppercase letter (A-Z)
 * - 1 lowercase letter (a-z)
 * - 1 number (0-9)
 * - 1 special character (!@#$%^&* etc.)
 */
export function validatePasswordComplexity(password: string): { isValid: boolean; error?: string; message?: string } {
  if (!password || password.length < 8) {
    const msg = 'Password must be at least 8 characters long.';
    return { isValid: false, error: msg, message: msg };
  }
  if (!/[A-Z]/.test(password)) {
    const msg = 'Password must contain at least 1 uppercase letter (A-Z).';
    return { isValid: false, error: msg, message: msg };
  }
  if (!/[a-z]/.test(password)) {
    const msg = 'Password must contain at least 1 lowercase letter (a-z).';
    return { isValid: false, error: msg, message: msg };
  }
  if (!/[0-9]/.test(password)) {
    const msg = 'Password must contain at least 1 numeric digit (0-9).';
    return { isValid: false, error: msg, message: msg };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    const msg = 'Password must contain at least 1 special character (e.g. @, $, !, %, *, #, ?, &).';
    return { isValid: false, error: msg, message: msg };
  }
  return { isValid: true };
}
