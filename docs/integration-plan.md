# 📋 Piano Completo: Integrazione Deck Normalizer nel Blog con Neon PostgreSQL

## 🎯 Obiettivo Finale

Integrare il deck normalizer in `blog.pauperwave.com/tools/deck-normalizer` usando:
- **Nuxt 4** con Nuxt Layers per condividere codice
- **Neon PostgreSQL** (free tier) per database serverless
- **Drizzle ORM** per query type-safe e migrations
- **Deploy Vercel** con blog SSG + tool SSR

---

## 🪜 Strategia di Rollout: Neon prima in `mtgo`, poi nel blog

Invece di saltare direttamente al layer nel monorepo `blog`, la migrazione a Neon+Drizzle viene validata prima **in isolamento dentro il repo `mtgo`** (dove il normalizzatore vive oggi con SQLite), e solo dopo portata nel `blog`. Motivo: un solo progetto da rompere/rollback-are se qualcosa va storto, e si può testare estensivamente su una superficie piccola prima di toccare il monorepo di produzione.

**Stage A — Validazione in `mtgo` (FASE 1 + FASE 2):**
1. Setup Neon + Drizzle *dentro `mtgo`*, in parallelo a SQLite (non sostituendolo subito)
2. Migrazione dati da `cards.db` a Neon
3. Adattare `server/api/cards/resolve.post.ts` e `server/utils/card-database.ts` a Drizzle, **dentro `mtgo`**
4. Testare estensivamente: `nuxt dev` locale, deck reali, fuzzy matching, performance vs SQLite
5. ✅ Solo quando lo stage è stabile e validato, si procede allo Stage B

**Stage B — Porting nel blog (FASE 3 → FASE 5):**
1. Creare il Nuxt Layer `app/layers/deck-normalizer` nel monorepo `blog`
2. Copiare il codice **già adattato e testato** da `mtgo` (schema Drizzle, `database.ts`, `resolve.post.ts`) invece di riscriverlo da zero
3. Integrare il layer nel `nuxt.config.ts` del blog e deploy su Vercel

Questo significa che **FASE 1 e FASE 2 di seguito si eseguono dentro `mtgo`** (la stesura originale partiva direttamente da `blog`). Da FASE 3 in poi si opera sul monorepo `blog`.

---

## 🤔 Rationale: Perché Queste Scelte Architetturali?

### Perché Neon invece di altre soluzioni?

**Confronto tra opzioni gratuite:**

| Criterio | Neon | Supabase | Cloudflare D1 | IndexedDB |
|----------|------|----------|---------------|-----------|
| **Database Type** | PostgreSQL | PostgreSQL | SQLite | Browser Storage |
| **Free Tier** | 0.5 GB, illimitati progetti | 500 MB, 2 progetti | 10 GB, 5M reads/day | Illimitato (locale) |
| **Latency** | ~20-40ms | ~30-50ms | ~10-20ms (edge) | 0ms (locale) |
| **Setup Complexity** | Basso | Medio | Medio-Alto | Basso |
| **Vercel Integration** | ✅ Eccellente | ⚠️ Buona | ⚠️ Richiede Worker | ✅ Native |
| **Serverless Ready** | ✅ Nativo | ✅ Nativo | ✅ Nativo | ❌ Solo client |
| **Connection Pooling** | ✅ Incluso | ✅ Incluso | N/A | N/A |
| **Scalability** | ✅ Auto-scale | ✅ Auto-scale | ✅ Auto-scale | ❌ Solo locale |
| **Data Persistence** | ✅ Cloud | ✅ Cloud | ✅ Cloud | ❌ Per device |
| **Multi-device Sync** | ✅ Automatico | ✅ Automatico | ✅ Automatico | ❌ Impossibile |

**Scelta Neon perché:**
1. **Integrazione Vercel perfetta**: SDK ufficiale, zero-config setup
2. **Free tier generoso**: 0.5 GB sufficiente per 10K+ carte (~20 MB reali)
3. **Connection pooling integrato**: Nessuna gestione manuale
4. **Branching database**: Perfetto per testing/staging (feature unica)
5. **Auto-sleep**: Database inattivo non consuma risorse
6. **Ottima compatibilità con Drizzle ORM**: Supporto nativo, nessun cold start issue
7. **Community & Support**: Documentazione eccellente, community attiva

**Perché non le altre:**
- **Supabase**: Ottima ma più feature-rich del necessario, setup più complesso
- **Cloudflare D1**: Richiede Workers (infrastruttura separata), SQLite ha limitazioni per query complesse
- **IndexedDB**: Client-only, niente sync multi-device, download iniziale ~20 MB pesante

### Perché Drizzle ORM?

**Confronto ORM per TypeScript:**

| Criterio | Drizzle | Prisma | Kysely | Raw SQL |
|----------|---------|--------|--------|---------|
| **Type Safety** | ✅✅✅ Inferito automatico | ✅✅✅ Generato | ✅✅ Type builder | ❌ Nessuno |
| **Developer Experience** | ✅✅✅ Eccellente | ✅✅✅ Eccellente | ✅✅ Ottima | ❌ Manuale |
| **Migrations** | ✅✅ SQL + TypeScript | ✅ Automatiche | ⚠️ Manuali | ❌ Script custom |
| **Query Builder** | ✅✅ SQL-like + TypeScript | ✅ Fluent API | ✅ SQL-like | SQL puro |
| **Bundle Size** | ✅✅✅ ~100 KB | ⚠️ ~1 MB | ✅✅ ~50 KB | ✅ 0 KB |
| **Ecosystem** | ✅✅ Crescente rapidamente | ✅✅✅ Maturo | ✅ Stabile | N/A |
| **Neon Support** | ✅✅✅ Ufficiale + ottimizzato | ✅✅✅ Ufficiale | ✅✅ Community | ✅ Nativo |
| **Serverless Ready** | ✅✅✅ Native, zero cold start | ✅ Con Data Proxy | ✅✅✅ Native | ✅ Native |
| **Relation Handling** | ✅✅ Relational queries | ✅✅✅ Automatico | ✅ Join espliciti | ❌ Manuale |
| **Learning Curve** | ✅✅ Bassa (SQL familiare) | ✅✅ Bassa | ✅✅ Media | ✅✅✅ Alta |
| **Edge Runtime** | ✅✅✅ Supportato | ❌ Non supportato | ✅✅✅ Supportato | ✅ Supportato |

**Scelta Drizzle perché:**

1. **Type Safety Inferita Automaticamente**:
   ```typescript
   // Drizzle inferisce i tipi dal schema TypeScript
   import { cards } from './schema'
   
   const card = await db.select().from(cards).where(eq(cards.name, "Lightning Bolt"))
   // card è automaticamente tipizzato come Card[] - nessun codegen necessario
   
   // VS Prisma (richiede `prisma generate` dopo ogni schema change)
   const card = await prisma.card.findFirst({ where: { name: "Lightning Bolt" } })
   ```

2. **Bundle Size Minimale (~100 KB vs ~1 MB Prisma)**:
   ```typescript
   // Drizzle è tree-shakeable: importi solo quello che usi
   import { eq } from 'drizzle-orm'
   import { drizzle } from 'drizzle-orm/neon-http'
   
   // Prisma importa tutto il client (~1 MB), anche se usi solo card.findFirst()
   import { PrismaClient } from '@prisma/client'
   ```

3. **Zero Cold Starts in Serverless**:
   ```typescript
   // Drizzle con Neon HTTP: nessuna connessione TCP, zero cold start
   import { neon } from '@neondatabase/serverless'
   import { drizzle } from 'drizzle-orm/neon-http'
   
   const sql = neon(process.env.DATABASE_URL!)
   const db = drizzle(sql)
   
   // Prisma richiede connessione TCP: ~2s cold start (mitigabile con Data Proxy $25/mese)
   ```

4. **SQL-like Syntax (Familiare e Leggibile)**:
   ```typescript
   // Drizzle: sintassi SQL familiare con type safety
   const cards = await db
     .select()
     .from(cardsTable)
     .where(inArray(cardsTable.name_normalized, normalizedNames))
     .orderBy(cardsTable.name)
   
   // Prisma: DSL proprietaria (comunque ottima, ma meno familiare)
   const cards = await prisma.card.findMany({
     where: { name_normalized: { in: normalizedNames } },
     orderBy: { name: 'asc' }
   })
   ```

5. **Migration System Flessibile**:
   ```bash
   # Drizzle: genera SQL da schema TypeScript
   bun drizzle-kit generate
   bun drizzle-kit migrate
   
   # Migrations sono file SQL leggibili, editabili manualmente se serve
   # Nessun lock-in: puoi passare a raw SQL qualsiasi momento
   ```

