// Environment variable validation for production readiness

interface EnvConfig {
  required: string[];
  optional: string[];
  warnings: Record<string, string>;
}

const envConfig: EnvConfig = {
  required: [
    'DATABASE_URL',
    'JWT_SECRET',
  ],
  optional: [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'NEXT_PUBLIC_APP_URL',
    'ALLOW_SEED',
  ],
  warnings: {
    JWT_SECRET: 'JWT_SECRET should be a strong random string in production (not the default)',
    ALLOW_SEED: 'ALLOW_SEED should be "false" in production',
  },
};

let validationRun = false;
let validationErrors: string[] = [];
let validationWarnings: string[] = [];

export function validateEnv(): { valid: boolean; errors: string[]; warnings: string[] } {
  if (validationRun) {
    return { valid: validationErrors.length === 0, errors: validationErrors, warnings: validationWarnings };
  }

  validationRun = true;

  // Check required variables
  for (const key of envConfig.required) {
    if (!process.env[key]) {
      validationErrors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Check for production warnings
  if (process.env.NODE_ENV === 'production') {
    if (process.env.JWT_SECRET === 'notespedia-secret-key-change-in-production') {
      validationWarnings.push('JWT_SECRET is using the default value. Change it in production!');
    }
    if (process.env.ALLOW_SEED !== 'false') {
      validationWarnings.push('ALLOW_SEED should be "false" in production to prevent database reseeding');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      validationWarnings.push('Supabase is not configured. File uploads will use local filesystem.');
    }
    if (!process.env.RESEND_API_KEY) {
      validationWarnings.push('Resend API key is not configured. Email notifications will be disabled.');
    }
  }

  return { valid: validationErrors.length === 0, errors: validationErrors, warnings: validationWarnings };
}

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
