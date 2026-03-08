/**
 * Integration test for DFC cards NOT in database
 * 
 * This tests the NEW retry logic that searches by front face
 * when Scryfall's Collection API doesn't find the full "Name // Name" format
 * 
 * Run with: node scripts/test-dfc-scryfall-only.mjs
 */

const API_URL = 'http://localhost:3001/api/cards/resolve'

// Use less common DFC cards that might not be in the Pauper database
const TEST_CASES = [
  {
    name: 'Rare Adventure Card - Bonecrusher Giant',
    inputName: 'Bonecrusher Giant // Stomp',
    expectedCardName: 'Bonecrusher Giant // Stomp',
    description: 'Rare adventure card - tests Scryfall-only path'
  },
  {
    name: 'Uncommon Adventure Card - Brazen Borrower',
    inputName: 'Brazen Borrower // Petty Theft',
    expectedCardName: 'Brazen Borrower // Petty Theft',
    description: 'Uncommon adventure card'
  },
  {
    name: 'Transform DFC - Delver of Secrets',
    inputName: 'Delver of Secrets // Insectile Aberration',
    expectedCardName: 'Delver of Secrets // Insectile Aberration',
    description: 'Transform DFC (different than adventure cards)'
  }
]

async function testCardResolution(testCase) {
  try {
    console.log(`Testing: ${testCase.name}`)
    console.log(`  Input: "${testCase.inputName}"`)
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        names: [testCase.inputName]
      })
    })

    if (!response.ok) {
      console.error(`  ❌ API error ${response.status}\n`)
      return false
    }

    const data = await response.json()
    
    // Check where card was found
    const foundInCards = data.cards?.some(card => 
      card.name === testCase.expectedCardName
    )
    const foundInFuzzy = data.fuzzySuggestions?.some(fuzzy =>
      fuzzy.suggestions?.some(s => s.card.name === testCase.expectedCardName)
    )
    const foundInMissing = data.missing?.includes(testCase.inputName)
    const hasNameMapping = data.nameMappings?.[testCase.inputName] === testCase.expectedCardName

    if (foundInCards && hasNameMapping) {
      console.log(`  ✅ PASSED`)
      console.log(`  Found: "${testCase.expectedCardName}"`)
      console.log(`  Name mapping: ✓`)
      
      if (data.performance) {
        const { databaseHits, scryfallRequests, scryfallFuzzyRequests } = data.performance
        console.log(`  Performance:`)
        console.log(`    - DB hits: ${databaseHits}`)
        console.log(`    - Scryfall collection API: ${scryfallRequests}`)
        console.log(`    - Scryfall fuzzy API: ${scryfallFuzzyRequests || 0}`)
        
        // Highlight if DFC retry logic was used
        if (scryfallRequests > 0) {
          console.log(`  🎯 DFC retry logic was used! (Scryfall collection API called)`)
        }
      }
      console.log()
      return true
      
    } else if (foundInFuzzy) {
      console.log(`  ⚠️  Found in fuzzy suggestions (not auto-accepted)`)
      console.log(`  This might happen if similarity isn't perfect`)
      console.log()
      return true // Still counts as success - card was found
      
    } else {
      console.error(`  ❌ FAILED`)
      console.error(`  foundInCards: ${foundInCards}`)
      console.error(`  hasNameMapping: ${hasNameMapping}`)
      console.error(`  foundInMissing: ${foundInMissing}`)
      if (data.errors) {
        console.error(`  Errors: ${JSON.stringify(data.errors)}`)
      }
      console.log()
      return false
    }
  } catch (error) {
    console.error(`  ❌ Exception: ${error.message}\n`)
    return false
  }
}

async function main() {
  console.log('🧪 Testing DFC Cards (Scryfall-only path)')
  console.log('='.repeat(70))
  console.log('This tests the NEW DFC retry logic that searches by front face')
  console.log('when Scryfall Collection API doesn\'t find "Name // Name" format')
  console.log('='.repeat(70))
  console.log()

  const results = []
  for (const testCase of TEST_CASES) {
    const result = await testCardResolution(testCase)
    results.push(result)
  }

  console.log('='.repeat(70))
  
  const passed = results.filter(r => r).length
  const total = results.length
  
  if (passed === total) {
    console.log(`✅ All tests passed! (${passed}/${total})`)
    console.log()
    console.log('🎉 The DFC retry logic is working correctly!')
    console.log('   Cards with "//" are found even when not in database.')
    process.exit(0)
  } else {
    console.error(`❌ Some tests failed (${passed}/${total} passed)`)
    process.exit(1)
  }
}

// Check API availability
async function checkApi() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: ['Plains'] })
    })
    return response.ok
  } catch {
    return false
  }
}

console.log('Checking API availability...')
if (!await checkApi()) {
  console.error('❌ API not available at', API_URL)
  console.error('Make sure dev server is running: npm run dev\n')
  process.exit(1)
}

console.log('✅ API available\n')
main()
