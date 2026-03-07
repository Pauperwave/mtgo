/**
 * Card database utility for MTGO deck normalizer
 * Provides SQLite-based card lookup with name mapping support
 * Uses dual runtime: bun:sqlite in Bun runtime, better-sqlite3 in Node.js
 */

import { join } from 'path'
import type { Card, NameMapping } from '../../shared/types'

/* eslint-disable @typescript-eslint/no-explicit-any */
type DatabaseInstance = any

let dbInstance: DatabaseInstance | null = null

/**
 * Get database instance - uses bun:sqlite in Bun runtime, better-sqlite3 otherwise
 * Database is opened in readonly mode for production, readwrite for import scripts
 */
export async function getDatabase(readonly = true): Promise<DatabaseInstance> {
  if (!dbInstance) {
    const dbPath = join(process.cwd(), 'server', 'database', 'cards.db')
    
    try {
      // Check if we're running in Bun
      if (typeof Bun !== 'undefined') {
        const bunSqliteModuleId = 'bun:sqlite'
        const { Database } = await import(/* @vite-ignore */ bunSqliteModuleId)
        dbInstance = new Database(dbPath, { readonly })
        console.log('✅ Using bun:sqlite (faster)')
      } else {
        throw new Error('Not Bun runtime')
      }
    } catch {
      // Fallback to better-sqlite3 for Node.js (build time)
      const Database = (await import('better-sqlite3')).default
      dbInstance = new Database(dbPath, { readonly })
      console.log('⚠️ Using better-sqlite3 (Node.js compatibility fallback)')
    }
  }
  return dbInstance
}

/**
 * Close database connection (for cleanup)
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

/**
 * Get the front face of a double-faced card (DFC)
 * e.g., "Delver of Secrets // Insectile Aberration" -> "Delver of Secrets"
 */
function getFrontFace(name: string): string {
  return name.split('//')[0]?.trim() || name.trim()
}

/**
 * Normalize card name for case/diacritic-insensitive lookups
 * Same logic as app/utils/card-name-normalization.ts but server-side
 */
function normalizeCardName(name: string): string {
  return getFrontFace(name)
    .toLowerCase()
    .normalize('NFD') // Decompose diacritics
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/['-]/g, '') // Remove hyphens and apostrophes
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim()
}

/**
 * Get card by exact name match
 */
export async function getCardByName(name: string): Promise<Card | null> {
  const db = await getDatabase()
  
  const row = db.prepare(`
    SELECT * FROM cards WHERE name = ? LIMIT 1
  `).get(name)
  
  return row || null
}

/**
 * Get card by normalized name (case/diacritic-insensitive)
 */
export async function getCardByNormalizedName(inputName: string): Promise<Card | null> {
  const db = await getDatabase()
  const normalized = normalizeCardName(inputName)
  
  const row = db.prepare(`
    SELECT * FROM cards 
    WHERE name_normalized = ? 
    LIMIT 1
  `).get(normalized)
  
  return row || null
}

/**
 * Get multiple cards by exact names
 */
export async function getCardsByNames(names: string[]): Promise<Map<string, Card>> {
  const db = await getDatabase()
  const result = new Map<string, Card>()
  
  if (names.length === 0) return result
  
  const placeholders = names.map(() => '?').join(',')
  const query = `SELECT * FROM cards WHERE name IN (${placeholders})`
  const rows = db.prepare(query).all(...names)
  
  for (const row of rows) {
    result.set(row.name, row)
  }
  
  return result
}

/**
 * Get multiple cards by normalized names (case/diacritic-insensitive)
 * Returns map of input_name -> Card
 */
export async function getCardsByNormalizedNames(inputNames: string[]): Promise<Map<string, Card>> {
  const db = await getDatabase()
  const result = new Map<string, Card>()
  
  if (inputNames.length === 0) return result
  
  // Create map of normalized -> original input
  const normalizedMap = new Map<string, string>()
  for (const name of inputNames) {
    normalizedMap.set(normalizeCardName(name), name)
  }
  
  const normalizedNames = Array.from(normalizedMap.keys())
  const placeholders = normalizedNames.map(() => '?').join(',')
  const query = `SELECT * FROM cards WHERE name_normalized IN (${placeholders})`
  const rows = db.prepare(query).all(...normalizedNames)
  
  // Map back to original input names
  for (const row of rows) {
    const inputName = normalizedMap.get(row.name_normalized)
    if (inputName) {
      result.set(inputName, row)
    }
  }
  
  return result
}

/**
 * Get name mapping entry by input name
 */
export async function getNameMapping(inputName: string): Promise<NameMapping | null> {
  const db = await getDatabase()
  
  const row = db.prepare(`
    SELECT * FROM name_mappings WHERE input_name = ? LIMIT 1
  `).get(inputName)
  
  return row || null
}

/**
 * Upsert name mapping (increment hit count if exists, insert if new)
 * Gracefully handles readonly database in dev/production environments
 */
export async function upsertNameMapping(inputName: string, canonicalName: string): Promise<void> {
  try {
    // Try to get writable database connection
    // In dev mode, the shared readonly connection may prevent writes
    const db = await getDatabase(false) // Request write access
    const normalizedInput = normalizeCardName(inputName)
    const normalizedCanonical = normalizeCardName(canonicalName)
    const now = new Date().toISOString()
    
    db.prepare(`
      INSERT INTO name_mappings (input_name, canonical_name, normalized_input, normalized_canonical, hit_count, first_seen, last_seen)
      VALUES (?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(input_name) DO UPDATE SET
        hit_count = hit_count + 1,
        last_seen = ?
    `).run(inputName, canonicalName, normalizedInput, normalizedCanonical, now, now, now)
  } catch (error) {
    // Silently fail in readonly mode - name mapping tracking is non-critical
    // The core functionality (card lookups) still works fine
    console.debug('Name mapping tracking skipped (readonly database):', inputName, '→', canonicalName)
  }
}

/**
 * Get database metadata value
 */
export async function getMetadata(key: string): Promise<string | null> {
  const db = await getDatabase()
  
  const row = db.prepare(`
    SELECT value FROM metadata WHERE key = ? LIMIT 1
  `).get(key)
  
  return row ? row.value : null
}

/**
 * Set database metadata value
 */
export async function setMetadata(key: string, value: string): Promise<void> {
  const db = await getDatabase(false) // Need write access
  
  db.prepare(`
    INSERT INTO metadata (key, value)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = ?
  `).run(key, value, value)
}

/**
 * Get all Pauper-legal cards count
 */
export async function getPauperCardsCount(): Promise<number> {
  const db = await getDatabase()
  
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM cards
  `).get()
  
  return row ? row.count : 0
}

/**
 * Check if database exists and is initialized
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  try {
    const db = await getDatabase()
    const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='cards'`).get()
    return !!row
  } catch {
    return false
  }
}
