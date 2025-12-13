/**
 * Sleep Quiz Results Cache - Hybrid Persistence Layer
 * 
 * Uses sessionStorage as fast path, with sleep_profiles.sleep_assessment as source of truth.
 * Includes versioning for safe cache invalidation.
 */

import { SleepAssessment, AnalysisResult } from "./QuizTypes";
import { QuizAnswers } from "./QuizConfig";

export const QUIZ_RESULTS_STORAGE_KEY = "rbn_sleep_quiz_v6_results";
export const CURRENT_QUIZ_VERSION = "v6";

export interface CachedQuizResults {
  assessment: SleepAssessment | null;
  results: AnalysisResult | null;
  answers: QuizAnswers;
  email: string | null;
  completedAt: string; // ISO timestamp
  quizVersion: string; // "v6", "v7", etc.
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

    const cache: CachedQuizResults = {
      assessment: structuredAssessment,
      results: results,
      answers: { ...answers }, // Shallow copy to avoid mutation issues
      email: email?.toLowerCase().trim() ?? null,
      completedAt: new Date().toISOString(),
      quizVersion: CURRENT_QUIZ_VERSION,
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
 * Returns null if no cache, invalid cache, or version mismatch
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
  } catch (e) {
    console.warn("[sleep-quiz] Failed to clear cache", e);
  }
}

/**
 * Check if cached results exist and are valid
 */
export function hasCachedResults(): boolean {
  return getCachedQuizResults() !== null;
}
