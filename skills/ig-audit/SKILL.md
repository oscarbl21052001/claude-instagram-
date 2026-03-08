---
name: ig-audit
description: >
  Full Instagram content audit with parallel subagent delegation. Fetches
  recent posts via API, spawns specialized analysis agents in parallel,
  aggregates results into a unified report with an IG Health Score (0-100).
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
  - Bash
  - mcp__claude_ai_Instagram_MCP__get_user_info
  - mcp__claude_ai_Instagram_MCP__get_user_media
  - mcp__claude_ai_Instagram_MCP__get_post_insights
  - mcp__claude_ai_Instagram_MCP__get_user_insights
---

# IG Audit -- Full Instagram content audit with parallel agent delegation

**Key references:**
- `references/scoring-system.md` -- metric definitions, scoring thresholds
- `references/account-baseline.md` -- current benchmarks, historical averages
- `references/format-specs.md` -- format requirements, dimension specs

---

## Phase 1: Data Collection

Fetch live data via Instagram MCP tools:

1. **Account info:** `get_user_info` for follower count, bio, media count.
2. **Recent posts:** `get_user_media` for last 20-50 posts (aim for 30 minimum).
3. **Post insights:** `get_post_insights` for each post (reach, saves, shares, impressions).
4. **Account insights:** `get_user_insights` for follower growth, reach trends.

Bundle API calls in parallel where possible. Store all raw data in a structured format before proceeding.

**CRITICAL:** All analysis must be based on actual API data. If API calls fail, report the failure and reduce scope accordingly. Never fabricate data.

## Phase 2: Agent Delegation

Spawn **6 analysis agents in parallel**, each focused on a specific audit dimension. Each agent receives the collected data and its specific analysis brief.

### Agent 1: Content Analysis (ig-content)
- Content pillar distribution (what topics are covered, frequency)
- Caption quality (length, hook presence, CTA inclusion)
- Content type mix (educational, entertaining, promotional, personal)
- Topic gaps and oversaturation

### Agent 2: Engagement Analysis (ig-engagement)
- Engagement rate by format, topic, and posting time
- Save rate and share rate trends
- Comment sentiment overview (positive, neutral, negative, questions)
- DM generation potential (share rate as proxy)

### Agent 3: Creative Analysis (ig-creative)
- Visual consistency (brand colors, fonts, style)
- Cover/thumbnail quality assessment
- Video production quality indicators (completion rate as proxy)
- Hook effectiveness by category

### Agent 4: Growth Analysis (ig-growth)
- Follower growth rate and trajectory
- Reach-to-follower ratio trend
- Viral content identification (reach >> follower count)
- Audience growth sources (if available from insights)

### Agent 5: Competitor Benchmark (ig-competitor)
- Compare key metrics against account-baseline.md benchmarks
- Identify format or content gaps vs industry standards
- Note any emerging trends the account is missing

### Agent 6: Compliance Check (ig-compliance)
- Affiliate disclosure compliance (Kennzeichnungspflicht)
- Content rule violations (check against content-rules.md)
- Posting frequency consistency
- Bio optimization status

Each agent writes its findings to a temporary file. Collect all results before proceeding.

## Phase 3: Result Aggregation

Collect outputs from all 6 agents and merge into a unified dataset:

1. Read all agent output files.
2. Identify conflicting assessments between agents and resolve.
3. Rank findings by impact (high, medium, low).
4. Group related findings across agents into themes.

## Phase 4: IG Health Score

Calculate the IG Health Score (0-100) using weighted dimensions:

| Dimension | Weight | Score Range | Source Agent |
|-----------|--------|-------------|-------------|
| Content Quality | 20% | 0-100 | ig-content |
| Engagement Performance | 25% | 0-100 | ig-engagement |
| Creative Quality | 15% | 0-100 | ig-creative |
| Growth Trajectory | 20% | 0-100 | ig-growth |
| Competitive Position | 10% | 0-100 | ig-competitor |
| Compliance | 10% | 0-100 | ig-compliance |

### Scoring Guide
- **90-100:** Elite. Top 5% of accounts in this niche.
- **75-89:** Strong. Performing above average with clear strengths.
- **60-74:** Average. Solid foundation but significant optimization potential.
- **40-59:** Underperforming. Multiple areas need immediate attention.
- **0-39:** Critical. Fundamental strategy overhaul required.

Calculate each dimension score based on the agent findings, then compute the weighted total.

## Phase 5: Prioritized Action Plan

Create a prioritized list of improvements:

### Immediate (This Week)
- Max 3 high-impact, low-effort actions
- Each must reference a specific finding from the audit

### Short-Term (Next 30 Days)
- 3-5 strategic changes
- Include expected impact on specific metrics

### Long-Term (60-90 Days)
- 2-3 structural improvements
- May require new content types, tools, or workflows

## Phase 6: Quality Check

Before delivering the report, verify:

- [ ] All 6 agent dimensions are represented in the final report
- [ ] IG Health Score is calculated correctly (weights sum to 100%)
- [ ] Every recommendation is tied to a specific data point
- [ ] No fabricated data (all numbers trace back to API responses)
- [ ] Action plan items are specific and actionable (not vague advice)
- [ ] Report is readable without prior context

## Phase 7: Delivery

Output as a comprehensive Markdown report:

```
## Instagram Audit Report

**Account:** [handle]
**Period:** [date range]
**Posts Analyzed:** [count]
**IG Health Score:** [XX / 100] -- [rating label]

### Score Breakdown
| Dimension | Score | Status |
|-----------|-------|--------|
| Content Quality | XX | [label] |
| Engagement | XX | [label] |
| Creative | XX | [label] |
| Growth | XX | [label] |
| Competitive Position | XX | [label] |
| Compliance | XX | [label] |

### Key Findings
1. [finding with data]
2. [finding with data]
3. [finding with data]

### Strengths
- [strength 1]
- [strength 2]

### Critical Issues
- [issue 1 with impact]
- [issue 2 with impact]

### Action Plan

#### Immediate (This Week)
1. [action] -- Expected impact: [metric improvement]

#### Short-Term (30 Days)
1. [action] -- Expected impact: [metric improvement]

#### Long-Term (60-90 Days)
1. [action] -- Expected impact: [metric improvement]
```

Save the report to the location specified by the user, or to `/tmp/ig-audit-report.md` by default.
