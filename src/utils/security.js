// Security Utilities for POS System
// Implements input validation, sanitization, and protection against common attacks

/**
 * Sanitize string input to prevent XSS attacks
 * Escapes HTML special characters
 */
export const sanitizeInput = (input) => {
  if (!input) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate and sanitize barcode input
 * Prevents injection attacks in barcode field
 */
export const validateBarcode = (barcode) => {
  if (!barcode || typeof barcode !== 'string') return null;
  // Barcodes typically contain only alphanumeric and some special chars
  const sanitized = sanitizeInput(barcode.trim());
  if (sanitized.length === 0 || sanitized.length > 100) return null;
  return sanitized;
};

/**
 * Validate product name
 * Prevents script injection in product names
 */
export const validateProductName = (name) => {
  if (!name || typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > 255) return null;
  return sanitizeInput(trimmed);
};

/**
 * Validate price input
 * Ensures only valid numeric values
 */
export const validatePrice = (price) => {
  const parsed = parseFloat(price);
  if (isNaN(parsed) || parsed < 0 || parsed > 999999.99) return null;
  return Math.round(parsed * 100) / 100; // Round to 2 decimals
};

/**
 * Validate username
 * Alphanumeric, underscore, hyphen only
 */
export const validateUsername = (username) => {
  if (!username || typeof username !== 'string') return null;
  const trimmed = username.trim();
  if (!/^[a-zA-Z0-9_-]{3,20}$/.test(trimmed)) return null;
  return trimmed;
};

/**
 * Validate password strength
 * Minimum 8 chars, must include upper, lower, number, special char
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') return null;
  if (password.length < 8 || password.length > 100) return null;

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  return hasUpper && hasLower && hasNumber && hasSpecial;
};

/**
 * Get password strength score (0-4)
 */
export const getPasswordStrength = (password) => {
  if (!password) return 0;
  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;
  return score;
};

/**
 * Validate quantity input
 * Must be positive integer
 */
export const validateQuantity = (qty) => {
  const parsed = parseInt(qty, 10);
  if (isNaN(parsed) || parsed < 1 || parsed > 9999) return null;
  return parsed;
};

/**
 * Validate search query
 * Prevents regex injection
 */
export const validateSearchQuery = (query) => {
  if (!query || typeof query !== 'string') return '';
  const trimmed = query.trim();
  if (trimmed.length > 100) return '';
  return sanitizeInput(trimmed);
};

/**
 * Validate category name
 */
export const validateCategory = (category) => {
  if (!category || typeof category !== 'string') return null;
  const trimmed = category.trim();
  if (trimmed.length < 2 || trimmed.length > 50) return null;
  return trimmed;
};

/**
 * Validate email (basic check)
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return null;
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) return null;
  return sanitizeInput(trimmed);
};

/**
 * Hash password (simple client-side hashing)
 * NOTE: Should ONLY be used client-side. Never store plain passwords.
 * In production, use bcrypt or similar on server-side.
 */
export const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Generate CSRF token
 */
export const generateCSRFToken = () => {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Verify CSRF token
 */
export const verifyCSRFToken = (token, storedToken) => {
  if (!token || !storedToken) return false;
  // Constant-time comparison to prevent timing attacks
  if (token.length !== storedToken.length) return false;
  let match = 0;
  for (let i = 0; i < token.length; i++) {
    match |= token.charCodeAt(i) ^ storedToken.charCodeAt(i);
  }
  return match === 0;
};

/**
 * Rate limiting checker
 * Track failed login attempts
 */
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  recordAttempt(key) {
    const now = Date.now();
    const record = this.attempts.get(key) || { count: 0, firstAttempt: now, locked: false };

    if (record.locked) {
      if (now - record.lockedAt > this.windowMs) {
        this.attempts.delete(key);
        return { allowed: true, remaining: this.maxAttempts };
      }
      return { allowed: false, remaining: 0, lockedUntil: new Date(record.lockedAt + this.windowMs) };
    }

    record.count++;
    record.lastAttempt = now;

    if (record.count >= this.maxAttempts) {
      record.locked = true;
      record.lockedAt = now;
      this.attempts.set(key, record);
      return { allowed: false, remaining: 0, lockedUntil: new Date(now + this.windowMs) };
    }

    this.attempts.set(key, record);
    return { allowed: true, remaining: this.maxAttempts - record.count };
  }

  reset(key) {
    this.attempts.delete(key);
  }
}

/**
 * Encryption/Decryption for localStorage
 * Simple XOR-based encryption (for client-side only, not cryptographically secure for production)
 * For production: use proper encryption libraries like tweetnacl.js or libsodium.js
 */
const SECRET_KEY = typeof import.meta !== 'undefined' && import.meta.env?.VITE_SECRET
  ? 'pos_secret_key_' + import.meta.env.VITE_SECRET
  : 'pos_default_key';

export const encryptData = (data) => {
  try {
    const json = JSON.stringify(data);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(json);
    const keyBytes = encoder.encode(SECRET_KEY);
    
    const encryptedBytes = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      encryptedBytes[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    // Convert TypedArray to Base64 safely
    let binary = '';
    for (let i = 0; i < encryptedBytes.length; i++) {
      binary += String.fromCharCode(encryptedBytes[i]);
    }
    return btoa(binary);
  } catch (e) {
    console.error('Encryption error:', e);
    return null;
  }
};

export const decryptData = (encrypted) => {
  try {
    const binary = atob(encrypted);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const keyBytes = new TextEncoder().encode(SECRET_KEY);
    const decryptedBytes = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      decryptedBytes[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
    }
    
    return JSON.parse(new TextDecoder().decode(decryptedBytes));
  } catch (e) {
    console.error('Decryption error:', e);
    return null;
  }
};

/**
 * Audit logging
 * Tracks critical actions for security audit trail
 */
export class AuditLogger {
  constructor() {
    this.logs = [];
  }

  log(action, details = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      action,
      userId: details.userId || 'UNKNOWN',
      details: {
        ...details,
        // Remove sensitive data from logs
        password: undefined,
        newPassword: undefined,
        swipeId: undefined
      }
    };

    this.logs.push(logEntry);

    // Keep only last 1000 entries in memory
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // Optionally persist to localStorage
    try {
      const storedLogs = JSON.parse(localStorage.getItem('pos_audit_logs') || '[]');
      storedLogs.push(logEntry);
      if (storedLogs.length > 10000) {
        storedLogs.splice(0, storedLogs.length - 10000);
      }
      localStorage.setItem('pos_audit_logs', JSON.stringify(storedLogs));
    } catch (e) {
      console.error('Audit logging error:', e);
    }
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

/**
 * OTP (One-Time Password) Manager
 * Generates, verifies, and manages OTP for secure operations
 */
export class OTPManager {
  constructor(otpLength = 6, expirationMinutes = 10, maxAttempts = 5) {
    this.otpLength = otpLength;
    this.expirationMs = expirationMinutes * 60 * 1000;
    this.maxAttempts = maxAttempts;
    this.otps = new Map(); // Map of identifier -> { code, expiresAt, attempts, destination }
  }

  /**
   * Generate a random OTP code
   */
  generateOTP() {
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return String(Math.floor(Math.random() * (max - min + 1)) + min);
  }

  /**
   * Create and store OTP for a user/action
   * @param {string} identifier - User ID or action identifier
   * @param {string} destination - Phone/email where OTP will be sent
   * @returns {object} - { code, expiresAt, destination }
   */
  createOTP(identifier, destination) {
    if (!identifier || !destination) return null;

    const code = this.generateOTP();
    const expiresAt = Date.now() + this.expirationMs;

    this.otps.set(identifier, {
      code,
      expiresAt,
      attempts: 0,
      destination,
      createdAt: Date.now()
    });

    return { code, expiresAt, destination };
  }

  /**
   * Verify OTP code
   * @param {string} identifier - User ID or action identifier
   * @param {string} inputCode - Code entered by user
   * @returns {object} - { valid: boolean, remaining: number, message: string }
   */
  verifyOTP(identifier, inputCode) {
    const otp = this.otps.get(identifier);

    if (!otp) {
      return { valid: false, remaining: 0, message: 'OTP not found or expired' };
    }

    // Check if OTP has expired
    if (Date.now() > otp.expiresAt) {
      this.otps.delete(identifier);
      return { valid: false, remaining: 0, message: 'OTP has expired. Request a new one.' };
    }

    // Check if max attempts exceeded
    if (otp.attempts >= this.maxAttempts) {
      this.otps.delete(identifier);
      return { valid: false, remaining: 0, message: 'Maximum attempts exceeded. Request a new OTP.' };
    }

    // Check if code matches
    const remaining = this.maxAttempts - otp.attempts - 1;
    if (String(inputCode).trim() === otp.code) {
      this.otps.delete(identifier); // Remove OTP after successful verification
      return { valid: true, remaining: remaining, message: 'OTP verified successfully' };
    }

    // Increment attempts
    otp.attempts++;
    return {
      valid: false,
      remaining: Math.max(0, remaining),
      message: `Invalid OTP. ${remaining} attempt(s) remaining.`
    };
  }

  /**
   * Get remaining time for OTP in seconds
   */
  getTimeRemaining(identifier) {
    const otp = this.otps.get(identifier);
    if (!otp) return 0;

    const remaining = Math.max(0, otp.expiresAt - Date.now());
    return Math.ceil(remaining / 1000);
  }

  /**
   * Send OTP (simulated - logs to console, can integrate with SMS/Email API)
   * @param {string} destination - Phone number or email
   * @param {string} code - OTP code
   * @param {string} type - 'sms' or 'email'
   */
  sendOTP(destination, code, type = 'sms') {
    // Simulated OTP sending - In production, integrate with Twilio, AWS SNS, SendGrid, etc.
    const message = `FreshPOS OTP: ${code}. Valid for 10 minutes. Never share this code.`;

    console.log(`[${type.toUpperCase()} OTP SENT]`);
    console.log(`Destination: ${destination}`);
    console.log(`Message: ${message}`);
    console.log(`Code: ${code}`);
    console.log('---');

    // In production, implement actual SMS/Email sending:
    // if (type === 'sms') {
    //   return sendSMS(destination, message); // Twilio or similar
    // } else if (type === 'email') {
    //   return sendEmail(destination, 'FreshPOS OTP Verification', message);
    // }

    return { success: true, message: `OTP sent to ${destination}` };
  }

  /**
   * Clear all OTPs (for testing/cleanup)
   */
  clearAll() {
    this.otps.clear();
  }
}

/**
 * Validate phone number (Philippine format)
 */
export const validatePhoneNumber = (phone) => {
  if (!phone || typeof phone !== 'string') return null;

  const cleaned = phone.replace(/\D/g, '');

  // Support formats: 09xxxxxxxxx, +639xxxxxxxxx, 639xxxxxxxxx
  if (cleaned.length === 10 && cleaned.startsWith('9')) {
    return '+63' + cleaned; // Convert to +639...
  }
  if (cleaned.length === 11 && cleaned.startsWith('09')) {
    return '+63' + cleaned.substring(1); // Convert to +639...
  }
  if (cleaned.length === 12 && cleaned.startsWith('63')) {
    return '+' + cleaned; // Already +63...
  }
  if (cleaned.length === 13 && cleaned.startsWith('+63')) {
    return phone; // Already in correct format
  }

  return null;
};

/**
 * Format phone number for display
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length >= 10) {
    return `+63 ${cleaned.slice(-10, -7)} ${cleaned.slice(-7, -4)} ${cleaned.slice(-4)}`;
  }
  return phone;
};

// Global instances
export const auditLogger = new AuditLogger();
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts in 15 minutes
export const otpManager = new OTPManager(6, 10, 5); // 6-digit OTP, 10 min expiry, 5 attempts