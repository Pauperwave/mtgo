// app\utils\card-autocorrect-whitelist.ts
/**
 * Whitelist of cards that should be auto-corrected without user confirmation
 * These are the CORRECT card names that should be auto-applied when found by fuzzy search
 */
const AUTOCORRECT_WHITELIST = new Set<string>([
  // Cards with special characters - auto-apply when Scryfall finds them
  'Lórien Revealed',
  'Troll of Khazad-dûm',

  // Double-faced cards - auto-apply the full name when Scryfall finds them
  'Delver of Secrets // Insectile Aberration',
  'The Modern Age // Vector Glider',
  'Sagu Wildling // Roost Seek',
  'Tithing Blade // Consuming Sepulcher'

  // Add more cards as needed
])

/**
 * Check if a suggested card should be auto-applied
 * Returns true if the suggested card is in the whitelist
 */
export function shouldAutoApply(searchedName: string, suggestedName: string): boolean {
  return AUTOCORRECT_WHITELIST.has(suggestedName)
}
