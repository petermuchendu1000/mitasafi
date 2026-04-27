/**
 * Supabase Auth Configuration
 * 
 * Centralized configuration for authentication options
 * including OAuth providers and redirect URLs.
 */

// ===========================================
// AUTH CONFIGURATION
// ===========================================

export const authConfig = {
  // Site URL for redirects
  siteUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  
  // Auth callback URL
  callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
  
  // OAuth Providers
  providers: {
    google: {
      enabled: true,
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      scopes: ['email', 'profile'],
      // Additional options for Google
      options: {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    },
    // Future providers can be added here
    // apple: { enabled: false },
    // facebook: { enabled: false },
  },
  
  // Email Auth Options
  email: {
    enabled: true,
    confirmEmail: true,
    // OTP options
    otp: {
      enabled: true,
      expiresIn: 300, // 5 minutes
    },
  },
  
  // Phone Auth Options (for Kenya)
  phone: {
    enabled: true,
    // Kenya country code
    defaultCountryCode: '+254',
  },
  
  // Session Options
  session: {
    // How long before session expires (in seconds)
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    // Refresh session automatically
    autoRefresh: true,
  },
  
  // Password Requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumber: true,
    requireSpecialChar: false,
  },
  
  // Redirect URLs
  redirects: {
    // After login
    afterLogin: '/dashboard',
    // After signup (role is selected on signup page, so go straight to dashboard)
    afterSignup: '/dashboard',
    // After logout
    afterLogout: '/',
    // After password reset
    afterPasswordReset: '/auth/login',
    // After email confirmation
    afterEmailConfirm: '/dashboard',
  },
}

// ===========================================
// AUTH HELPERS
// ===========================================

/**
 * Get the full callback URL for OAuth
 */
export function getAuthCallbackUrl(): string {
  return authConfig.callbackUrl
}

/**
 * Get redirect URL after auth action
 */
export function getRedirectUrl(action: keyof typeof authConfig.redirects): string {
  return `${authConfig.siteUrl}${authConfig.redirects[action]}`
}

/**
 * Validate password against requirements
 */
export function validatePassword(password: string): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const { minLength, requireUppercase, requireLowercase, requireNumber, requireSpecialChar } = authConfig.password
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters`)
  }
  
  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (requireNumber && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (requireSpecialChar && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Format Kenyan phone number
 */
export function formatKenyanPhone(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, '')
  
  // Handle different formats
  if (cleaned.startsWith('254')) {
    // Already has country code
    cleaned = cleaned.substring(3)
  } else if (cleaned.startsWith('0')) {
    // Local format starting with 0
    cleaned = cleaned.substring(1)
  }
  
  // Validate length (9 digits for Kenyan mobile)
  if (cleaned.length !== 9) {
    throw new Error('Invalid Kenyan phone number')
  }
  
  // Return with country code
  return `+254${cleaned}`
}