6. **Relational Queries con Type Safety**:
   ```typescript
   // Drizzle supporta relazioni con query separate (più controllo)
   const cardWithMappings = await db.query.cards.findFirst({
     where: eq(cards.name, 'Lightning Bolt'),
     with: {
       nameMappings: true  // Automatically typed!
     }
   })
   ```

**Trade-off accettabili:**
- ⚠️ **Ecosystem più giovane**: Meno plugin di Prisma (ma cresce rapidamente)
- ⚠️ **Relazioni meno automatiche**: Richiede definizione esplicita (ma più controllo)
- ✅ **Performance superiore**: Bundle 10x più piccolo, zero cold start
- ✅ **Edge Runtime ready**: Funziona su Vercel Edge, Cloudflare Workers, etc.

**Perché non Prisma:**
- ⚠️ Bundle size grande (~1 MB vs ~100 KB Drizzle)
- ⚠️ Cold starts in serverless (~2s, mitigabile con Data Proxy a $25/mese)
- ⚠️ Non compatibile con Edge Runtime (Vercel Edge, Cloudflare Workers)
- ✅ Drizzle offre DX simile con performance 10x migliori per serverless

4. **Relation Management**:

### Perché Nuxt Layers invece di Micro-frontends?

**Confronto architetture:**

| Criterio | Nuxt Layers | Monorepo Separato | Micro-frontend |
|----------|-------------|-------------------|----------------|
| **Code Sharing** | ✅✅✅ Nativo | ⚠️ Manuale | ❌ Duplicazione |
| **Build Time** | ✅ Singolo build | ⚠️ Build multipli | ⚠️ Build multipli |
| **Dependency Management** | ✅ Unificato | ⚠️ Duplicati | ❌ Per app |
| **Type Safety** | ✅✅✅ Shared types | ⚠️ Export/import | ❌ Runtime |
| **Deploy Complexity** | ✅ Single deploy | ⚠️ Orchestration | ❌ Multipli |
| **Route Integration** | ✅✅✅ Seamless | ⚠️ Proxy config | ❌ Client routing |
| **Asset Sharing** | ✅ Automatico | ⚠️ CDN | ❌ Duplicati |

**Scelta Nuxt Layers perché:**

1. **Estensione nativa di Nuxt 3**: Progettata esattamente per questo use case
2. **Zero overhead**: Nessun runtime aggiuntivo, tutto compile-time
3. **Type safety completa**: Types condivisi tra layer automaticamente
4. **DX ottimale**: Hot reload funziona cross-layer
5. **Route merging**: Routes del layer si integrano automaticamente nel blog
6. **Component auto-import**: Componenti disponibili ovunque nel monorepo

**Esempio pratico:**
```typescript
// Blog root config
export default defineNuxtConfig({
  extends: [
    './app/layers/deck-normalizer'  // Layer aggiunto
  ]
})

// Ora /tools/deck-normalizer è automaticamente disponibile
// Componenti del layer sono auto-importati in tutto il blog
// Types condivisi senza export/import manuali
```

### Perché SSR per il Tool invece di SPA?

**Confronto rendering modes:**

| Criterio | SSR | SPA | SSG |
|----------|-----|-----|-----|
| **SEO** | ✅ Perfetto | ❌ Limited | ✅ Perfetto |
| **Initial Load** | ✅ Fast | ⚠️ Slow | ✅ Fastest |
| **Interactivity** | ✅ Hydration | ✅ Immediate | ✅ Hydration |
| **Data Freshness** | ✅ Runtime | ✅ Runtime | ❌ Build time |
| **Database Access** | ✅ Server API | ✅ Server API | ❌ No DB |
| **Caching** | ✅ Flexible | ⚠️ Limited | ✅ Static |

**Scelta SSR perché:**

1. **Database access necessario**: Il tool deve interrogare Postgres a runtime
2. **SEO-friendly**: `/tools/deck-normalizer` indicizzabile su Google
3. **Progressive Enhancement**: Funziona anche senza JS (form submit)
4. **Shared session**: Può condividere auth/session con blog se serve in futuro
5. **Mixed rendering**: Blog SSG + Tool SSR nello stesso deploy Vercel

**Route Rules ottimali:**
```typescript
routeRules: {
  '/': { prerender: true },              // Blog homepage
  '/articles/**': { prerender: true },    // Articoli statici
  '/tools/deck-normalizer': { ssr: true }, // Tool dinamico
  '/api/cards/**': { ssr: true }          // API serverless
}
```

---

## 📐 Architettura Finale

```
blog.pauperwave.com/
├── /                          → Blog SSG (prerendered)
├── /articles/**               → Articoli prerendered
├── /docs/**                   → Docs prerendered
├── /editor/**                 → Nuxt Studio (SSR)
└── /tools/deck-normalizer     → Deck Normalizer (SSR con Neon DB)
```

### Stack Tecnologico

- **Frontend**: Nuxt 4 + Nuxt UI + TypeScript
- **Database**: Neon PostgreSQL (free tier: 0.5GB, serverless)
- **ORM**: Drizzle ORM (lightweight, zero cold start, type-safe)
- **Hosting**: Vercel (preset Vercel per Nitro)
- **Build**: Bun (già usato nel blog)

**Perché questo stack:**
- **Nuxt 4**: Framework maturo, SSR + SSG hybrid, ottimo DX, Layers per modularità
- **Neon**: PostgreSQL serverless con free tier generoso, branching database
- **Drizzle**: Bundle minimale (~100 KB), zero cold start, SQL-like syntax familiare
- **Vercel**: Deploy seamless, edge network, zero-config
- **Bun**: Runtime veloce, package manager efficiente

---

## 🗂️ Struttura Monorepo

```
pauperwave_blog/                    (root del blog)
├── app/
│   ├── layers/
│   │   └── deck-normalizer/        (nuovo Nuxt Layer)
│   │       ├── app/
│   │       │   ├── components/
│   │       │   │   └── deck-normalizer/
│   │       │   │       ├── CollapsibleCard.vue
│   │       │   │       ├── InputCard.vue
│   │       │   │       ├── OutputCard.vue
│   │       │   │       ├── PerformanceCard.vue
│   │       │   │       ├── SuggestionsCard.vue
│   │       │   │       ├── MissingCardsCard.vue
│   │       │   │       ├── ErrorCard.vue
│   │       │   │       ├── ValidationCard.vue
│   │       │   │       ├── ProgressChecklistCard.vue
│   │       │   │       └── TestDeckPresets.vue
│   │       │   ├── composables/
│   │       │   │   └── useDeckNormalizer.ts
│   │       │   ├── pages/
│   │       │   │   └── tools/
│   │       │   │       └── deck-normalizer.vue
│   │       │   ├── services/
│   │       │   │   └── scryfall.ts
│   │       │   ├── types/
│   │       │   │   ├── deck.ts
│   │       │   │   └── suggestions.ts
│   │       │   └── utils/
│   │       │       ├── card-name-normalization.ts
│   │       │       ├── deck-formatter.ts
│   │       │       ├── deck-parser.ts
│   │       │       └── suggestion-scorer.ts
│   │       ├── server/
│   │       │   ├── api/
│   │       │   │   └── cards/
│   │       │   │       └── resolve.post.ts
│   │       │   ├── database/
│   │       │   │   └── schema.ts             (Drizzle schema)
│   │       │   └── utils/
│   │       │       ├── database.ts           (Drizzle client wrapper)
│   │       │       └── card-helpers.ts       (Fuzzy search, normalization)
│   │       ├── shared/
│   │       │   └── types/
│   │       │       └── index.ts              (Shared Card/API types)
│   │       ├── assets/
│   │       │   └── css/
│   │       │       └── main.css              (Tool-specific styles)
│   │       └── nuxt.config.ts                (Layer configuration)
│   │
│   └── ... (resto del blog: pages, components, content, etc.)
│
├── scripts/
│   ├── migrate-sqlite-to-postgres.ts         (Migration script)
│   ├── download-bulk-data.ts                 (Existing blog script)
│   └── ... (script esistenti)
│
├── server/
│   └── database/
│       └── schema.ts                         (Root Drizzle schema)
│
├── drizzle/                                  (Generated migrations)
│   └── 0000_init.sql
│
├── drizzle.config.ts                         (Drizzle configuration)
├── nuxt.config.ts                            (Root config, extends layer)
├── .env                                      (DATABASE_URL, etc.)
├── .env.example                              (Template per altri dev)
├── package.json
├── bun.lock
└── README.md
```

