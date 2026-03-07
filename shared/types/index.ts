/**
 * Shared types between client and server for card database operations
 */

/**
 * Card data structure stored in SQLite database
 * Mirrors Scryfall's oracle card structure with only fields we need
 */
export interface Card {
  id: string
  name: string
  type_line: string
  mana_cost: string | null
  oracle_text: string | null
  colors: string // JSON array: ["W","U"] 
  color_identity: string // JSON array
  keywords: string // JSON array
  legalities: string // JSON object: {"pauper":"legal"}
  rarity: string
  set_code: string
  set_name: string
  collector_number: string
  image_uris: string | null // JSON object or null
  card_faces: string | null // JSON array for DFCs, null for single-faced
  layout: string
  cmc: number
  power: string | null
  toughness: string | null
  loyalty: string | null
  created_at: string // ISO 8601 timestamp
}

/**
 * Name mapping entry for tracking user input -> canonical name transformations
 */
export interface NameMapping {
  id: number
  input_name: string
  canonical_name: string
  normalized_input: string // For fast lookups
  normalized_canonical: string // For validation
  hit_count: number
  first_seen: string // ISO 8601 timestamp
  last_seen: string // ISO 8601 timestamp
}

/**
 * Database metadata entry
 */
export interface Metadata {
  key: string
  value: string
}

/**
 * Request body for /api/cards/resolve endpoint
 */
export interface ResolveCardsRequest {
  names: string[]
}

/**
 * Performance statistics for card resolution
 */
export interface PerformanceStats {
  totalRequests: number // Total card names requested
  databaseHits: number // Cards found in local SQLite database
  scryfallRequests: number // Cards fetched from Scryfall API
  notFound: number // Cards not found anywhere
  processingTimeMs: number // Total processing time in milliseconds
}

/**
 * Response from /api/cards/resolve endpoint
 */
export interface ResolveCardsResponse {
  cards: Card[]
  nameMappings: Record<string, string> // input_name -> canonical_name
  missing: string[] // Cards not found in DB or Scryfall
  errors?: string[]
  performance: PerformanceStats // Performance statistics
}

/**
 * Scryfall API card object (subset of fields we care about)
 */
export interface ScryfallCard {
  id: string
  name: string
  type_line: string
  mana_cost?: string
  oracle_text?: string
  colors?: string[]
  color_identity?: string[]
  keywords?: string[]
  legalities: Record<string, string>
  rarity: string
  set: string
  set_name: string
  collector_number: string
  image_uris?: {
    small?: string
    normal?: string
    large?: string
    png?: string
    art_crop?: string
    border_crop?: string
  }
  card_faces?: Array<{
    name: string
    type_line: string
    mana_cost?: string
    oracle_text?: string
    colors?: string[]
    image_uris?: {
      small?: string
      normal?: string
      large?: string
      png?: string
      art_crop?: string
      border_crop?: string
    }
    power?: string
    toughness?: string
    loyalty?: string
  }>
  layout: string
  cmc: number
  power?: string
  toughness?: string
  loyalty?: string
}
