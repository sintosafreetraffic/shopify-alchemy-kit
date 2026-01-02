/**
 * Persona cookie utilities for A/B testing and personalization
 * Stores the user's persona cluster in a cookie after quiz completion
 */

const PERSONA_COOKIE_NAME = "rbn_persona";
const COOKIE_MAX_AGE_DAYS = 365;

export type PersonaCluster = 
  | "pain_sleeper"
  | "stress_insomnia"
  | "recovery_sleeper"
  | "optimizer"
  | null;

/**
 * Set the persona cookie after quiz completion
 */
export function setPersonaCookie(persona: string | null): void {
  if (typeof document === "undefined") return;
  
  if (!persona) {
    // Clear the cookie if no persona
    document.cookie = `${PERSONA_COOKIE_NAME}=; path=/; max-age=0`;
    return;
  }

  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60; // Convert to seconds
  document.cookie = `${PERSONA_COOKIE_NAME}=${encodeURIComponent(persona)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Get the persona from cookie
 */
export function getPersonaCookie(): PersonaCluster {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === PERSONA_COOKIE_NAME && value) {
      const decoded = decodeURIComponent(value);
      // Validate it's a known persona
      if (isValidPersona(decoded)) {
        return decoded as PersonaCluster;
      }
    }
  }
  return null;
}

/**
 * Check if a string is a valid persona cluster
 */
function isValidPersona(value: string): boolean {
  return ["pain_sleeper", "stress_insomnia", "recovery_sleeper", "optimizer"].includes(value);
}

/**
 * Clear the persona cookie
 */
export function clearPersonaCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = `${PERSONA_COOKIE_NAME}=; path=/; max-age=0`;
}
