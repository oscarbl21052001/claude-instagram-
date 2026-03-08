# Commands Reference

## Content Creation

### `/ig reel <topic>`
Write a complete Instagram Reel from scratch.

**Output:** Hook (3 variants scored), script with timing, caption (500+ chars), thumbnail concept, Content Quality Score.

**Example:** `/ig reel Warum Krafttraining ab 40 wichtiger wird`

### `/ig hook <topic>`
Generate and score hooks for any format.

**Output:** 3 hook variants from different categories, each scored on 25-point Hook Strength rubric, top 2 recommended with explanation.

**Example:** `/ig hook Protein-Timing bei Intervallfasten`

### `/ig caption <topic>`
Write an optimized caption.

**Output:** Complete caption (500+ chars) with hook variation opener, value body, save CTA, 3-5 niche hashtags, scored on Caption & CTA rubric (20 points).

**Example:** `/ig caption` (typically used after a Reel or Carousel is planned)

### `/ig story <topic>`
Plan a Story sequence.

**Output:** Slide-by-slide plan (max 5 slides) with text overlays, interactive element (poll/quiz/question), retention strategy.

**Example:** `/ig story Behind-the-scenes Trainingsvorberitung`

### `/ig carousel <topic>`
Plan a Carousel post.

**Output:** Cover slide hook, slide-by-slide content (one idea per slide, max 15 words on-slide), last slide CTA, Content Quality Score.

**Example:** `/ig carousel 5 Zeichen dass du zu wenig Protein isst`

### `/ig affiliate <partner>`
Create compliant affiliate content.

**Output:** Script/caption with mandatory "Werbung"/"Anzeige" disclosure, legal compliance check, scheduling validation, Content Quality Score.

**Example:** `/ig affiliate PartnerBrand Protein Powder`

## Analysis

### `/ig analyze [post-url]`
Analyze post or account performance via Instagram API.

**Output:** Metric breakdown (save rate, DM-send rate, completion rate), pattern detection, benchmark comparison.

**Example:** `/ig analyze` (analyzes last 20 posts) or `/ig analyze https://instagram.com/p/...`

### `/ig audit`
Full content audit with parallel subagent delegation.

**Output:** IG Health Score (0-100), per-category breakdown, 6 agent reports (content, engagement, creative, growth, competitor, compliance), prioritized action plan.

**Example:** `/ig audit`

### `/ig competitor <accounts>`
Research competitor content.

**Output:** Competitive positioning, content gaps, trending formats, hook patterns to adapt.

**Example:** `/ig competitor competitor1 competitor2`

## Planning

### `/ig calendar [weekly|monthly]`
Generate an editorial content calendar.

**Output:** Calendar with format, topic, hook category, posting day, content mix validation, affiliate spacing check.

**Example:** `/ig calendar monthly`

### `/ig strategy`
Content strategy and positioning analysis.

**Output:** Account analysis, audience mapping, content pillar review, gap identification, 30/60/90 day growth recommendations.

**Example:** `/ig strategy`

## Utilities

### `/ig comment`
Comment response strategy and automation setup.

**Output:** Response strategy, voice rules, category handling, automation reference.

**Example:** `/ig comment`

### `/ig repurpose <post>`
Repurpose IG content for other platforms.

**Output:** Per-platform adapted content (TikTok, YouTube Shorts, LinkedIn, Email, Blog).

**Example:** `/ig repurpose` (uses last created content)

## Scoring

Every content creation command (`reel`, `hook`, `caption`, `carousel`, `affiliate`) automatically applies the Content Quality Score before delivery. Content scoring below 80 includes specific revision instructions.

| Score | Band | Action |
|-------|------|--------|
| 90-100 | Publish | Ready to post |
| 80-89 | Strong | Minor polish |
| 60-79 | OK | Improvements needed (instructions included) |
| < 60 | Revise | Significant rework required |
