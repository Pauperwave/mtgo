1. Bounceland (10 cards)
`legal:pauper is:bounceland`

2. Artifact bi-color lands "Bridges" (10 cards)
`legal:pauper type:land type:artifact bridge`

3. Artifact mono-color lands (6 cards)
`legal:pauper type:land type:artifact -bridge`

4. Gates (18 cards)
`legal:pauper type:land type:gate`

5. Fixer (27 cards)
`(oracle:any oracle:color) type:land legal:pauper -type:gate`

6. Tapland bi-color (exactly 2 colors in color identity) [125 cards]
`legal:pauper type:land (o:enters o:tapped) id=2`

7. Tapland mono-color (exactly 1 color in color identity) [64 cards]
`legal:pauper type:land (o:enters o:tapped) id=1`

8. Fetch [28 cards]
`legal:pauper type:land (oracle:search)`

9. Basic lands [11 cards]
`legal:pauper type:land type:basic`

10. Other lands not previously ordered explicitly
`legal:pauper is:land`