**Perché questa struttura:**

1. **Separation of Concerns**: Layer isolato = facile manutenzione
2. **Reusability**: Deck normalizer può essere estratto come package npm in futuro
3. **Type Safety**: `shared/types` condivisi tra client e server
4. **Convention over Configuration**: Nuxt auto-importa componenti/composables
5. **Drizzle centralized**: Schema TypeScript per type safety e consistenza

---

## 🔄 Fasi di Implementazione

### **FASE 1: Setup Database Neon + Drizzle** ⏱️ ~30 min · 📍 in `mtgo`

#### 1.1 Creare Database Neon

1. Registrarsi su [neon.tech](https://neon.tech)
2. Creare nuovo progetto "pauperwave-cards"
3. Copiare `DATABASE_URL` (formato: `postgresql://user:pass@host/db?sslmode=require`)
4. Salvare in `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@ep-example.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

**Note:**
- `DATABASE_URL`: Connection pooling (usato da app in production)
- Neon fornisce l'URL nel dashboard

#### 1.2 Installare Dipendenze

```bash
cd mtgo/  # setup Neon+Drizzle qui prima, non ancora nel blog
bun add drizzle-orm @neondatabase/serverless
bun add -D drizzle-kit @types/node
```

**Versioni consigliate (verificate su npm, 2026-09-23):**
- `drizzle-orm`: ^0.45.3
- `drizzle-kit`: ^0.31.11
- `@neondatabase/serverless`: ^1.1.0

> Nota: `@neondatabase/serverless` è passato a v1.x (breaking change minori rispetto a 0.9.x). `drizzle-orm` 0.45+ è compatibile con entrambe le major, ma verificare il changelog prima di eseguire `bun add` in caso siano uscite versioni più recenti nel frattempo.

#### 1.3 Inizializzare Drizzle

`server/database/` esiste già in `mtgo` (contiene `cards.db`). Aggiungere solo i nuovi file, senza toccare `cards.db` finché la migrazione non è validata:
- `server/database/schema.ts`: Schema database TypeScript (nuovo, coesiste con `cards.db`)
- `drizzle.config.ts`: Config per drizzle-kit (root del progetto)

#### 1.4 Creare Schema Drizzle

File: `mtgo/server/database/schema.ts`

```typescript
// Drizzle schema per Deck Normalizer
// Database: Neon PostgreSQL (serverless)

import { pgTable, text, real, timestamp, integer, index } from 'drizzle-orm/pg-core'

// Card table: 10,573 Pauper-legal cards
export const cards = pgTable('cards', {
  id: text('id').primaryKey(),                    // Scryfall UUID
  name: text('name').notNull(),                   // "Lightning Bolt"
  name_normalized: text('name_normalized').notNull(), // "lightningbolt" (no spaces, lowercase, no accents)
  type_line: text('type_line').notNull(),         // "Instant"
  mana_cost: text('mana_cost'),                   // "{R}"
  oracle_text: text('oracle_text'),               // "Lightning Bolt deals 3 damage..."
  colors: text('colors').notNull(),               // JSON: ["R"]
  color_identity: text('color_identity').notNull(), // JSON: ["R"]
  keywords: text('keywords').notNull(),           // JSON: []
  legalities: text('legalities').notNull(),       // JSON: {"pauper":"legal","standard":"not_legal",...}
  rarity: text('rarity').notNull(),               // "common"
  set_code: text('set_code').notNull(),           // "lea"
  set_name: text('set_name').notNull(),           // "Limited Edition Alpha"
  collector_number: text('collector_number').notNull(), // "161"
  image_uris: text('image_uris'),                 // JSON: {"small":"https://...","normal":"https://...",...}
  card_faces: text('card_faces'),                 // JSON array for DFCs, null for single-faced
  layout: text('layout').notNull(),               // "normal", "transform", "split", etc.
  cmc: real('cmc').notNull(),                     // 1.0 (converted mana cost)
  power: text('power'),                           // "3" for creatures
  toughness: text('toughness'),                   // "3" for creatures
  loyalty: text('loyalty'),                       // "3" for planeswalkers
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  nameIdx: index('cards_name_idx').on(table.name),
  nameNormalizedIdx: index('cards_name_normalized_idx').on(table.name_normalized),
  typeLineIdx: index('cards_type_line_idx').on(table.type_line)
}))

// Name mapping table: tracks user input -> canonical name
// Usato per analytics e per migliorare fuzzy matching nel tempo
export const nameMappings = pgTable('name_mappings', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  input_name: text('input_name').notNull().unique(), // "bolt", "ligthning bolt" (typo)
  canonical_name: text('canonical_name').notNull(),   // "Lightning Bolt"
  normalized_input: text('normalized_input').notNull(), // "bolt", "ligthningbolt"
  normalized_canonical: text('normalized_canonical').notNull(), // "lightningbolt"
  hit_count: integer('hit_count').notNull().default(1), // Quante volte questo mapping è stato usato
  first_seen: timestamp('first_seen').defaultNow().notNull(),
  last_seen: timestamp('last_seen').defaultNow().notNull() // Ultimo utilizzo
}, (table) => ({
  inputNameIdx: index('name_mappings_input_name_idx').on(table.input_name),
  normalizedInputIdx: index('name_mappings_normalized_input_idx').on(table.normalized_input)
}))

// Metadata table: store database info
export const metadata = pgTable('metadata', {
  key: text('key').primaryKey(),                  // "pauper_cards_count", "last_updated"
  value: text('value').notNull(),                 // "10573", "2025-03-09T12:00:00Z"
  updated_at: timestamp('updated_at').defaultNow().notNull()
})
```

**Note sullo schema:**
1. **JSON fields**: Stored as `text` in Postgres. Parsing manuale nel codice.
2. **Indexes**: Definiti inline per performance
3. **name_normalized**: Pre-computed per evitare normalization a runtime
4. **Type inference**: Drizzle inferisce automaticamente i tipi dal schema

#### 1.5 Configurare Drizzle Kit

File: `mtgo/drizzle.config.ts`

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './server/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!
  }
} satisfies Config
```

#### 1.6 Generare e Applicare Migration

```bash
cd mtgo/
bunx drizzle-kit generate
bunx drizzle-kit push
```

Questo:
1. Genera migration SQL in `drizzle/`
2. Applica migration su Neon database

**Output atteso:**
```
Reading schema from ./server/database/schema.ts
Generating migrations...
✔ Generated migration 0000_init.sql

Pushing schema to database...
✔ Schema pushed successfully
```

---

### **FASE 2: Migrazione Dati SQLite → Postgres** ⏱️ ~20 min · 📍 in `mtgo`

#### 2.1 Creare Script di Migrazione

File: `mtgo/scripts/migrate-sqlite-to-postgres.ts`

