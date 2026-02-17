/**
 * Whitelist of cards that should be auto-corrected without user confirmation
 * Maps common typos or variations to their correct Scryfall names
 */
export const AUTOCORRECT_WHITELIST = new Map<string, string>([
  // Cards with special characters that users commonly type without accents
  ['Lorien Revealed', 'Lórien Revealed'],
  ['Troll of Khazad-dum', 'Troll of Khazad-dûm'],
  ['Troll of Khazad dum', 'Troll of Khazad-dûm'],

  // Double-faced cards - users might type only the front face
  // Map: what user types -> what they should get
  ['Delver of Secrets', 'Delver of Secrets // Insectile Aberration'],
  ['The Modern Age', 'The Modern Age // Vector Glider'],
  ['Sagu Wildling', 'Sagu Wildling // Roost Seek'],
  ['Tithing Blade', 'Tithing Blade // Consuming Sepulcher']

  // You can add more as needed
])

/**
 * Check if a card name should be auto-corrected
 * Returns the corrected name if found, otherwise null
 */
export function getAutocorrectName(searchedName: string): string | null {
  return AUTOCORRECT_WHITELIST.get(searchedName) ?? null
}

/**
 * Check if a suggestion should be auto-applied based on whitelist
 */
export function shouldAutoApply(searchedName: string, suggestedName: string): boolean {
  const whitelistedName = AUTOCORRECT_WHITELIST.get(searchedName)
  return whitelistedName === suggestedName
}
