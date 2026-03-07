// app/utils/suggestion-scorer.ts
/**
 * Suggestion Scoring Module
 * Handles confidence analysis and categorization of card name suggestions
 */

import type { ScryfallCard } from '~/types/deck'
import type { CardSuggestion, SuggestionGroup, ConfidenceLevel, MatchType } from '~/types/suggestions'
import { CONFIDENCE_DISPLAY } from '~/types/suggestions'
import { normalizeCardName, areNamesEquivalent, getFrontFace } from './card-name-normalization'

/**
 * Calculate the Levenshtein edit distance between two strings
 * Used to measure how different two card names are
 * Returns the minimum number of single-character edits needed
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length
  const dp: number[][] = []

  for (let i = 0; i <= n; i++) {
    dp[i] = []
    dp[i]![0] = i
  }

  for (let j = 0; j <= m; j++) {
    dp[0]![j] = j
  }

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!
      } else {
        dp[i]![j] = 1 + Math.min(
          dp[i - 1]![j]!,
          dp[i]![j - 1]!,
          dp[i - 1]![j - 1]!
        )
      }
    }
  }

  return dp[n]![m]!
}

/**
 * Raw response format from Scryfall search API
 */
export interface ScryfallSearchResult {
  data: ScryfallCard[]
  total_cards: number
}

/**
 * Result of analyzing a single card match
 */
export interface MatchAnalysis {
  confidence: ConfidenceLevel
  matchType: MatchType
  distance: number
}

/**
 * Analyze how well a Scryfall card matches the searched name
 * Returns confidence level and match type for UI display
 *
 * Confidence levels:
 * - exact: Perfect match (case-insensitive)
 * - high: Normalized match, single result, or very close (≥90% similar)
 * - medium: Moderately similar (≥75% similar)
 * - low: Low similarity or ambiguous (multiple results)
 */
export function analyzeMatch(
  searchedName: string,
  card: ScryfallCard,
  totalResults: number
): MatchAnalysis {
  const searchedNormalized = normalizeCardName(searchedName)
  const cardFrontFace = getFrontFace(card.name)
  const cardFrontNormalized = normalizeCardName(cardFrontFace)

  const distance = levenshteinDistance(searchedNormalized, cardFrontNormalized)
  const maxLength = Math.max(searchedNormalized.length, cardFrontNormalized.length)
  const similarity = 1 - (distance / maxLength)

  // Exact match: case-insensitive match ignoring DFC back face
  if (searchedName.toLowerCase() === cardFrontFace.toLowerCase()) {
    return { confidence: 'exact', matchType: 'exact', distance: 0 }
  }

  // High confidence: normalized match (handles accents, hyphens, etc.)
  if (areNamesEquivalent(searchedName, cardFrontFace)) {
    return { confidence: 'high', matchType: 'normalized', distance }
  }

  // High confidence: single result with good similarity
  if (totalResults === 1 && similarity >= 0.85) {
    return { confidence: 'high', matchType: 'single-result', distance }
  }

  // High confidence: very close match (typo correction)
  if (similarity >= 0.90) {
    return { confidence: 'high', matchType: 'fuzzy', distance }
  }

  // Medium confidence: moderate similarity
  if (similarity >= 0.75) {
    return { confidence: 'medium', matchType: 'fuzzy', distance }
  }

  // Low confidence: ambiguous (multiple results)
  if (totalResults > 1) {
    return { confidence: 'low', matchType: 'ambiguous', distance }
  }

  // Low confidence: poor match
  return { confidence: 'low', matchType: 'fuzzy', distance }
}

/**
 * Determine if a suggestion should be auto-applied without user confirmation
 * Auto-applies: exact, high confidence, or medium confidence with single result
 */
export function shouldAutoApplySuggestion(suggestion: CardSuggestion): boolean {
  if (suggestion.confidence === 'exact' || suggestion.confidence === 'high') {
    return true
  }

  if (suggestion.confidence === 'medium' && suggestion.matchType === 'single-result') {
    return true
  }

  return false
}

/**
 * Process Scryfall search results into categorized suggestions
 * Validates input, analyzes each result, sorts by confidence, and splits into groups
 *
 * Returns a SuggestionGroup with:
 * - autoApply: suggestions to apply automatically (high confidence)
 * - requireConfirmation: suggestions to show user (lower confidence)
 */
export function processSuggestions(
  searchedName: string,
  searchResults: ScryfallSearchResult
): SuggestionGroup {
  // Validate input format - handle rate-limited responses gracefully
  if (!searchResults || !Array.isArray(searchResults.data) || typeof searchResults.total_cards !== 'number') {
    console.warn('Invalid search results format:', searchResults)
    return { autoApply: [], requireConfirmation: [] }
  }

  const { data: cards, total_cards: totalResults } = searchResults

  // No results found
  if (!cards || cards.length === 0) {
    return { autoApply: [], requireConfirmation: [] }
  }

  // Analyze each search result and create suggestions
  const suggestions: CardSuggestion[] = cards.map((card) => {
    const { confidence, matchType, distance } = analyzeMatch(
      searchedName,
      card,
      totalResults
    )

    return {
      searchedName,
      suggestedCard: card,
      confidence,
      matchType,
      normalizedDistance: distance
    }
  })

  // Sort by confidence (best first), then by distance (closest first)
  suggestions.sort((a, b) => {
    const confDiff = CONFIDENCE_DISPLAY[a.confidence].sortOrder - CONFIDENCE_DISPLAY[b.confidence].sortOrder

    if (confDiff !== 0) return confDiff

    return (a.normalizedDistance || 0) - (b.normalizedDistance || 0)
  })

  // Split into auto-apply vs require confirmation
  const autoApply = suggestions.filter(shouldAutoApplySuggestion)
  const requireConfirmation = suggestions.filter(s => !shouldAutoApplySuggestion(s))

  return {
    autoApply,
    requireConfirmation
  }
}