```typescript
/**
 * Migrates card data from SQLite (server/database/cards.db, stesso repo)
 * to Neon PostgreSQL using Drizzle
 * 
 * Run: bun run scripts/migrate-sqlite-to-postgres.ts
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { cards, nameMappings, metadata } from '../server/database/schema'
import { resolve } from 'path'
import { eq } from 'drizzle-orm'

// Import better-sqlite3 for reading source database
// @ts-expect-error - Better-sqlite3 types
import Database from 'better-sqlite3'

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

// Path to source SQLite database (stesso repo, script vive in mtgo/scripts/)
const SQLITE_PATH = resolve(__dirname, '../server/database/cards.db')

interface SQLiteCard {
  id: string
  name: string
  name_normalized: string
  type_line: string
  mana_cost: string | null
  oracle_text: string | null
  colors: string
  color_identity: string
  keywords: string
  legalities: string
  rarity: string
  set_code: string
  set_name: string
  collector_number: string
  image_uris: string | null
  card_faces: string | null
  layout: string
  cmc: number
  power: string | null
  toughness: string | null
  loyalty: string | null
  created_at: string
}

async function migrate() {
  console.log('🔄 Starting migration from SQLite to Neon Postgres...')
  console.log(`📂 Source: ${SQLITE_PATH}`)
  
  // Open SQLite database (read-only)
  const sqlite = new Database(SQLITE_PATH, { readonly: true })
  
  try {
    // Read all cards from SQLite
    console.log('📖 Reading cards from SQLite...')
    const sqliteCards = sqlite.prepare('SELECT * FROM cards').all() as SQLiteCard[]
    console.log(`📊 Found ${sqliteCards.length.toLocaleString()} cards to migrate`)
    
    // Check if Postgres already has data
    const existingCards = await db.select().from(cards)
    if (existingCards.length > 0) {
      console.log(`⚠️  Postgres already has ${existingCards.length} cards`)
      const readline = await import('readline')
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      })
      
      const answer = await new Promise<string>((resolve) => {
        rl.question('Delete existing data and re-import? (yes/no): ', resolve)
      })
      rl.close()
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Migration cancelled')
        return
      }
      
      console.log('🗑️  Deleting existing data...')
      await db.delete(cards)
      await db.delete(nameMappings)
      await db.delete(metadata)
    }
    
    // Batch insert to Postgres (500 cards at a time to avoid memory issues)
    const BATCH_SIZE = 500
    let imported = 0
    
    for (let i = 0; i < sqliteCards.length; i += BATCH_SIZE) {
      const batch = sqliteCards.slice(i, i + BATCH_SIZE)
      
      await db.insert(cards).values(
        batch.map((card) => ({
          id: card.id,
          name: card.name,
          name_normalized: card.name_normalized,
          type_line: card.type_line,
          mana_cost: card.mana_cost,
          oracle_text: card.oracle_text,
          colors: card.colors,
          color_identity: card.color_identity,
          keywords: card.keywords,
          legalities: card.legalities,
          rarity: card.rarity,
          set_code: card.set_code,
          set_name: card.set_name,
          collector_number: card.collector_number,
          image_uris: card.image_uris,
          card_faces: card.card_faces,
          layout: card.layout,
          cmc: card.cmc,
          power: card.power,
          toughness: card.toughness,
          loyalty: card.loyalty,
          created_at: new Date(card.created_at)
        }))
      ).onConflictDoNothing()
      
      imported += batch.length
      const percentage = ((imported / sqliteCards.length) * 100).toFixed(1)
      console.log(`✅ Migrated ${imported.toLocaleString()}/${sqliteCards.length.toLocaleString()} cards (${percentage}%)`)
    }
    
    // Migrate name mappings (if any exist)
    console.log('\n📖 Reading name mappings from SQLite...')
    const sqliteMappings = sqlite.prepare('SELECT * FROM name_mappings').all() as any[]
    
    if (sqliteMappings.length > 0) {
      console.log(`📊 Found ${sqliteMappings.length} name mappings to migrate`)
      
      for (let i = 0; i < sqliteMappings.length; i += BATCH_SIZE) {
        const batch = sqliteMappings.slice(i, i + BATCH_SIZE)
        
        await db.insert(nameMappings).values(
          batch.map((mapping) => ({
            input_name: mapping.input_name,
            canonical_name: mapping.canonical_name,
            normalized_input: mapping.normalized_input,
            normalized_canonical: mapping.normalized_canonical,
            hit_count: mapping.hit_count,
            first_seen: new Date(mapping.first_seen),
            last_seen: new Date(mapping.last_seen)
          }))
        ).onConflictDoNothing()
        
        console.log(`✅ Migrated ${Math.min(i + BATCH_SIZE, sqliteMappings.length)}/${sqliteMappings.length} mappings`)
      }
    } else {
      console.log('ℹ️  No name mappings found in source database')
    }
    
    // Set metadata
    console.log('\n📝 Setting metadata...')
    await db.insert(metadata).values({
      key: 'pauper_cards_count',
      value: sqliteCards.length.toString()
    }).onConflictDoUpdate({
      target: metadata.key,
      set: { value: sqliteCards.length.toString(), updated_at: new Date() }
    })
    
    await db.insert(metadata).values({
      key: 'last_migration',
      value: new Date().toISOString()
    }).onConflictDoUpdate({
      target: metadata.key,
      set: { value: new Date().toISOString(), updated_at: new Date() }
    })
    
    // Verify migration
    console.log('\n🔍 Verifying migration...')
    const finalCards = await db.select().from(cards)
    const finalMappings = await db.select().from(nameMappings)
    
    console.log('\n✅ Migration completed successfully!')
    console.log(`📊 Total cards in Postgres: ${finalCards.length.toLocaleString()}`)
    console.log(`📊 Total name mappings: ${finalMappings.length.toLocaleString()}`)
    
    if (finalCards.length !== sqliteCards.length) {
      console.warn(`⚠️  Warning: Card count mismatch! Expected ${sqliteCards.length}, got ${finalCards.length}`)
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    // Cleanup
    sqlite.close()
  }
}

// Run migration
migrate()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error)
    process.exit(1)
  })
```

**Cosa fa lo script:**
1. Legge tutte le carte da SQLite (`../mtgo/server/database/cards.db`)
2. Controlla se Postgres è vuoto (safety check)
3. Inserisce carte in batch di 500 per evitare memory issues
4. Migra anche name_mappings (se esistono)
5. Imposta metadata (count, last_migration timestamp)
6. Verifica che il count corrisponda

#### 2.2 Eseguire Migrazione

```bash
cd mtgo/
bun run scripts/migrate-sqlite-to-postgres.ts
```

**Output atteso:**
```
🔄 Starting migration from SQLite to Neon Postgres...
📂 Source: C:\Users\...\mtgo\server\database\cards.db
📖 Reading cards from SQLite...
📊 Found 10,573 cards to migrate
✅ Migrated 500/10,573 cards (4.7%)
✅ Migrated 1,000/10,573 cards (9.5%)
...
✅ Migrated 10,573/10,573 cards (100.0%)

📖 Reading name mappings from SQLite...
ℹ️  No name mappings found in source database

📝 Setting metadata...

🔍 Verifying migration...

✅ Migration completed successfully!
📊 Total cards in Postgres: 10,573
📊 Total name mappings: 0

🎉 All done!
```

**Tempo stimato:** ~30 secondi per 10K cards

#### 2.3 Verificare Migrazione

```bash
# Opzione 1: Drizzle Studio (UI grafica)
bunx drizzle-kit studio

# Opzione 2: Query diretta con psql o Neon Console
# Usa la Neon web console per eseguire query SQL
```

Drizzle Studio aprirà `http://localhost:4983` con UI per esplorare i dati.

---

#### 2.4 Adattare Server Utilities con Drizzle (in `mtgo`)

Nuovo file, affiancato a `card-database.ts` (SQLite) esistente — non sostituirlo finché Stage A non è validato.

**File: `mtgo/server/utils/database.ts`**

