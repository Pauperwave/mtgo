// app/types/suggestions.ts
/**
 * Type Definitions for Card Suggestion System
 * Defines types for confidence-based card name matching
 */

import type { ScryfallCard } from './deck'

/**
 * A single card name correction suggestion
 * Represents a match between what user typed and a Scryfall card
 */
export interface CardSuggestion {
  /** The original name the user typed */
  searchedName: string
  /** The Scryfall card being suggested */
  suggestedCard: ScryfallCard
  /** How confident we are in this match */
  confidence: ConfidenceLevel
  /** How the match was determined */
  matchType: MatchType
  /** Levenshtein edit distance (optional, for display) */
  normalizedDistance?: number
}

/**
 * Confidence levels for card name matches
 * Used to determine whether to auto-apply or ask user
 */
export type ConfidenceLevel
  = | 'exact' // Perfect match (case-insensitive)
    | 'high' // Very close match (typo correction, normalized)
    | 'medium' // Moderately similar
    | 'low' // Poor match or ambiguous

/**
 * How a match was determined
 * Provides context for the confidence level
 */
export type MatchType
  = | 'exact' // Perfect match (case-insensitive)
    | 'normalized' // Match after normalization (accents, hyphens)
    | 'single-result' // Only one result from Scryfall search
    | 'fuzzy' // Fuzzy/partial match with good similarity
    | 'ambiguous' // Multiple plausible matches

/**
 * Grouped suggestions from API response
 * Separates suggestions that can be auto-applied from those needing confirmation
 */
export interface SuggestionGroup {
  /** High-confidence suggestions to apply automatically */
  autoApply: CardSuggestion[]
  /** Lower-confidence suggestions to show user for confirmation */
  requireConfirmation: CardSuggestion[]
}

/**
 * Valid colors for UBadge component
 */
export type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

/**
 * Configuration for displaying confidence levels in UI
 * Includes label, color, and icon for each confidence level
 */
export interface ConfidenceDisplayConfig {
  /** Display label in Italian */
  label: string
  /** Badge color for UI */
  color: BadgeColor
  /** Icon name for UI */
  icon: string
  /** Sort order (lower = higher confidence) */
  sortOrder: number
}

/**
 * Display configuration for all confidence levels
 * Centralized UI configuration to avoid duplication
 */
export const CONFIDENCE_DISPLAY: Record<ConfidenceLevel, ConfidenceDisplayConfig> = {
  exact: { label: 'Esatto', color: 'success', icon: 'i-lucide-check-circle', sortOrder: 0 },
  high: { label: 'Alta', color: 'info', icon: 'i-lucide-circle-check', sortOrder: 1 },
  medium: { label: 'Media', color: 'warning', icon: 'i-lucide-alert-circle', sortOrder: 2 },
  low: { label: 'Bassa', color: 'error', icon: 'i-lucide-help-circle', sortOrder: 3 }
}

/**
 * Display labels for match types in Italian
 */
export const MATCH_TYPE_DISPLAY: Record<MatchType, string> = {
  'exact': 'Corrispondenza esatta',
  'normalized': 'Normalizzato',
  'single-result': 'Risultato unico',
  'fuzzy': 'Ricerca fuzzy',
  'ambiguous': 'Ambiguo'
}
