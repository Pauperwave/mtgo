/**
 * Header preview styling for the blog's ::magic-decklist gradients.
 * Ported from blog/app/composables/useDecklistStyles.ts — keep the class
 * maps in sync manually if the blog's palette/contrast choices change.
 */

const GRADIENT_CLASSES: Record<string, string> = {
  monowhite: 'bg-amber-100',
  monoblue: 'bg-blue-600',
  monoblack: 'bg-gray-950',
  monored: 'bg-red-600',
  monogreen: 'bg-green-600',
  colorless: 'bg-gray-300',

  azorius: 'bg-gradient-to-r from-amber-100 to-blue-600',
  dimir: 'bg-gradient-to-r from-blue-600 to-gray-950',
  rakdos: 'bg-gradient-to-r from-gray-950 to-red-600',
  gruul: 'bg-gradient-to-r from-red-600 to-green-600',
  selesnya: 'bg-gradient-to-r from-green-600 to-amber-100',

  orzhov: 'bg-gradient-to-r from-amber-100 to-gray-950',
  golgari: 'bg-gradient-to-r from-gray-950 to-green-600',
  simic: 'bg-gradient-to-r from-green-600 to-blue-600',
  izzet: 'bg-gradient-to-r from-blue-600 to-red-600',
  boros: 'bg-gradient-to-r from-red-600 to-amber-100',

  esper: 'bg-gradient-to-r from-amber-100 via-blue-600 to-gray-950',
  grixis: 'bg-gradient-to-r from-blue-600 via-gray-950 to-red-600',
  jund: 'bg-gradient-to-r from-gray-950 via-red-600 to-green-600',
  naya: 'bg-gradient-to-r from-red-600 via-green-600 to-amber-100',
  bant: 'bg-gradient-to-r from-green-600 via-amber-100 to-blue-600',

  mardu: 'bg-gradient-to-r from-amber-100 via-gray-950 to-red-600',
  temur: 'bg-gradient-to-r from-blue-600 via-red-600 to-green-600',
  sultai: 'bg-gradient-to-r from-gray-950 via-green-600 to-blue-600',
  jeskai: 'bg-gradient-to-r from-red-600 via-amber-100 to-blue-600',
  abzan: 'bg-gradient-to-r from-amber-100 via-gray-950 to-green-600'
}

// Note: jeskai and bant excluded despite being multicolor - their amber-100
// mid-gradient stop is too light for light text to stay readable
const LIGHT_TEXT = new Set<string>([
  'monoblue', 'monoblack', 'monored', 'monogreen', 'gruul',
  'dimir', 'izzet', 'selesnya', 'boros', 'simic', 'sultai',
  'golgari', 'rakdos', 'grixis', 'jund', 'temur', 'naya'
])

const MONO_PLACEMENT = new Set<string>([
  'monoblue', 'monoblack', 'monored', 'monogreen'
])

// Note: boros, selesnya, naya use light heading text but dark placement text
const DARK_PLACEMENT = new Set<string>([
  'bant', 'boros', 'colorless', 'jeskai', 'monowhite', 'naya', 'selesnya'
])

// Color sequence (mana-font symbol order) per gradient, ported from
// blog's ManaSymbol.vue combinationMap
const GRADIENT_MANA_SEQUENCE: Record<string, string> = {
  monowhite: 'w',
  monoblue: 'u',
  monoblack: 'b',
  monored: 'r',
  monogreen: 'g',
  colorless: 'c',

  azorius: 'wu',
  dimir: 'ub',
  rakdos: 'br',
  gruul: 'rg',
  selesnya: 'gw',

  orzhov: 'wb',
  golgari: 'bg',
  simic: 'gu',
  izzet: 'ur',
  boros: 'rw',

  esper: 'wub',
  grixis: 'ubr',
  jund: 'brg',
  naya: 'rgw',
  bant: 'gwu',

  mardu: 'wbr',
  temur: 'urg',
  sultai: 'bgu',
  jeskai: 'rwu',
  abzan: 'wbg'
}

export const GRADIENT_OPTIONS = Object.keys(GRADIENT_CLASSES)

export function getManaSequence(headerGradient: string): string {
  return GRADIENT_MANA_SEQUENCE[headerGradient] ?? ''
}

export function getDecklistStyles(headerGradient: string) {
  const headerClass = GRADIENT_CLASSES[headerGradient]

  const lightText = LIGHT_TEXT.has(headerGradient)

  const placement = !headerGradient || DARK_PLACEMENT.has(headerGradient)
    ? 'text-gray-900'
    : MONO_PLACEMENT.has(headerGradient)
      ? 'text-gray-900 dark:text-gray-100'
      : 'text-gray-100'

  return {
    headerClass,
    textClasses: {
      heading: lightText ? 'text-gray-100' : 'text-gray-900',
      subheading: lightText ? 'text-gray-300' : 'text-gray-700',
      placement
    }
  }
}
