/**
 * Header gradient detection for the blog's ::magic-decklist Nuxt Content block.
 * Ported from blog/scripts/lib/decklist-gradient.ts — keep the color tables and
 * OFF_COLOR_CARDS list in sync manually if the blog's mapping changes.
 */

import type { NormalizedCard } from '~/types/deck'

const COLOR_SYMBOLS: Record<string, string> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green'
}

// Cards commonly played in Pauper without access to their colors
// (reanimation/free-cast effects, sideboard hosers usable by any deck)
const OFF_COLOR_CARDS: ReadonlySet<string> = new Set([
  'Sneaky Snacker',
  'Faerie Macabre',
  'Masked Vandal',
  'Street Wraith',
  'Hydroblast',
  'Pyroblast',
  'Blue Elemental Blast',
  'Red Elemental Blast'
])

const GUILDS: Record<string, string> = {
  whiteblue: 'azorius',
  blueblack: 'dimir',
  blackred: 'rakdos',
  redgreen: 'gruul',
  greenwhite: 'selesnya',
  whiteblack: 'orzhov',
  blackgreen: 'golgari',
  greenblue: 'simic',
  bluered: 'izzet',
  redwhite: 'boros'
}

const SHARDS: Record<string, string> = {
  whiteblueblack: 'esper',
  blueblackred: 'grixis',
  blackredgreen: 'jund',
  redgreenwhite: 'naya',
  greenwhiteblue: 'bant'
}

const WEDGES: Record<string, string> = {
  whiteblackred: 'mardu',
  blueredgreen: 'temur',
  blackgreenblue: 'sultai',
  redwhiteblue: 'jeskai',
  whiteblackgreen: 'abzan'
}

function extractManaColors(manaCost: string): Set<string> {
  const colors = new Set<string>()
  const matches = manaCost.match(/\{([WUBRG])\}/g)

  if (matches) {
    for (const match of matches) {
      const symbol = match.replace(/[{}]/g, '')
      const color = COLOR_SYMBOLS[symbol]
      if (color) colors.add(color)
    }
  }

  return colors
}

function determineGradient(deckColors: ReadonlySet<string>): string | null {
  const colors = Array.from(deckColors).sort()
  const colorKey = colors.join('')

  if (colors.length === 0) return 'colorless'
  if (colors.length === 1) return `mono${colors[0]}`

  if (colors.length === 2) {
    if (GUILDS[colorKey]) return GUILDS[colorKey]
    const reversedKey = [...colors].reverse().join('')
    return GUILDS[reversedKey] || null
  }

  if (colors.length === 3) {
    if (SHARDS[colorKey]) return SHARDS[colorKey]
    if (WEDGES[colorKey]) return WEDGES[colorKey]

    for (const [key, value] of Object.entries({ ...SHARDS, ...WEDGES })) {
      const comboColors: string[] = key.match(/(white|blue|black|red|green)/g) || []
      if (colors.every(c => comboColors.includes(c))) return value
    }
  }

  // 4+ colors: no gradient mapping defined
  return null
}

/**
 * Derive the deck's headerGradient value from maindeck cards.
 * Mirrors blog's detectDeckColors but reads mana_cost already present on
 * NormalizedCard instead of re-fetching from Scryfall.
 */
export function detectDeckGradient(cards: readonly NormalizedCard[]): string | null {
  const deckColors = new Set<string>()

  for (const card of cards) {
    if (card.isMissing || card.section === 'Sideboard') continue
    if (OFF_COLOR_CARDS.has(card.name)) continue
    if (!card.mana_cost) continue

    extractManaColors(card.mana_cost).forEach(c => deckColors.add(c))
  }

  return determineGradient(deckColors)
}
