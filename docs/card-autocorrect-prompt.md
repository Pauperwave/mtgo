You are helping improve the architecture of a Vue/Nuxt deck normalizer for Magic: The Gathering.

Context

The application parses a decklist entered by the user and normalizes card names using the Scryfall API.
If a card name is slightly incorrect, the system proposes a correction.

Currently the code uses a manual whitelist of card names that should be automatically corrected without asking the user.

Example:

```ts
const AUTOCORRECT_WHITELIST = new Set([
  'Lórien Revealed',
  'Troll of Khazad-dûm',
  'Delver of Secrets // Insectile Aberration',
  'The Modern Age // Vector Glider',
  'Sagu Wildling // Roost Seek',
  'Tithing Blade // Consuming Sepulcher'
])

export function shouldAutoApply(searchedName: string, suggestedName: string): boolean {
  return AUTOCORRECT_WHITELIST.has(suggestedName)
}
```

In the UI, suggestions returned by the Scryfall search are split into two groups:

* suggestions that are automatically applied
* suggestions that require user confirmation

Example code:

```ts
const autoApplySuggestions = fetchedSuggestions.filter(s =>
  shouldAutoApply(s.searchedName, s.suggestedCard.name)
)

const manualSuggestions = fetchedSuggestions.filter(s =>
  !shouldAutoApply(s.searchedName, s.suggestedCard.name)
)
```

Problem

Maintaining a manual whitelist of card names does not scale and feels architecturally wrong.

Many deck builders solve this differently by deciding whether to auto-apply a correction based on search confidence rather than card identity.

Goal

Propose a more robust architecture that eliminates the manual whitelist and decides when to auto-apply corrections based on the search results.

The solution should:

* work with the Scryfall API
* minimize false positives
* auto-correct obvious typos automatically
* ask the user only when multiple plausible matches exist

Important cases to support:

1. Unicode characters
   Example:
   `lorien revealed` → `Lórien Revealed`

2. Hyphenated names
   Example:
   `khazad dum` → `Troll of Khazad-dûm`

3. Double-faced cards
   Example:
   `delver of secrets` → `Delver of Secrets // Insectile Aberration`

Tasks

1. Propose a cleaner architecture for handling suggestions.
2. Define clear rules for when a correction should be auto-applied.
3. Suggest a data structure for suggestions (for example including multiple candidates and scores).
4. Provide example TypeScript code implementing the logic.
5. Suggest a lightweight card-name normalization function (removing accents, handling "//", etc.) that improves matching before fuzzy search.

Assume the project uses:

* Vue 3
* Nuxt
* TypeScript
* Scryfall API
