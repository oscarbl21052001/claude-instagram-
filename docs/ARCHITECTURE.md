# Architecture

## Design Principles

### 1. Hub-and-Spoke Orchestration

The `ig` skill is a pure router. It never creates content itself. It parses the
user's command, identifies the sub-skill, and delegates. This separation ensures:

- The orchestrator stays small (~200 lines) and maintainable
- Sub-skills can evolve independently
- Context window usage is minimized (only relevant references loaded)

### 2. RAG-Style Reference Loading

Each sub-skill declares which reference files it needs via a "Key references"
section. References are loaded on-demand, never all at once. This prevents
context window overflow and keeps each task focused.

**Reference loading pattern:**
```
User says "/ig reel"
  → Orchestrator routes to ig-reel
  → ig-reel loads: format-specs.md, hook-library.md, content-rules.md, scoring-system.md
  → Other references (affiliate-compliance.md, competitor-framework.md) stay unloaded
```

### 3. Principle of Least Privilege (Tools)

Each agent and sub-skill declares only the tools it needs:

| Component | Tools | Why |
|-----------|-------|-----|
| ig-content (agent) | Read, Grep, Glob | Reads posts, no writes needed |
| ig-engagement (agent) | Read, Bash | Needs Bash for metric calculations |
| ig-competitor (agent) | Read, WebSearch, WebFetch | Needs web access for research |
| ig-compliance (agent) | Read, Grep, Glob | Read-only validation |
| ig-reel (sub-skill) | Read, Write, Edit, Bash, Grep, Glob | Full content creation |
| ig-analyze (sub-skill) | Read, Bash, Grep | Analysis, no content creation |

### 4. Quality Gates as Hard Stops

Quality Gates are binary checks that block output regardless of score. They
exist at the orchestrator level and are enforced by every sub-skill. This is
fundamentally different from scoring (which is continuous). A post scoring 95
but violating Gate G2 (em dashes) is still blocked.

## System Architecture

```
User Request
     │
     ▼
┌─────────────┐
│ ig/SKILL.md │  ← Pure router, ~200 lines
│ Orchestrator │  ← Parses command, routes to sub-skill
└──────┬──────┘
       │
       ▼
┌──────────────┐     ┌───────────────────┐
│ Sub-Skills   │────▶│ References        │
│ (13 total)   │     │ (loaded on-demand) │
└──────┬───────┘     └───────────────────┘
       │
       ▼ (only for /ig audit)
┌──────────────┐
│ Agents       │  ← 6 parallel specialists
│ (forked ctx) │  ← Each with restricted tools
└──────────────┘
```

## File Layout

```
~/.claude/skills/
  ig/
    SKILL.md                    # Orchestrator
    references/
      scoring-system.md         # 100-point rubric
      algorithm-2026.md         # Algorithm signals
      format-specs.md           # Technical specs
      hook-library.md           # 50+ templates
      content-rules.md          # Caption/CTA rules
      account-baseline.md       # Live metrics
      affiliate-compliance.md   # Partner playbooks
      conversion-pipeline.md    # ManyChat/UTMs
      competitor-framework.md   # Benchmarks
      story-strategy.md         # Story types
      comment-responder.md      # Comment automation
      repurpose-playbook.md     # Cross-platform
  ig-reel/SKILL.md
  ig-hook/SKILL.md
  ig-caption/SKILL.md
  ig-story/SKILL.md
  ig-carousel/SKILL.md
  ig-analyze/SKILL.md
  ig-audit/SKILL.md
  ig-competitor/SKILL.md
  ig-calendar/SKILL.md
  ig-strategy/SKILL.md
  ig-affiliate/SKILL.md
  ig-comment/SKILL.md
  ig-repurpose/SKILL.md

~/.claude/agents/
  ig-content.md
  ig-engagement.md
  ig-creative.md
  ig-growth.md
  ig-competitor.md
  ig-compliance.md
```

## Scoring Architecture

### 5-Category Weighted Model

```
Content Quality Score = sum of:
  Hook Strength      (25%) × score/25
  Content Quality    (25%) × score/25
  Caption & CTA      (20%) × score/20
  Format Compliance  (15%) × score/15
  Algorithm Signals  (15%) × score/15
```

### Severity Multipliers

Compound weaknesses trigger multipliers:
- Quality Gate violation: score irrelevant (blocked)
- 2+ categories below 50%: 0.85x total
- Hook Strength < 10: 0.9x total
- Caption < 300 chars: 0.9x total

### Grading Bands

| Band | Score | Action |
|------|-------|--------|
| A | 90-100 | Publish as-is |
| B | 80-89 | Minor polish |
| C | 60-79 | Targeted improvements (fix instructions required) |
| D | 40-59 | Significant rework |
| F | < 40 | Start over |

## Scripts

Two Python scripts provide offline and API-driven analysis capabilities:

### analyze_post.py

Post performance analysis with dual data source support:

```
Data Sources (priority order):
  1. Instagram Graph API (requires INSTAGRAM_ACCESS_TOKEN)
  2. Apify Instagram Scraper (requires APIFY_TOKEN)
  3. Local JSON file (--input flag)

Usage:
  python analyze_post.py --token $TOKEN --user-id $ID      # Graph API
  python analyze_post.py --username handle --apify-token $T # Apify
  python analyze_post.py --input posts.json                 # Local file

Output: JSON (default), Markdown report, or compact table
```

Calculates per-post metrics: engagement rate, save rate, share rate,
comment-to-save ratio, avg watch time, performance tier. Generates
account summary with content type distribution, best posting times,
and algorithm signal analysis.

### score_content.py

Offline content quality scoring against the 5-category rubric:

```
Usage:
  python score_content.py draft-reel.md                     # Score single file
  python score_content.py drafts/ --batch --sort score      # Batch scoring
  python score_content.py draft.md --fix                    # Include fix suggestions

Output: JSON (default), Markdown scorecard, or compact table
```

Checks Quality Gates (em dashes, affiliate disclosure, safe zones),
scores Hook Strength (25), Content Quality (25), Caption & CTA (20),
Format Compliance (15), Algorithm Signals (15). Flags generic hashtags
and dead hook patterns.

## External Dependencies

| Dependency | Type | Purpose |
|-----------|------|---------|
| ig-research | Skill | Apify scraping, outlier detection |
| video-analyzer | Skill | Gemini video analysis |
| content-strategie | Skill | Macro-level batch planning |
| Instagram MCP | API | Live account/post data |

## Data Flow: /ig audit

```
1. ig-audit sub-skill fetches last 20-50 posts via Instagram MCP
2. Spawns 6 agents in parallel (context: fork):
   ├── ig-content    → scores each post (5-category rubric)
   ├── ig-engagement → analyzes save/DM/completion patterns
   ├── ig-creative   → checks format compliance
   ├── ig-growth     → tracks reach/follower trends
   ├── ig-competitor → benchmarks vs competitors
   └── ig-compliance → verifies quality gates
3. Collects all agent results
4. Generates unified IG Health Score (0-100)
5. Creates prioritized action plan (Critical → High → Medium → Low)
```

## Data Flow: /ig reel

```
1. Parse topic and content type
2. Load references: format-specs.md, hook-library.md, content-rules.md
3. Generate 3 hook variants from hook-library categories
4. Score each hook (25-point Hook Strength rubric)
5. Select best hook, write script with timing
6. Write caption (500+ chars, save CTA)
7. Describe thumbnail concept
8. Apply full 100-point Content Quality Score
9. Deliver complete package with score and revision notes
```