```typescript
/**
 * Database utilities using Drizzle ORM
 * Coesiste con card-database.ts (SQLite) finché non validato
 */

import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq, inArray, sql } from 'drizzle-orm'
import { cards, nameMappings, metadata } from '../database/schema'
import type { Card, NameMapping } from '../../shared/types'

// Initialize Neon connection
const sqlClient = neon(process.env.DATABASE_URL!)
export const db = drizzle(sqlClient)

/**
 * Normalize card name for case/diacritic-insensitive lookups
 * Same logic as client-side for consistency
 */
export function normalizeCardName(name: string): string {
  return name
    .split('//')[0]?.trim() || name.trim()  // Extract front face for DFCs
    .toLowerCase()
    .normalize('NFD')                       // Decompose diacritics (é → e + ´)
    .replace(/[\u0300-\u036f]/g, '')        // Remove diacritic marks
    .replace(/['-]/g, '')                   // Remove hyphens and apostrophes
    .replace(/\s+/g, ' ')                   // Collapse multiple spaces
    .trim()
}

/**
 * Get card by exact name match
 */
export async function getCardByName(name: string): Promise<Card | null> {
  const result = await db.select().from(cards).where(eq(cards.name, name)).limit(1)
  return result[0] || null
}

/**
 * Get card by normalized name (case/diacritic-insensitive)
 */
export async function getCardByNormalizedName(inputName: string): Promise<Card | null> {
  const normalized = normalizeCardName(inputName)
  
  const result = await db.select().from(cards).where(eq(cards.name_normalized, normalized)).limit(1)
  
  return result[0] || null
}

/**
 * Get multiple cards by normalized names
 * Returns Map of input_name -> Card for easy lookup
 */
export async function getCardsByNormalizedNames(inputNames: string[]): Promise<Map<string, Card>> {
  const result = new Map<string, Card>()
  if (inputNames.length === 0) return result
  
  // Create map of normalized -> original input
  const normalizedMap = new Map<string, string>()
  for (const name of inputNames) {
    normalizedMap.set(normalizeCardName(name), name)
  }
  
  const normalizedNames = Array.from(normalizedMap.keys())
  
  // Query Postgres
  const cardResults = await db.select().from(cards).where(inArray(cards.name_normalized, normalizedNames))
  
  // Map back to original input names
  for (const card of cardResults) {
    const inputName = normalizedMap.get(card.name_normalized)
    if (inputName) {
      result.set(inputName, card as Card)
    }
  }
  
  return result
}

/**
 * Upsert name mapping (increment hit count if exists)
 * Used for analytics and improving fuzzy matching over time
 */
export async function upsertNameMapping(
  inputName: string,
  canonicalName: string
): Promise<void> {
  const normalizedInput = normalizeCardName(inputName)
  const normalizedCanonical = normalizeCardName(canonicalName)
  
  try {
    await db.insert(nameMappings).values({
      input_name: inputName,
      canonical_name: canonicalName,
      normalized_input: normalizedInput,
      normalized_canonical: normalizedCanonical,
      hit_count: 1,
      first_seen: new Date(),
      last_seen: new Date()
    }).onConflictDoUpdate({
      target: nameMappings.input_name,
      set: {
        hit_count: sql`${nameMappings.hit_count} + 1`,
        last_seen: new Date()
      }
    })
  } catch (error) {
    // Non-critical, log and continue
    console.error('Failed to upsert name mapping:', error)
  }
}

/**
 * Levenshtein distance algorithm for fuzzy matching
 */
export function levenshteinDistance(str1: string, str2: string): number {
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
 * Fuzzy match result with similarity score
 */
export interface FuzzyMatch {
  card: Card
  distance: number
  similarity: number
}

/**
 * Find cards using fuzzy name matching
 * Uses Levenshtein distance on normalized names
 * 
 * @param inputName - The misspelled or partial card name
 * @param maxResults - Maximum number of results (default 5)
 * @param minSimilarity - Minimum similarity threshold 0-1 (default 0.6)
 */
export async function findCardsByFuzzyName(
  inputName: string,
  maxResults = 5,
  minSimilarity = 0.6
): Promise<FuzzyMatch[]> {
  const normalized = normalizeCardName(inputName)
  
  // Get all cards (TODO: optimize with trigram search or full-text search)
  // For now, we fetch all and compute locally (10K cards = ~20ms)
  const allCards = await db.select().from(cards)
  
  const matches: FuzzyMatch[] = []
  
  for (const card of allCards) {
    const cardNormalized = normalizeCardName(card.name)
    const distance = levenshteinDistance(normalized, cardNormalized)
    const maxLength = Math.max(normalized.length, cardNormalized.length)
    const similarity = 1 - (distance / maxLength)
    
    if (similarity >= minSimilarity) {
      matches.push({
        card: card as Card,
        distance,
        similarity
      })
    }
  }
  
  // Sort by similarity (best first), then by distance
  matches.sort((a, b) => {
    const simDiff = b.similarity - a.similarity
    if (Math.abs(simDiff) > 0.001) return simDiff
    return a.distance - b.distance
  })
  
  return matches.slice(0, maxResults)
}

/**
 * Get metadata value
 */
export async function getMetadata(key: string): Promise<string | null> {
  const result = await db.select().from(metadata).where(eq(metadata.key, key)).limit(1)
  return result[0]?.value ?? null
}

/**
 * Set metadata value
 */
export async function setMetadata(key: string, value: string): Promise<void> {
  await db.insert(metadata).values({ key, value, updated_at: new Date() })
    .onConflictDoUpdate({
      target: metadata.key,
      set: { value, updated_at: new Date() }
    })
}

/**
 * Get total Pauper cards count
 */
export async function getPauperCardsCount(): Promise<number> {
  const result = await db.select({ count: sql<number>`count(*)` }).from(cards)
  return result[0]?.count ?? 0
}
```

**Note sull'implementazione:**
1. **Drizzle connection**: Usa Neon HTTP per zero cold starts
2. **Fuzzy search**: Per ora in-memory (10K cards = ~20ms). Ottimizzabile con `pg_trgm` in futuro
3. **Error handling**: Name mapping errors non bloccano richieste
4. **Type safety**: Drizzle inferisce automaticamente i tipi dal schema

**TODO futuro (ottimizzazioni):**
```sql
-- Enable pg_trgm extension for faster fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX cards_name_trgm_idx ON cards USING gin (name_normalized gin_trgm_ops);

-- Then use in Drizzle:
const matches = await db.execute(sql`
  SELECT *, similarity(name_normalized, ${normalized}) as sim
  FROM cards
  WHERE similarity(name_normalized, ${normalized}) > ${minSimilarity}
  ORDER BY sim DESC
  LIMIT ${maxResults}
`)
```

#### 2.5 Adattare Server API (in `mtgo`)

Per testare in parallelo senza rompere l'endpoint SQLite esistente, creare una rotta separata invece di sovrascrivere `resolve.post.ts`.

**File: `mtgo/server/api/cards/resolve-neon.post.ts`** (nuova rotta di test)

```typescript
/**
 * POST /api/cards/resolve-neon
 *
 * Copia di resolve.post.ts che usa Neon+Drizzle invece di SQLite.
 * Rotta separata per test A/B contro l'endpoint SQLite esistente,
 * finché Stage A non è validato e si può fare il cutover.
 */

import type {
  ResolveCardsRequest,
  ResolveCardsResponse,
  Card,
  ScryfallCard,
  FuzzySuggestion
} from '../../../shared/types'

import {
  getCardsByNormalizedNames,
  upsertNameMapping,
  findCardsByFuzzyName,
  normalizeCardName,
  levenshteinDistance
} from '../../utils/database'

// ... resto del file è IDENTICO all'originale server/api/cards/resolve.post.ts
// Unico cambio: import da '../../utils/card-database' → '../../utils/database'
// Le function signature sono identiche, nessun cambio alla logica applicativa
```

**Modifiche necessarie:**
1. Copiare `resolve.post.ts` → `resolve-neon.post.ts`
2. Cambiare solo l'import da `card-database` a `database`
3. Puntare temporaneamente il frontend (o un flag/query param) alla nuova rotta per i test
4. Solo dopo la validazione (Stage A completato): rinominare/sostituire `resolve.post.ts` e rimuovere la rotta di test

---

**FASE 3 — da qui si opera sul monorepo `blog`, portando il codice già validato in `mtgo`.**

---

### **FASE 3: Creare Nuxt Layer per Deck Normalizer** ⏱️ ~45 min · 📍 in `blog`

#### 3.1 Creare Struttura Layer

```bash
cd blog/
mkdir -p app/layers/deck-normalizer/{app/{components,composables,pages,services,types,utils},server/{api,utils,database},shared/types,assets/css}
```

#### 3.2 Copiare Codice già validato da `mtgo` → Layer

A differenza della stesura originale, qui **non c'è più nulla da riscrivere**: `database.ts` e `resolve-neon.post.ts` sono già stati adattati a Drizzle e testati in Stage A (Fase 2.4/2.5). Si copiano così come sono.

**Script automatico per copiare files:**

File: `blog/scripts/copy-mtgo-to-layer.sh`

```bash
#!/bin/bash

# Copy MTGO deck normalizer (già Drizzle-ready) to Nuxt Layer
SOURCE="../mtgo"
DEST="app/layers/deck-normalizer"

echo "📦 Copying MTGO deck normalizer to layer..."

# App files
cp -r "$SOURCE/app/components/deck-normalizer" "$DEST/app/components/"
cp -r "$SOURCE/app/composables"/* "$DEST/app/composables/"
cp -r "$SOURCE/app/services"/* "$DEST/app/services/"
cp -r "$SOURCE/app/types"/* "$DEST/app/types/"
cp -r "$SOURCE/app/utils"/* "$DEST/app/utils/"
cp "$SOURCE/app/pages/index.vue" "$DEST/app/pages/tools/deck-normalizer.vue"

# Server (già Drizzle, validati in Stage A)
cp "$SOURCE/server/database/schema.ts" "$DEST/server/database/"
cp "$SOURCE/server/utils/database.ts" "$DEST/server/utils/"
cp "$SOURCE/server/api/cards/resolve-neon.post.ts" "$DEST/server/api/cards/resolve.post.ts"

# Shared types
cp -r "$SOURCE/shared/types"/* "$DEST/shared/types/"

# Assets
cp -r "$SOURCE/app/assets/css"/* "$DEST/assets/css/"

echo "✅ Files copied successfully!"
```

**Eseguire:**
```bash
chmod +x scripts/copy-mtgo-to-layer.sh
./scripts/copy-mtgo-to-layer.sh
```

**Modifiche necessarie dopo la copia:**
1. Aggiornare gli import da path relativi (`../../shared/types`) a `~/shared/types` (alias Nuxt Layer)
2. Nessun cambio alla logica applicativa: le function signature restano identiche

#### 3.3 Layer Configuration

