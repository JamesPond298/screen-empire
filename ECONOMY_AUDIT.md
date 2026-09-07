# Economy audit — Stage 1 checkpoint

## What caused the squeeze

No repeated-charge bug was found. Talent fees were paid once, direct production budgets were charged once across production, and company overhead was charged once per week.

The old rules were poorly balanced:

- A default small movie cost $299,000 directly and occupied 10 weeks, adding roughly $75,000 of planning overhead. A typical release earned around $300,000 before overhead.
- A default studio-owned TV season cost $339,000 directly and occupied 12 weeks, adding roughly $90,000 of planning overhead. It had only the low digital-sales formula and no licensing system yet.
- Movie income stopped after 8 weeks and TV income after 10, so completed titles stopped contributing quickly.

## Focused changes

- Weekly small-studio overhead: $7,500 → $6,000 for future weeks.
- Small movie schedule: 10 → 8 weeks.
- Small TV schedule: 12 → 9 weeks.
- Movie earning window: 8 → 12 weeks, with six theatrical weeks followed by digital demand.
- TV earning window: 10 → 14 digital-sales weeks.
- Fictional movie studio ticket share: 45% → 50%.
- Stronger but still declining post-release demand.
- A visible planning forecast that includes overhead allocation without charging it twice.

No cash was gifted during migration, and historical transactions were not rewritten.

## Repeatable 52-week results

Each strategy used 100 deterministic seeds and sensible small productions. Events, awards, contracts, loans, and upgrades contributed $0 because they are not implemented at this checkpoint.

| Strategy | Version | Survival | Median operating result | Median ending cash | Median completed |
|---|---:|---:|---:|---:|---:|
| Cautious movies | Before | 83% | -$403,091 | $146,909 | 2 |
| Cautious movies | After | 100% | $76,155 | $626,155 | 6 |
| Owned television | Before | 86% | -$529,118 | $20,882 | 1 |
| Owned television | After | 100% | $306,214 | $856,214 | 5 |
| Mixed originals | Before | 59% | -$536,731 | $13,269 | 2 |
| Mixed originals | After | 100% | $255,428 | $805,428 | 5 |

These tests are deliberately narrower than the final economy suite. Contract-focused, event-enabled, loan/no-loan, buyer, rights-conflict, and upgrade strategies remain for the stages that add those systems.
