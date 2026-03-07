# MTGO Pauper Deck Normalizer

[![Nuxt UI](https://img.shields.io/badge/Made%20with-Nuxt%20UI-00DC82?logo=nuxt&labelColor=020420)](https://ui.nuxt.com)

Transform Magic: The Gathering Pauper deck lists into MTGO format with intelligent card name matching.

## ✨ Features

- **60x faster** than Scryfall-only approach (SQLite cache with 10,573 Pauper cards)
- **Smart matching**: Case/diacritic-insensitive with fuzzy search fallback
- **Double-faced cards (DFC)**: Automatic back face handling
- **Canonical names**: Correct diacritics (Æther Spellbomb, Lim-Dûl's Vault)
- **Auto-correction** for common typos and variations
- **Sideboard validation**: Max 15 cards, Pauper legality checks
- **Land categorization**: Intelligent sorting by type

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun 1.0+
- pnpm 9+ (or npm/yarn/bun)

### Installation

```bash
# Install dependencies
pnpm install

# Setup database (one-time, downloads 162 MB, creates 20 MB database)
bun run scripts/download-pauper-cards.ts

# Start development server
pnpm dev
```

Visit http://localhost:3000

## 📖 Usage

1. **Paste your deck list** in the input area (any format supported)
2. **Click "Normalizza"** to process
3. **Review suggestions** for ambiguous cards (if any)
4. **Copy normalized output** ready for MTGO import

### Example

**Input:**
```
4 aether spellbomb
4 lim dul's vault
2 Brainstorm
```

**Output:**
```
4 Æther Spellbomb
4 Lim-Dûl's Vault
2 Brainstorm
```

## 📚 Documentation

- [Implementation Summary](docs/implementation-summary.md) - Architecture overview
- [Database Implementation](docs/database-implementation.md) - Technical details
- [Testing Guide](docs/testing-guide.md) - Manual testing procedures

## 🛠️ Development

```bash
pnpm dev        # Start dev server
pnpm build      # Build for production
pnpm preview    # Preview production build
pnpm lint       # Run ESLint
pnpm typecheck  # Run TypeScript checks
pnpm clean      # Clean build artifacts
```

## 🏗️ Architecture

### Performance
- **Before:** 2-4 seconds, 40-120 Scryfall API calls
- **After:** 50-100ms, 0-10 API calls (95% cache hit rate)

### Data Flow
1. Client parses deck list → sends card names to server
2. Server searches SQLite database (10,573 Pauper cards)
3. Server fetches missing cards from Scryfall API (batched)
4. Server returns normalized cards + suggestions
5. Client displays results with confidence indicators

## 🙏 Acknowledgments

- Card data from [Scryfall API](https://scryfall.com/docs/api)
- Built with [Nuxt 4](https://nuxt.com) and [Nuxt UI](https://ui.nuxt.com)