**File: `blog/app/layers/deck-normalizer/nuxt.config.ts`**

```typescript
// Deck Normalizer Layer Configuration
export default defineNuxtConfig({
  // Auto-import components from this layer
  components: [
    {
      path: '~/components',
      pathPrefix: false
    }
  ],

  // Layer-specific route rules
  routeRules: {
    '/tools/deck-normalizer': { ssr: true },
    '/api/cards/**': { ssr: true }
  }
})
```

---

### **FASE 4: Integrare Layer nel Blog** ⏱️ ~20 min · 📍 in `blog`

#### 4.1 Aggiornare Root Config

**File: `blog/nuxt.config.ts`**

```typescript
import { definePerson } from "nuxt-schema-org/schema"
import appMeta from "./app/app.meta"

export default defineNuxtConfig({
  // Extend with deck normalizer layer
  extends: [
    './app/layers/deck-normalizer'  // ← NUOVO: Aggiungi layer
  ],

  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  
  // ... resto della config esistente ...
  
  routeRules: {
    // Homepage pre-rendered at build time
    '/': { prerender: true },
    // Nuxt Studio admin - requires SSR
    '/editor/**': { ssr: true },
    // All content pages prerendered
    '/articles/**': { prerender: true },
    '/docs/**': { prerender: true },
    // ← NUOVO: Deck normalizer tool (SSR)
    '/tools/deck-normalizer': { ssr: true },
    '/api/cards/**': { ssr: true }
  },

  nitro: {
    preset: 'vercel',
    prerender: {
      routes: ['/'],
      crawlLinks: true,
      ignore: ['/tools/**', '/api/**']  // ← NUOVO: Non pre-renderizzare tools e API
    }
  },

  // ... resto della config ...
})
```

#### 4.2 Aggiungere Link nel Blog

**Esempio: Aggiungere link nella navbar**

File: `blog/app/components/AppHeader.vue` (o equivalente)

```vue
<template>
  <header>
    <!-- Existing nav links -->
    <ULink to="/">Home</ULink>
    <ULink to="/articles">Articoli</ULink>
    <ULink to="/docs">Docs</ULink>
    
    <!-- NEW: Tools dropdown -->
    <UDropdown :items="toolsItems">
      <UButton label="Tools" trailing-icon="i-lucide-chevron-down" />
    </UDropdown>
  </header>
</template>

<script setup lang="ts">
const toolsItems = [
  [{
    label: 'Deck Normalizer',
    icon: 'i-lucide-file-text',
    to: '/tools/deck-normalizer',
    description: 'Normalizza decklists per MTGO'
  }]
]
</script>
```

#### 4.3 Aggiornare package.json

**File: `blog/package.json`**

```json
{
  "name": "pauperwave_blog",
  "scripts": {
    "download-cards": "bun run scripts/download-bulk-data.ts",
    "migrate-db": "bun run scripts/migrate-sqlite-to-postgres.ts",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "prebuild": "bun run db:generate",
    "build": "nuxt build",
    "dev": "nuxt dev",
    "preview": "nuxt preview",
    "postinstall": "nuxt prepare"
  },
  "dependencies": {
    "@nuxt/content": "^3.11.2",
    "@nuxt/ui": "^4.5.0",
    "@neondatabase/serverless": "^1.1.0",
    "drizzle-orm": "^0.45.3",
    "better-sqlite3": "^12.6.2",
    "nuxt": "^4.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "drizzle-kit": "^0.31.11",
    "typescript": "^5.9.3"
  }
}
```

**Changes:**
- Added `db:*` scripts for Drizzle operations
- Added `drizzle-orm`, `drizzle-kit`, and `@neondatabase/serverless` dependencies
- Updated `prebuild` to generate Drizzle types

---

### **FASE 5: Deploy su Vercel** ⏱️ ~15 min · 📍 in `blog`

#### 5.1 Configurare Environment Variables su Vercel

1. Andare su [vercel.com](https://vercel.com) → Dashboard → Progetto
2. Settings → Environment Variables
3. Aggiungere:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` | Production, Preview, Development |

**Note:**
- Copiare l'URL dalla Neon dashboard (connection pooling, unica variabile richiesta da Drizzle sia per l'app che per `drizzle-kit generate/push`, vedi `drizzle.config.ts` in Fase 1)
- Applicare a tutti gli environment per consistenza
- Non serve `DIRECT_URL`: quella è specifica di Prisma Migrate, qui non usata

#### 5.2 Creare `.env.example`

**File: `blog/.env.example`**

```env
# Neon PostgreSQL Database
# Get this from https://console.neon.tech
DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
```

#### 5.3 Aggiungere `.env` a `.gitignore`

**File: `blog/.gitignore`**

```
# Environment variables
.env
.env.local
.env.*.local

# Drizzle
drizzle/
```

#### 5.4 Configurare Vercel Build

**File: `blog/vercel.json`**

```json
{
  "buildCommand": "bun run build",
  "devCommand": "bun run dev",
  "installCommand": "bun install",
  "framework": "nuxtjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database-url"
  }
}
```

**Note:**
- `regions: ["iad1"]`: US East (Ohio) - same region as Neon for low latency
- Vercel automaticamente rileva Nuxt, ma meglio esplicitare

#### 5.5 Deploy

```bash
cd blog/
git add .
git commit -m "feat: integrate deck normalizer with Neon Postgres

- Add Nuxt Layer for deck normalizer
- Migrate from SQLite to Neon PostgreSQL
- Use Drizzle ORM for type-safe database access
- Add /tools/deck-normalizer route (SSR)
- Keep blog static (SSG) with dynamic tool section"

git push origin main
```

Vercel automaticamente:
1. Rileva push su `main`
2. Esegue `bun install`
3. Esegue `drizzle-kit generate` (dal `prebuild`)
4. Esegue `nuxt build`
5. Deploy su production

**Monitorare deploy:**
- Dashboard Vercel → Deployments
- Check logs per errori

#### 5.6 Verificare Deploy

1. **Homepage (SSG)**: `https://blog.pauperwave.com` → Deve caricare istantaneamente (pre-rendered)
2. **Deck Normalizer (SSR)**: `https://blog.pauperwave.com/tools/deck-normalizer` → Deve caricare in ~500ms
3. **API**: Testare con un deck di esempio, verificare performance

**Performance attese:**
- Homepage: ~50ms (CDN-cached)
- Deck Normalizer first load: ~500ms (SSR + DB query)
- API resolve 40 cards: ~100-200ms (Neon + Scryfall)

---

## 📊 Performance Attese

### Latency Comparison

| Operation | SQLite Locale | Neon Postgres | Delta |
|-----------|--------------|---------------|-------|
| Single card lookup | ~1ms | ~20-40ms | +19-39ms |
| Batch 40 cards | ~10ms | ~30-50ms | +20-40ms |
| Fuzzy search (5 results) | ~5ms | ~20-30ms | +15-25ms |
| Scryfall API call | ~100-200ms | ~100-200ms | 0ms |
| **Total request time** | 50-100ms | 70-150ms | +20-50ms |

**Conclusione:** +20-50ms è un trade-off accettabile per:
- ✅ Scalabilità serverless
- ✅ Zero manutenzione infrastruttura
- ✅ Multi-region availability
- ✅ Automatic backups
- ✅ Free tier ($0/mese)

### Database Size

| Metric | Value |
|--------|-------|
| Total cards | 10,573 |
| Database size | ~18 MB |
| Free tier limit | 512 MB |
| Headroom | **96% available** |

**Margine ampio** per:
- Future card additions (~500/year = 50 anni)
- Name mappings analytics (100K mappings = ~5 MB)
- Query logs, metadata, etc.

---

## 🔧 Ottimizzazioni Opzionali

### Opzione 1: PostgreSQL Full-Text Search

**Performance boost:** Fuzzy search da ~30ms a ~5ms

```sql
-- Enable pg_trgm extension (trigram similarity search)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index for fast similarity search
CREATE INDEX cards_name_trgm_idx ON cards USING gin (name_normalized gin_trgm_ops);

-- Create GIN index for full-text search (optional)
CREATE INDEX cards_name_fts_idx ON cards USING gin (to_tsvector('english', name));
```

**Update query (Drizzle):**

