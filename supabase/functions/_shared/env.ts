/**
 * Environment Variable Validation Helper
 * 
 * Centralized environment variable loading and validation.
 * All edge functions should import from this helper.
 */

export interface EnvConfig {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
  OPENAI_API_KEY: string;
  KLAVIYO_PRIVATE_API_KEY: string;
  KLAVIYO_MAIN_LIST_ID: string;
  CRON_SECRET: string;
  // Optional
  SHOPIFY_ACCESS_TOKEN?: string;
  SHOPIFY_WEBHOOK_SECRET?: string;
  DEBUG_SECRET?: string;
}

export interface RequiredEnvResult {
  config: EnvConfig;
  missing: string[];
  isValid: boolean;
}

/**
 * Get all environment variables with validation
 */
export function getEnvConfig(): RequiredEnvResult {
  const config: EnvConfig = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') || '',
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') || '',
    OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') || '',
    KLAVIYO_PRIVATE_API_KEY: Deno.env.get('KLAVIYO_PRIVATE_API_KEY') || '',
    KLAVIYO_MAIN_LIST_ID: Deno.env.get('KLAVIYO_MAIN_LIST_ID') || '',
    CRON_SECRET: Deno.env.get('CRON_SECRET') || '',
    SHOPIFY_ACCESS_TOKEN: Deno.env.get('SHOPIFY_ACCESS_TOKEN'),
    SHOPIFY_WEBHOOK_SECRET: Deno.env.get('SHOPIFY_WEBHOOK_SECRET'),
    DEBUG_SECRET: Deno.env.get('DEBUG_SECRET'),
  };

  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
  ];

  const missing = requiredVars.filter(key => !config[key as keyof EnvConfig]);

  return {
    config,
    missing,
    isValid: missing.length === 0,
  };
}

/**
 * Validate required environment variables and throw if missing
 */
export function requireEnv(varNames: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  const missing: string[] = [];

  for (const name of varNames) {
    const value = Deno.env.get(name);
    if (!value) {
      missing.push(name);
    } else {
      result[name] = value;
    }
  }

  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    console.error(`[Env] ${error}`);
    throw new Error(error);
  }

  return result;
}

/**
 * Get a single environment variable or throw
 */
export function requireEnvVar(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    const error = `Missing required environment variable: ${name}`;
    console.error(`[Env] ${error}`);
    throw new Error(error);
  }
  return value;
}

/**
 * Check if OpenAI API is configured
 */
export function hasOpenAIKey(): boolean {
  return !!Deno.env.get('OPENAI_API_KEY');
}

/**
 * Check if Klaviyo is configured
 */
export function hasKlaviyoKey(): boolean {
  return !!Deno.env.get('KLAVIYO_PRIVATE_API_KEY');
}

/**
 * Validate CRON_SECRET for scheduled jobs
 */
export function validateCronSecret(authHeader: string | null): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    console.error('[Auth] CRON_SECRET not configured');
    return false;
  }
  
  const expectedAuth = `Bearer ${cronSecret}`;
  if (authHeader !== expectedAuth) {
    console.error('[Auth] Invalid CRON_SECRET');
    return false;
  }
  
  return true;
}

/**
 * Validate DEBUG_SECRET for debug endpoints
 */
export function validateDebugSecret(authHeader: string | null): boolean {
  const debugSecret = Deno.env.get('DEBUG_SECRET') || Deno.env.get('CRON_SECRET');
  if (!debugSecret) {
    console.error('[Auth] DEBUG_SECRET/CRON_SECRET not configured');
    return false;
  }
  
  const expectedAuth = `Bearer ${debugSecret}`;
  if (authHeader !== expectedAuth) {
    console.error('[Auth] Invalid debug secret');
    return false;
  }
  
  return true;
}
