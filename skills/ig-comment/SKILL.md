---
name: ig-comment
description: >
  Comment response strategy and semi-automated handling. Defines response rules
  by comment category, maintains the creator's authentic voice, and references
  Make.com automation blueprints for scalable comment management.
allowed-tools:
  - Read
  - Write
  - Grep
  - Glob
---

# IG Comment -- Comment response strategy and automation

**Key references:**
- `references/comment-responder.md` -- Make.com automation blueprint, webhook setup, response templates
- `references/account-baseline.md` -- current response rate, average response time

---

## Phase 1: Strategy Overview

### Why Comments Matter
- Instagram rewards accounts that generate conversations (comments + replies)
- Every reply is a signal to the algorithm that the post is worth distributing
- Unanswered questions reduce future engagement (followers stop commenting)
- Comments are the top source of DM conversations (and conversions)

### Response Rate Target
- **Target:** Respond to 30-40% of all comments within 2 hours
- **Priority:** Questions and high-intent comments get 100% response rate
- **Minimum:** Never let a question go unanswered for more than 24 hours

### What NOT to Respond To
- Single-emoji comments (heart, fire, clap) -- like them, do not reply
- Bot/spam comments -- delete and block
- Promotional comments from other accounts -- delete
- Comments with only tags (@friend) -- the tag IS the engagement, no reply needed

## Phase 2: Voice Rules

All comment responses must sound like the creator wrote them. This is non-negotiable.
Load the creator's voice profile from `references/account-baseline.md`.

### Tone
- Warm, direct, encouraging
- Use "du" always (never "Sie")
- Short and punchy (under 50 words per reply)
- Use 1-2 emojis max per reply (favorites: heart, sparkle, muscle)
- Never sound like a support agent or chatbot

### Language Patterns
- **Start with:** name mention, affirmation, or direct answer
- **Avoid:** "Danke fuer dein Feedback", "Toll, dass du das ansprichst", or any template-sounding phrase
- **Use:** casual spoken German, contractions, exclamation marks for enthusiasm

### Examples (Good)
- "Jaaa mega! Probier mal die Variante mit Haferflocken, das macht nochmal satter"
- "Oh das kenn ich so gut. Schreib mir mal per DM, ich schick dir was dazu"
- "Haha genau DAS. Die meisten unterschaetzen wie wichtig das ist"

### Examples (Bad -- Never Write Like This)
- "Vielen Dank fuer deine Nachricht! Wir freuen uns ueber dein Feedback."
- "Das ist eine tolle Frage. Hier ist die Antwort: ..."
- "Danke, dass du Teil unserer Community bist!"

## Phase 3: Category Handling

Handle each comment category differently:

### 1. Compliment
- **Action:** Like + short reply that adds value
- **Template pattern:** Affirmation + bonus tip or personal note
- **Example:** "Freut mich total! Tipp: Versuch die Uebung mal mit engerer Fussstellung, Gamechanger"
- **Response rate:** 30% (every 3rd compliment gets a reply)

### 2. Question
- **Action:** ALWAYS reply. This is the highest priority.
- **Template pattern:** Direct answer + follow-up invitation
- **Example:** "Ja, das geht auch mit Mandelmehl. Schreib mir per DM wenn du das Rezept willst"
- **Response rate:** 100%
- **Escalation:** If the question requires detailed or medical advice, redirect to DM

### 3. Criticism / Disagreement
- **Action:** Reply only if constructive. Ignore trolls.
- **Template pattern:** Acknowledge + reframe + optional redirect
- **Example:** "Verstehe ich total. Bei mir hat es auch nicht sofort geklappt. Der Trick war..."
- **Response rate:** 50% (only constructive criticism)
- **NEVER:** Be defensive, argue, or dismiss

### 4. Frustration / Struggle
- **Action:** ALWAYS reply. These are trust-building moments.
- **Template pattern:** Empathy + normalization + encouragement + DM offer
- **Example:** "Hey, das ist so normal. Wirklich. Schreib mir kurz per DM, dann schauen wir zusammen drauf"
- **Response rate:** 100%
- **Goal:** Move to DM for deeper support (and potential conversion)

### 5. High-Intent Comment
Signs: mentions wanting to buy, asks about pricing, mentions specific product, uses words like "wo", "wie bestellen", "Link".
- **Action:** ALWAYS reply IMMEDIATELY
- **Template pattern:** Answer + direct link/DM invitation
- **Example:** "Den Link findest du in meiner Bio! Und mit Code XY sparst du nochmal 10%"
- **Response rate:** 100%
- **Speed:** Within 30 minutes if possible

## Phase 4: Automation Reference

For scaling comment management, reference the Make.com automation blueprint:

### Automated Workflow (from comment-responder.md)
1. **Trigger:** New comment webhook from Instagram API
2. **Filter:** Classify comment into categories (1-5) using keyword matching
3. **Auto-actions:**
   - Spam: auto-delete
   - Single emoji: auto-like
   - Question keywords: flag for immediate manual response
   - High-intent keywords: flag as priority + notify via Slack/email
4. **Draft responses:** For categories 1-3, generate draft responses using voice rules
5. **Human review:** All drafts go through manual approval before posting

### Setup Requirements
- Instagram Graph API access with `instagram_manage_comments` permission
- Make.com webhook endpoint
- Comment classification logic (keyword lists per category)
- Notification channel for priority comments

Load `references/comment-responder.md` for the full blueprint, webhook URLs, and keyword lists.

## Phase 5: Quality Check

Before deploying any comment response strategy or automation:

- [ ] Voice rules match the creator's actual commenting style (check recent manual replies)
- [ ] Response rate targets are achievable given current volume
- [ ] High-intent and question categories have 100% coverage
- [ ] No template-sounding phrases in any response drafts
- [ ] Automation workflow has human review step (no fully automated replies)
- [ ] Escalation paths are defined for sensitive topics

## Phase 6: Delivery

Output depends on the request type:

### If Strategy Document
```
## Comment Response Strategy

**Target Response Rate:** 30-40%
**Priority Categories:** Questions (100%), Frustration (100%), High-Intent (100%)

### Category Playbook
[Category table with examples]

### Voice Rules Summary
[Key do's and don'ts]

### Automation Status
[Current setup, what's automated, what's manual]
```

### If Response Drafts
```
## Comment Response Drafts

**Post:** [post reference]
**Comments to respond to:** [count]

| Comment | Category | Draft Response | Priority |
|---------|----------|---------------|----------|
| "[comment text]" | Question | "[draft reply]" | High |
```

### If Automation Setup
```
## Comment Automation Blueprint

**Platform:** Make.com
**Webhook:** [from comment-responder.md]
**Classification Rules:** [keyword lists]
**Approval Flow:** [workflow description]
```