```typescript
import { sql } from 'drizzle-orm'

export async function findCardsByFuzzyName(
  inputName: string,
  maxResults = 5,
  minSimilarity = 0.6
): Promise<FuzzyMatch[]> {
  const normalized = normalizeCardName(inputName)

  // Use pg_trgm for fast fuzzy search
  const matches = await db.execute<Card & { similarity: number; distance: number }>(sql`
    SELECT
      *,
      similarity(name_normalized, ${normalized}) as similarity,
      levenshtein(name_normalized, ${normalized}) as distance
    FROM cards
    WHERE similarity(name_normalized, ${normalized}) > ${minSimilarity}
    ORDER BY similarity DESC
    LIMIT ${maxResults}
  `)

  return matches.rows.map(m => ({
    card: m,
    distance: m.distance,
    similarity: m.similarity
  }))
}
```

**Quando implementare:**
- ✅ Ora: Se hai tempo durante setup iniziale
- ⏸️ Dopo: Se vuoi deployare velocemente, ottimizzare dopo
- ❌ Mai: Se performance attuali sono accettabili (~30ms)

### Opzione 2: Vercel KV Caching

**Performance boost:** Database hits da ~30ms a ~5ms (dopo primo accesso)

```bash
# Install Vercel KV SDK
bun add @vercel/kv
```

**Wrap database calls:**

```typescript
import { kv } from '@vercel/kv'

export async function getCardByName(name: string): Promise<Card | null> {
  // Try cache first
  const cacheKey = `card:${name}`
  const cached = await kv.get<Card>(cacheKey)
  if (cached) return cached
  
  // Cache miss: query database
  const card = await prisma.card.findFirst({ where: { name } })
  
  // Cache for 24 hours
  if (card) {
    await kv.set(cacheKey, card, { ex: 86400 })
  }
  
  return card
}
```

**Costi:**
- Vercel KV free tier: 256 MB storage, 10K requests/day
- Sufficiente per cache 10K cards (~10 MB) + hot queries

**Quando implementare:**
- ✅ Dopo deploy: Monitorare latency prima, aggiungere se necessario
- ⏸️ Ora: Se vuoi massima performance da subito
- ❌ Mai: Se Neon è già abbastanza veloce (<50ms)

> **Nota:** l'opzione "Prisma Data Proxy" è stata rimossa da questa revisione — non applicabile, il piano usa Drizzle + Neon HTTP driver che non ha cold start di connessione TCP (vedi rationale in apertura).

### Opzione 3: Edge Caching con Vercel

**Performance boost:** Repeated requests ~500ms → ~50ms

```typescript
// In nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    '/api/cards/resolve': {
      cache: {
        maxAge: 60 * 60, // 1 hour
        staleMaxAge: 60 * 60 * 24, // 24 hours stale-while-revalidate
        swr: true
      }
    }
  }
})
```

**Caveat:** Cache è per request identiche (stesso body). Non molto utile per deck normalizer (ogni deck è diverso).

**Quando implementare:**
- ⏸️ Dopo: Se noti pattern di deck ripetuti
- ❌ Ora: Probabilmente poco impatto

---

## ✅ Checklist Pre-Deploy

### Setup

