# PriorAuth Buddy — Moat-Building Roadmap

## The Problem: Wrapper Risk
Google VP Darren Mowry (Feb 2026): "If you're really just counting on the back end model to do all the work, the industry doesn't have a lot of patience for that anymore."

PriorAuth Buddy today is ~70% wrapper, 30% proprietary. Goal: flip to 30/70 within 6 months.

## Survivors Framework (from Mowry)
- **Cursor** survived because it understands YOUR codebase, not just code generally
- **Harvey AI** survived because it has deep legal domain expertise + proprietary case data
- **PriorAuth Buddy** survives because it learns from every denial fight and knows what ACTUALLY works

## Current Proprietary Assets (30%)
1. Insurer intelligence database (25 insurers, tactics, weaknesses, appeal windows)
2. Buddy evolution + streaks (engagement/retention layer)
3. The companion relationship (emotional investment, not a chatbot)
4. State-specific rights database
5. Document checklists per case type

## The Four Moats to Build

### Moat 1: Aggregate Win/Loss Intelligence (CRITICAL — Month 1-3)
**What:** Every resolved case teaches the system what works.
**How:** Anonymized outcome tracking (already built) + structured tagging of strategies used.
**Result:** "Buddy beat Aetna on MRI denials 73% of the time using peer-to-peer review."
**Why unkillable:** After 1,000 cases, no wrapper can match our success rate predictions. Data compounds daily.

**Implementation:**
- Tag each case with strategies used (appeal letter, peer-to-peer, DOI complaint, external review)
- Record which strategy led to the win
- Build success rate models per: insurer + procedure + strategy + state
- Surface to users: "For Aetna MRI denials, peer-to-peer review wins 68% of the time"
- This is the Cursor playbook: understand the USER'S specific fight, not denials generally

### Moat 2: Insurer-Specific Scoring Models (Month 3-6)
**What:** Move beyond prompting Claude to proprietary scoring.
**How:** Build lightweight models trained on our aggregate data.
**Result:** "Based on 500 UHC denials in our system, here's your win probability and best strategy."
**Why unkillable:** Proprietary model weights. Can't be replicated without our dataset.

**Implementation:**
- Win probability score per case (based on insurer + procedure + denial reason + state)
- Strategy recommendation engine (not AI-generated, data-driven)
- Insurer difficulty ratings updated in real-time from actual outcomes
- "Buddy Score" — confidence level for each case based on historical patterns

### Moat 3: Regulatory Intelligence Feed (Month 2-4)
**What:** LUMEN Scanner feeds real-time regulatory changes into PriorAuth Buddy.
**How:** When a state passes prior auth reform, Buddy knows immediately.
**Result:** "New Texas gold card law means your doctor is exempt. Tell the rep to check SB 1137."
**Why unkillable:** Continuous regulatory monitoring across 50 states + federal. Manual to replicate.

**Implementation:**
- LUMEN Scanner already monitors 74+ sources
- Build PriorAuth Buddy API endpoint that pulls relevant findings per state
- Buddy alerts users when new laws affect their active cases
- Rights screen auto-updates with new legislation
- "Your state just passed a law that helps your case" — real-time advocacy intelligence

### Moat 4: Network Effect / Community Intelligence (Month 4-8)
**What:** Every user makes the app smarter for every other user.
**How:** Anonymized pattern recognition across the entire user base.
**Result:** Deny-rate trends, insurer behavior shifts, emerging tactics — visible to all users.
**Why unkillable:** Network effects compound. Late entrants start with zero data.

**Implementation:**
- "Trending" section: "Aetna denials up 15% this month in Texas"
- "What's working now" feed: strategies with highest recent win rates
- Community win counter: "Buddy users have overturned 2,847 denials"
- Insurer report cards updated monthly from real outcomes
- Optional: anonymized case sharing ("Someone beat UHC on the same procedure you were denied")

## The LUMEN Flywheel

```
PriorAuth Buddy (consumer)
    ↓ anonymized denial + outcome data
LUMEN Intelligence (analytics)
    ↓ regulatory + trend intelligence
PriorAuth Buddy (consumer)
    ↓ better win rates = more users = more data
LUMEN SDK (enterprise)
    ↓ runtime governance informed by real-world outcomes
```

Each product feeds the others. The data moat compounds across the entire FORGE ecosystem.

## 6-Month Milestone Targets

| Month | Moat Progress | Metric |
|---|---|---|
| 1 | Strategy tagging on case outcomes | 100+ tagged outcomes |
| 2 | LUMEN Scanner → Buddy feed live | Real-time regulatory alerts |
| 3 | Win probability scoring v1 | Accuracy >60% on predictions |
| 4 | Insurer report cards from real data | 500+ resolved cases |
| 5 | Network effect features live | "Trending" + "What's Working" |
| 6 | Proprietary scoring model v1 | 70/30 proprietary/wrapper ratio |

## Competitive Position After 6 Months

| Competitor Action | Our Defense |
|---|---|
| Apple builds "Health Advocacy" feature | We have 6 months of outcome data they don't |
| ChatGPT adds denial letter templates | Templates without win-rate data = guessing |
| New startup launches similar app | Starting from zero data, we have thousands of cases |
| Insurer builds patient portal | They'll never tell patients how to beat themselves |

## The Exit Math
At 10K+ resolved cases with tagged outcomes:
- Proprietary dataset no one else has
- Proven win rates per insurer/procedure/state
- Real-time regulatory intelligence feed
- Network effects compounding daily

This is acquirable IP. Health tech companies, legal tech platforms, employer benefit providers — all would pay for this data + engine.

---

*Inspired by: Google VP Darren Mowry's warning on AI wrappers (Feb 2026)*
*Framework: Cursor (vertical depth) + Harvey AI (domain data) + network effects*
*Last updated: February 21, 2026*
