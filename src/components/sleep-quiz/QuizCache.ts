/**
 * Sleep Quiz Results Cache - Hybrid Persistence Layer
 * 
 * Uses sessionStorage as fast path, with sleep_profiles.sleep_assessment as source of truth.
 * Includes versioning for safe cache invalidation and expiration.
 * 
 * v7: Added cache expiration (30 days) and cached_at field
 */

import { SleepAssessment, AnalysisResult } from "./QuizTypes";
import { QuizAnswers } from "./QuizConfig";

export const QUIZ_RESULTS_STORAGE_KEY = "rbn_sleep_quiz_v7_results";
export const CURRENT_QUIZ_VERSION = "v7";
export const CACHE_EXPIRATION_DAYS = 30;

export interface CachedQuizResults {
  assessment: SleepAssessment | null;
  results: AnalysisResult | null;
  answers: QuizAnswers;
  email: string | null;
  completedAt: string; // ISO timestamp
  quizVersion: string; // "v6", "v7", etc.
  cached_at: string; // ISO timestamp when cache was written
}

/**
 * Check if cache has expired (older than CACHE_EXPIRATION_DAYS)
 */
function isCacheExpired(cached_at: string): boolean {
  try {
    const cachedDate = new Date(cached_at);
    const now = new Date();
    const diffMs = now.getTime() - cachedDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays > CACHE_EXPIRATION_DAYS;
  } catch (e) {
    console.warn("[sleep-quiz] Failed to parse cache date", e);
    return true; // Treat as expired if we can't parse
  }
}

/**
 * Write quiz results to sessionStorage
 * Only stores quiz answers + derived assessment, never passwords or auth tokens
 */
export function cacheQuizResults(
  results: AnalysisResult | null,
  answers: QuizAnswers,
  email: string | null
): void {
  if (typeof window === "undefined") return;

  try {
    // Extract structured assessment if available
    const structuredAssessment = results?.assessment && typeof results.assessment !== "string"
      ? results.assessment as SleepAssessment
      : null;

    const now = new Date().toISOString();
    
    const cache: CachedQuizResults = {
      assessment: structuredAssessment,
      results: results,
      answers: { ...answers }, // Shallow copy to avoid mutation issues
      email: email?.toLowerCase().trim() ?? null,
      completedAt: now,
      quizVersion: CURRENT_QUIZ_VERSION,
      cached_at: now,
    };

    window.sessionStorage.setItem(
      QUIZ_RESULTS_STORAGE_KEY,
      JSON.stringify(cache)
    );
  } catch (e) {
    console.warn("[sleep-quiz] Failed to cache results", e);
  }
}

/**
 * Retrieve cached quiz results from sessionStorage
 * Returns null if no cache, invalid cache, version mismatch, or expired
 */
export function getCachedQuizResults(): CachedQuizResults | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(QUIZ_RESULTS_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedQuizResults;
    
    // Version check - ignore stale cache from older quiz versions
    if (parsed.quizVersion !== CURRENT_QUIZ_VERSION) {
      console.info("[sleep-quiz] Cache version mismatch, ignoring stale cache");
      clearQuizCache();
      return null;
    }

    // Expiration check - ignore cache older than 30 days
    const cached_at = parsed.cached_at || parsed.completedAt; // Fallback to completedAt for backwards compatibility
    if (isCacheExpired(cached_at)) {
      console.info(`[sleep-quiz] Cache expired (>${CACHE_EXPIRATION_DAYS} days old), clearing`);
      clearQuizCache();
      return null;
    }

    // Basic validation
    if (!parsed.completedAt || !parsed.answers) {
      console.warn("[sleep-quiz] Invalid cache structure");
      clearQuizCache();
      return null;
    }

    return parsed;
  } catch (e) {
    console.warn("[sleep-quiz] Failed to read cached results", e);
    clearQuizCache();
    return null;
  }
}

/**
 * Clear quiz results from sessionStorage
 */
export function clearQuizCache(): void {
  if (typeof window === "undefined") return;
  
  try {
    window.sessionStorage.removeItem(QUIZ_RESULTS_STORAGE_KEY);
    // Also clear old v6 cache key if present
    window.sessionStorage.removeItem("rbn_sleep_quiz_v6_results");
  } catch (e) {
    console.warn("[sleep-quiz] Failed to clear cache", e);
  }
}

/**
 * Check if cached results exist and are valid (not expired, correct version)
 */
export function hasCachedResults(): boolean {
  return getCachedQuizResults() !== null;
}

/**
 * Get cache age in days (for debugging/UI)
 */
export function getCacheAgeDays(): number | null {
  const cached = getCachedQuizResults();
  if (!cached) return null;
  
  const cached_at = cached.cached_at || cached.completedAt;
  try {
    const cachedDate = new Date(cached_at);
    const now = new Date();
    const diffMs = now.getTime() - cachedDate.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch (e) {
    return null;
  }
}