- [ ] Account Neon creato ([neon.tech](https://neon.tech))
- [ ] Database "pauperwave-cards" provisionato
- [ ] `.env` configurato con `DATABASE_URL`
- [ ] Dipendenze installate (`bun add drizzle-orm @neondatabase/serverless drizzle-kit`)
- [ ] Drizzle schema creato (`server/database/schema.ts`)

### Database

- [ ] Drizzle schema definito (`server/database/schema.ts`)
- [ ] Migration generata e applicata (`bunx drizzle-kit generate && bunx drizzle-kit push`)
- [ ] Dati migrati da SQLite (`bun run scripts/migrate-sqlite-to-postgres.ts`)
- [ ] Verifica: 10,573 carte in Postgres (`bunx drizzle-kit studio`)
- [ ] Metadata impostato (count, last_migration)

### Code

- [ ] Nuxt Layer creato (`app/layers/deck-normalizer/`)
- [ ] Codice copiato da `mtgo/` a layer
- [ ] Server API adattate per Drizzle (`server/utils/database.ts`)
- [ ] Import paths aggiornati (`,~/shared/types`, etc.)
- [ ] Layer config creato (`app/layers/deck-normalizer/nuxt.config.ts`)

### Integration

- [ ] Root config aggiornato (`extends: ['./app/layers/deck-normalizer']`)
- [ ] Route rules configurate (SSR per `/tools/**` e `/api/**`)
- [ ] Nitro prerender ignore tools e API
- [ ] Link aggiunto alla navbar del blog
- [ ] package.json aggiornato con script Drizzle

### Testing Locale

- [ ] Build locale funzionante (`bun run build`)
- [ ] Dev server funzionante (`bun run dev`)
- [ ] `/tools/deck-normalizer` accessibile in dev
- [ ] API `/api/cards/resolve` funzionante con test deck
- [ ] Performance accettabili (<200ms per 40 cards)
- [ ] Nessun errore Drizzle nei logs

### Vercel Setup

- [ ] Environment variables aggiunte su Vercel dashboard
  - [ ] `DATABASE_URL` (Production, Preview, Development)
- [ ] `.env.example` creato con placeholder
- [ ] `.env` aggiunto a `.gitignore`
- [ ] `vercel.json` configurato (regione, build command)

### Deploy

- [ ] Codice committed su Git
- [ ] Push su GitHub (branch `main`)
- [ ] Deploy Vercel completato senza errori
- [ ] Build logs verificati (no Drizzle errors)

### Verifica Production

- [ ] Homepage carica (`https://blog.pauperwave.com`)
- [ ] Deck normalizer accessibile (`/tools/deck-normalizer`)
- [ ] Test deck si normalizza correttamente
- [ ] Performance cards mostrano database hits
- [ ] No errori console browser
- [ ] No errori Vercel function logs

---

## 🚨 Rischi e Mitigazioni

| Rischio | Probabilità | Impatto | Mitigazione |
|---------|------------|---------|-------------|
| **Latenza DB aumentata** | Alta (garantita) | Medio | ✅ Accettabile (+20-50ms), opzionale: KV cache |
| **Free tier Neon esaurito** | Bassa | Alto | ⚠️ Monitorare usage dashboard, 96% headroom |
| **Bundle size** | Bassa | Basso | ✅ Drizzle ~100 KB, ottimo tree-shaking |
| **Cold starts lenti** | Bassa | Medio | ✅ Drizzle HTTP = zero cold starts, Vercel warm instances |
| **Fuzzy search lento** | Media | Medio | ✅ Opzionale: `pg_trgm` extension (~5x speedup) |
| **Migration fallisce** | Bassa | Alto | ✅ Script ha safety checks, backup SQLite preserved |
| **Drizzle incompatibile Vercel** | Molto bassa | Critico | ✅ Supportato ufficialmente, preset Vercel |
| **Neon downtime** | Molto bassa | Alto | ⚠️ SLA 99.95%, fallback a Scryfall-only mode |

### Mitigation Plans

**Se latenza è troppo alta (>200ms):**
1. Implementare Vercel KV caching (1 ora setup)
2. Abilitare `pg_trgm` per fuzzy search (30 min)
3. Ottimizzare query Drizzle (connection pooling già incluso)

**Se free tier Neon si esaurisce:**
1. Upgrade a Neon Pro: $19/mese (3 GB storage)
2. Alternativa: Supabase ($25/mese, 8 GB)
3. Alternativa 2: Railway Postgres ($10/mese, 10 GB)

**Se bundle size è un problema (improbabile con Drizzle):**
1. Split API in edge function separata
2. Lazy load database utilities
3. Tree-shaking con Vite (già ottimale)

**Se cold starts problematici (improbabile con Drizzle HTTP):**
1. Vercel Pro: $20/mese (warm instances guarantee)
2. Neon HTTP già ottimizzato per zero cold start
3. Keep-alive ping ogni 5 minuti (dirty hack)

---

## 🎯 Risultato Atteso

### Architettura Finale

- ✅ Blog SSG su `blog.pauperwave.com` (veloce, SEO-friendly)
- ✅ Deck normalizer SSR su `blog.pauperwave.com/tools/deck-normalizer`
- ✅ Database Postgres serverless su Neon (free tier)
- ✅ Deploy unified su Vercel (monorepo)
- ✅ Type safety completa con Drizzle ORM
- ✅ Nuxt Layers per modularità

### Performance Goals

| Metric | Target | Atteso |
|--------|--------|--------|
| Homepage load | <100ms | ~50ms ✅ |
| Tool first load | <500ms | ~200-300ms ✅ |
| API 40 cards | <200ms | ~100-150ms ✅ |
| Database query | <50ms | ~30-40ms ✅ |
| Fuzzy search | <50ms | ~30ms ✅ (20ms con pg_trgm) |

### Costi Mensili

| Service | Piano | Costo |
|---------|-------|-------|
| Vercel Hosting | Hobby | **$0** |
| Neon Database | Free Tier | **$0** |
| Bandwidth | Free allowance | **$0** |
| **TOTALE** | | **$0/mese** 🎉 |

**Limiti free tier:**
- Vercel: 100 GB bandwidth, 100 GB-hours compute
- Neon: 0.5 GB storage, unlimited queries

**Quando fare upgrade:**
- Vercel: >100K visitors/mese (~$20/mese Pro)
- Neon: >500 MB data (~$19/mese Pro)

---

## 📚 Risorse e Documentazione

### Neon PostgreSQL
- [Neon Docs](https://neon.tech/docs)
- [Neon + Vercel Guide](https://neon.tech/docs/guides/vercel)
- [Connection Pooling](https://neon.tech/docs/connect/connection-pooling)
- [Branching](https://neon.tech/docs/introduction/branching)

### Drizzle ORM
- [Drizzle Docs](https://orm.drizzle.team/docs/overview)
- [Drizzle + Neon](https://orm.drizzle.team/docs/get-started-postgresql#neon)
- [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)
- [Query Examples](https://orm.drizzle.team/docs/rqb)

### Nuxt 3
- [Nuxt Layers](https://nuxt.com/docs/guide/going-further/layers)
- [Server Routes](https://nuxt.com/docs/guide/directory-structure/server)
- [Route Rules](https://nuxt.com/docs/guide/concepts/rendering#route-rules)
- [Deployment (Vercel)](https://nuxt.com/docs/getting-started/deployment#vercel)

### Vercel
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (alternativa a Neon)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Edge Config](https://vercel.com/docs/storage/edge-config) (per metadata leggero)

### PostgreSQL Extensions
- [pg_trgm (Trigram)](https://www.postgresql.org/docs/current/pgtrgm.html)
- [Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)

---

## ❓ Domande Frequenti (FAQ)

### Q: Perché Neon invece di Vercel Postgres?

**A:** Entrambi eccellenti, ma:
- Neon free tier più generoso (0.5 GB vs 0.256 GB)
- Neon ha branching database (feature unica)
- Neon connection pooling incluso
- Vercel Postgres è built-in ma costa $20/mese per Pro features

**Consiglio:** Inizia con Neon (free), passa a Vercel Postgres se vuoi tutto nello stesso ecosistema.

### Q: Perché non IndexedDB client-side?

**A:** IndexedDB è ottimo per PWA, ma:
- ❌ Download iniziale ~20 MB (10K cards)
- ❌ No sync multi-device
- ❌ Dati persisted solo nel browser utente
- ❌ Update cards richiede refresh manuale
- ✅ Server-side: 0 MB download, sempre aggiornato, multi-device

### Q: Drizzle bundle size?

**A:** Drizzle è estremamente leggero: ~100 KB uncompressed (~30 KB gzipped). Vantaggi:
- ✅ Type safety inferita automaticamente
- ✅ Migration management con drizzle-kit
- ✅ Zero cold starts con Neon HTTP
- ✅ Tree-shakeable (importi solo quello che usi)

**Alternative:**
- Kysely (~50 KB, ma meno feature-rich)
- Raw SQL (0 KB, ma no type safety)
- Prisma (~1 MB, più pesante ma più maturo)

**Consiglio:** Drizzle è il sweet spot tra DX, performance e bundle size.

### Q: Come aggiorno le carte quando Scryfall pubblica nuovo set?

**A:** Due opzioni:

**Opzione 1: Script manuale**
```bash
# Re-scarica bulk data da Scryfall
bun run scripts/download-pauper-cards.ts  # (adattare per Drizzle)

# Re-migra a Neon
bun run scripts/migrate-sqlite-to-postgres.ts
```

**Opzione 2: Cron job automatico** (futuro)
```typescript
// Vercel Cron (richiede Pro plan)
export default defineEventHandler(async (event) => {
  if (event.headers['x-vercel-cron']) {
    // Fetch bulk data, update Postgres
  }
})
```

**Frequenza:** ~4 volte/anno (quando esce nuovo set)

### Q: Cosa succede se Neon ha downtime?

**A:** Fallback automatico a Scryfall-only mode:

```typescript
export async function getCardsByNormalizedNames(names: string[]) {
  try {
    // Try Neon database
    return await db.select().from(cards).where(inArray(cards.name_normalized, names))
  } catch (error) {
    console.error('Database unavailable, fallback to Scryfall')
    // Fetch directly from Scryfall API
    return await fetchFromScryfall(names)
  }
}
```

**Impact:** Performance degradata (~500ms invece di ~50ms), ma tool funzionante.

### Q: Posso usare lo stesso database per blog e tool?

**A:** Sì! Drizzle schema può avere multiple tables:

```typescript
// Blog tables
export const articles = pgTable('articles', { ... })
export const authors = pgTable('authors', { ... })

// Deck normalizer tables
export const cards = pgTable('cards', { ... })
export const nameMappings = pgTable('name_mappings', { ... })
```

Tutto nello stesso database Neon. Vantaggio:
- ✅ Unified connection
- ✅ Cross-model relations (es: Article ←→ Card per decklists)
- ✅ Single migration workflow

### Q: Come testo modifiche al database in dev?

**A:** Neon supporta branching:

```bash
# Crea branch per feature/testing
neon branches create feature/new-index

# Ottieni DATABASE_URL del branch
# Usalo in .env.local

# Testa modifiche
bunx drizzle-kit push

# Se tutto ok, merge in main
neon branches merge feature/new-index
```

Feature killer per sviluppo sicuro!

### Q: Drizzle vs SQL raw per query complesse?

**A:** Drizzle supporta `sql` template per query complesse:

```typescript
import { sql } from 'drizzle-orm'

// Query complessa con CTE, window functions, etc.
const result = await db.execute(sql`
  WITH ranked_cards AS (
    SELECT *, 
      ROW_NUMBER() OVER (PARTITION BY set_code ORDER BY cmc) as rank
    FROM cards
  )
  SELECT * FROM ranked_cards WHERE rank <= 5
`)
```

Best of both worlds: type safety + flessibilità SQL.

---

## 🎓 Conclusioni e Next Steps

### Recap Architettura

Abbiamo progettato un'integrazione che:
1. **Mantiene blog SSG** (veloce, SEO-friendly)
2. **Aggiunge tool SSR** (database access runtime)
3. **Usa Neon Postgres** (serverless, free tier)
4. **Integra con Drizzle ORM** (type-safe, zero cold starts, bundle minimale)
5. **Organizza con Nuxt Layers** (modularità, riusabilità)
6. **Deploy su Vercel** (zero-config, scalabile)
7. **Costo: $0/mese** 🎉

### Ready to Start?

**Next immediate steps:**

1. **Crea account Neon** ([neon.tech](https://neon.tech)) ⏱️ 5 min
2. **Inizializza Drizzle** (crea schema e config) ⏱️ 2 min
3. **Migra dati** (`bun run scripts/migrate-sqlite-to-postgres.ts`) ⏱️ 5 min
4. **Copia codice a layer** (script or manual) ⏱️ 20 min
5. **Test locale** (`bun run dev`) ⏱️ 5 min
6. **Deploy Vercel** (`git push`) ⏱️ 5 min

**Total time:** ~45 minuti + tempo per adattare server API (~30 min).

### Quando Ottimizzare?

**Ora (durante setup):**
- ✅ Drizzle schema ben strutturato
- ✅ Indexes su campi interrogati
- ✅ Error handling robusto

**Dopo deploy (se necessario):**
- ⏸️ `pg_trgm` extension per fuzzy search
- ⏸️ Vercel KV caching
- ⏸️ Query optimization

**Mai (o molto dopo):**
- ❌ Custom connection pooling (Neon lo gestisce)
- ❌ Micro-optimization Drizzle queries
- ❌ Cold start mitigation (già ottimale con HTTP)

### Supporto

Se hai domande durante implementazione:
1. Drizzle Discord: [discord.gg/drizzle](https://discord.gg/XCn6xyQk)
2. Neon Community: [neon.tech/community](https://neon.tech/community)
3. Nuxt Discord: [nuxt.com/discord](https://nuxt.com/discord)
4. Stack Overflow: tag `drizzle`, `neon`, `nuxt3`

---

## 📝 Change Log

| Versione | Data | Modifiche |
|----------|------|-----------|
| 1.0 | 2025-03-09 | Initial plan draft |

---

**Document created by:** OpenCode AI Assistant
**Last updated:** 2025-03-09
**Status:** ✅ Ready for implementation
