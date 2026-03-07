// utils/card-name-normalization.ts

/**
 * Normalize a card name for fuzzy matching
 * Removes accents, punctuation, extra spaces, and converts to lowercase
 */
export function normalizeCardName(name: string): string {
  return getFrontFace(name)
    // Convert to lowercase
    .toLowerCase()
    // Remove accents: ó → o, û → u
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Remove apostrophes and hyphens
    .replace(/['-]/g, '')
    // Remove other punctuation
    .replace(/[.,!?;:]/g, '')
    // Collapse multiple spaces
    .replace(/\s+/g, ' ')
    // Trim
    .trim()
}

/**
 * Get the front face of a double-faced card (DFC), split card, or adventure card
 * e.g., "Wilds of Eldraine // Roaming Throne" -> "Wilds of Eldraine"
 */
export function getFrontFace(name: string): string {
  // Split on "//" which separates front/back faces in DFC/split cards
  return name.split('//')[0]?.trim() || name.trim()
}

/**
 * Check if two card names are equivalent after normalization
 * Handles minor differences like accents, hyphens, and extra spaces
 */
export function areNamesEquivalent(name1: string, name2: string): boolean {
  return normalizeCardName(name1) === normalizeCardName(name2)
}

/**
 * Escape special regex characters in a string
 * Used to safely use card names in RegExp patterns
 */
export function escapeRegexName(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
