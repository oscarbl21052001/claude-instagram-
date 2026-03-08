#!/usr/bin/env python3
"""
Instagram Content Quality Scorer - 5-Category, 100-Point Scoring System

Scores draft Instagram content (hooks, captions, Reel scripts) against the
5-category rubric from the claude-ig skill. Purely local text analysis,
no API calls required.

Usage:
    python score_content.py <file>                              # Default JSON output
    python score_content.py <file> --format markdown            # Markdown scorecard
    python score_content.py <file> --format table               # Compact one-liner
    python score_content.py <directory> --batch --sort score     # Batch with sorting
    python score_content.py <file> --category hook              # Single category detail
    python score_content.py <file> --fix                        # Output specific fixes

Scoring:
    Hook Strength         25 pts   Curiosity gap, pattern interrupt, identity trigger, specificity
    Content Quality       25 pts   Problem-solution, value density, voice, flow, length
    Caption & CTA         20 pts   Length, save CTA, hook opener, line breaks, hashtags
    Format Compliance     15 pts   Type declared, duration, thumbnail, safe zones
    Algorithm Signals     15 pts   Save/DM CTA, non-controversial, originality, watch time

Bands:
    90-100  A  Publish
    80-89   B  Strong
    60-79   C  OK
    40-59   D  Below Standard
    <40     F  Reject

Quality Gates (binary, cap score at 59 on failure):
    G2: No em dashes (U+2014)
    G3: Affiliate disclosure (if affiliate markers found)
    G4: No controversial opinion without value
    G7: Safe zone note (if format declared)

Optional dependencies (graceful degradation):
    pip install textstat
"""

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

# ---------------------------------------------------------------------------
# Optional dependency detection
# ---------------------------------------------------------------------------

try:
    import textstat
    HAS_TEXTSTAT = True
except ImportError:
    HAS_TEXTSTAT = False


def _print_dependency_notice() -> None:
    """Print missing-dependency notice to stderr so JSON output stays clean."""
    if not HAS_TEXTSTAT:
        print(
            "Note: Optional dependency 'textstat' not found. "
            "Install with: pip install textstat",
            file=sys.stderr,
        )


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GENERIC_HASHTAGS = {
    "fitness", "motivation", "workout", "gym", "healthy", "love", "instagood",
    "photooftheday", "beautiful", "happy", "follow", "like", "fashion",
    "style", "food", "travel", "nature", "photography", "art", "life",
    "goals", "success", "mindset", "grind", "hustle",
}

DEAD_HOOK_PATTERNS = [
    r"(?i)^POV:",
    r"(?i)things nobody tells you",
    r"(?i)nur 1% wissen",
    r"(?i)watch till the end",
    r"(?i)you won't believe",
    r"(?i)this changed my life",
    r"(?i)I tried .+ for 30 days",
    r"(?i)what I eat in a day",
    r"(?i)^unpopular opinion:",
]

# Patterns that signal curiosity gap / pattern interrupt
CURIOSITY_PATTERNS = [
    r"\?",                                  # question marks
    r"(?i)\bFehler\b",
    r"(?i)\bfalsch\b",
    r"(?i)\bniemand\b",
    r"(?i)\bnever\b",
    r"(?i)\bstop\b",
    r"(?i)\bgeheim\b",
    r"(?i)\bsecret\b",
    r"(?i)\bwarning\b",
    r"(?i)\bWarnung\b",
    r"(?i)\bAchtung\b",
    r"\d+",                                 # numbers
    r"(?i)\bnicht\b",
    r"(?i)\bkein[e]?\b",
    r"(?i)\bohne\b",
]

IDENTITY_PATTERNS = [
    r"(?i)\bdu\b",
    r"(?i)\bFrauen\b",
    r"(?i)\b(?:ab|uber|mit)\s+\d{2}\b",    # age references
    r"(?i)\bMutter\b",
    r"(?i)\bMama\b",
    r"(?i)\bAnfanger(?:in)?\b",
    r"(?i)\bBerufstatige\b",
]

SAVE_CTA_PATTERNS = [
    r"(?i)\bspeicher",
    r"(?i)\bsave\b",
    r"(?i)\bsichern\b",
    r"(?i)\bmerken\b",
    r"(?i)\bpin\s+(?:dir|das)\b",
    r"(?i)\bfur\s+spater\b",
]

DM_CTA_PATTERNS = [
    r"(?i)\bschick",
    r"(?i)\bteile?\s+(?:das|es)\b",
    r"(?i)\bsend\b",
    r"(?i)\bDM\b",
    r"(?i)\bNachricht\b",
    r"(?i)\bFreundin\b",
]

LIKE_CTA_PATTERNS = [
    r"(?i)\blike\b",
    r"(?i)\bgefallen\b",
    r"(?i)\bherz\b",
    r"(?i)\bdoppeltipp\b",
]

OPINION_MARKERS = [
    r"(?i)\bunpopular opinion\b",
    r"(?i)\bcontroversial\b",
    r"(?i)\bhot take\b",
    r"(?i)\bunpopulare Meinung\b",
    r"(?i)\bprovokant\b",
]

AFFILIATE_MARKERS = [
    r"(?i)\baffiliate\b",
    r"(?i)\bpartner\s*link\b",
    r"(?i)\bprovisionslink\b",
    r"(?i)\bsponsor",
    r"(?i)\bkooperation\b",
    r"(?i)\b(?:bezahlte?\s+)?(?:Werbung|Anzeige)\b",
    r"(?i)\bad\b",
]

DEAD_FORMAT_PATTERNS = [
    r"(?i)\bday in (?:my|the) life\b",
    r"(?i)\bget ready with me\b",
    r"(?i)\bGRWM\b",
    r"(?i)\b(?:what|was) I eat in a day\b",
]

# Duration targets per format type (seconds)
DURATION_TARGETS: dict[str, tuple[int, int]] = {
    "reel": (15, 90),
    "story": (5, 15),
    "carousel": (0, 0),  # not time-based
    "feed": (0, 0),
}


# ---------------------------------------------------------------------------
# Section parsing
# ---------------------------------------------------------------------------


def parse_content_file(text: str) -> dict[str, Any]:
    """Parse a markdown content file into structured sections."""
    sections: dict[str, str] = {}
    current_section: str | None = None
    current_lines: list[str] = []
    title = ""

    for line in text.split("\n"):
        # Top-level title
        h1_match = re.match(r"^#\s+(?:Reel|Story|Carousel|Feed|Post)?:?\s*(.*)", line)
        if h1_match:
            title = h1_match.group(1).strip()
            continue

        # Section headers
        h2_match = re.match(r"^##\s+(.+)", line)
        if h2_match:
            if current_section is not None:
                sections[current_section] = "\n".join(current_lines).strip()
            current_section = h2_match.group(1).strip().lower()
            current_lines = []
            continue

        if current_section is not None:
            current_lines.append(line)

    # Flush last section
    if current_section is not None:
        sections[current_section] = "\n".join(current_lines).strip()

    # Parse format metadata from the "format" section
    format_info: dict[str, str] = {}
    if "format" in sections:
        for line in sections["format"].split("\n"):
            kv_match = re.match(r"^(\w[\w\s]*):\s*(.+)", line.strip())
            if kv_match:
                format_info[kv_match.group(1).strip().lower()] = kv_match.group(2).strip()

    # If no sections detected, treat entire text as content
    if not sections:
        sections["_raw"] = text

    return {
        "title": title,
        "sections": sections,
        "format_info": format_info,
        "full_text": text,
        "has_hook": "hook" in sections,
        "has_script": "script" in sections or "skript" in sections,
        "has_caption": "caption" in sections or "bildunterschrift" in sections,
        "has_thumbnail": "thumbnail" in sections,
        "has_format": "format" in sections,
    }


def _get_section(parsed: dict[str, Any], *keys: str) -> str:
    """Get text from the first matching section key, or empty string."""
    for key in keys:
        if key in parsed["sections"]:
            return parsed["sections"][key]
    return ""


# ---------------------------------------------------------------------------
# Quality Gates
# ---------------------------------------------------------------------------


def check_quality_gates(parsed: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Check binary quality gates. Returns dict of gate results."""
    full_text = parsed["full_text"]
    gates: dict[str, dict[str, Any]] = {}

    # G2: No em dashes
    em_dash_count = full_text.count("\u2014")
    gates["G2_no_em_dashes"] = {
        "passed": em_dash_count == 0,
        "detail": f"{em_dash_count} em dash(es) found" if em_dash_count > 0 else "Clean",
    }

    # G3: Affiliate disclosure
    has_affiliate = any(re.search(p, full_text) for p in AFFILIATE_MARKERS)
    if has_affiliate:
        caption = _get_section(parsed, "caption", "bildunterschrift")
        has_disclosure = bool(
            re.match(r"(?i)^\s*(?:Werbung|Anzeige|Ad\b)", caption)
        ) if caption else False
        gates["G3_affiliate_disclosure"] = {
            "passed": has_disclosure,
            "detail": "Disclosure at caption start" if has_disclosure
                      else "Affiliate markers found but no disclosure at caption start",
        }
    else:
        gates["G3_affiliate_disclosure"] = {
            "passed": True,
            "detail": "No affiliate markers detected (N/A)",
        }

    # G4: No controversial opinion
    has_opinion = any(re.search(p, full_text) for p in OPINION_MARKERS)
    # Check if opinion is paired with value delivery
    has_value = bool(re.search(
        r"(?i)(?:Studie|Forschung|Daten|Beweis|weil|deshalb|darum|therefore|because|research|study)",
        full_text,
    ))
    gates["G4_no_controversial_opinion"] = {
        "passed": not has_opinion or has_value,
        "detail": "Opinion without value delivery" if has_opinion and not has_value
                  else "Clean" if not has_opinion
                  else "Opinion with value backing",
    }

    # G7: Safe zone note
    has_format = parsed["has_format"]
    if has_format:
        safe_zone_mentioned = bool(re.search(
            r"(?i)safe\s*zone|sicher.{0,5}bereich|text.{0,10}platz",
            full_text,
        ))
        gates["G7_safe_zone"] = {
            "passed": safe_zone_mentioned,
            "detail": "Safe zone noted" if safe_zone_mentioned
                      else "Format declared but no safe zone mention",
        }
    else:
        gates["G7_safe_zone"] = {
            "passed": True,
            "detail": "No format section (N/A)",
        }

    return gates


# ---------------------------------------------------------------------------
# Category 1: Hook Strength (25 pts)
# ---------------------------------------------------------------------------


def score_hook_strength(parsed: dict[str, Any]) -> dict[str, Any]:
    """Score the hook section (25 points max)."""
    hook_text = _get_section(parsed, "hook")
    breakdown: dict[str, Any] = {}
    issues: list[dict[str, Any]] = []
    score = 0

    if not hook_text:
        return {
            "score": 0,
            "max": 25,
            "breakdown": {"pattern_interrupt": 0, "identity_trigger": 0,
                          "specificity": 0, "length": 0, "no_cliche": 0},
            "issues": [{"severity": "high", "issue": "No hook section found",
                        "fix": "Add a ## Hook section with a clear opening line"}],
        }

    # 1a. Pattern interrupt / curiosity gap (8 pts)
    curiosity_hits = sum(
        1 for p in CURIOSITY_PATTERNS if re.search(p, hook_text)
    )
    if curiosity_hits >= 4:
        pi_score = 8
    elif curiosity_hits >= 3:
        pi_score = 6
    elif curiosity_hits >= 2:
        pi_score = 4
    elif curiosity_hits >= 1:
        pi_score = 2
    else:
        pi_score = 0
        issues.append({"severity": "high",
                        "issue": "Hook lacks pattern interrupt or curiosity gap",
                        "fix": "Add a question, negation, number, or surprising claim"})
    score += pi_score
    breakdown["pattern_interrupt"] = pi_score

    # 1b. Identity trigger (5 pts)
    identity_hits = sum(
        1 for p in IDENTITY_PATTERNS if re.search(p, hook_text)
    )
    if identity_hits >= 2:
        id_score = 5
    elif identity_hits >= 1:
        id_score = 3
    else:
        id_score = 0
        issues.append({"severity": "medium",
                        "issue": "Hook lacks identity trigger",
                        "fix": "Address the viewer directly ('du', 'Frauen ab 40', etc.)"})
    score += id_score
    breakdown["identity_trigger"] = id_score

    # 1c. Specificity - numbers, timeframes (5 pts)
    number_matches = re.findall(r"\d+", hook_text)
    time_matches = re.findall(
        r"(?i)\b(?:Tage?|Wochen?|Monate?|Minuten?|Sekunden?|days?|weeks?|months?|seconds?|minutes?)\b",
        hook_text,
    )
    specificity_signals = len(number_matches) + len(time_matches)
    if specificity_signals >= 3:
        spec_score = 5
    elif specificity_signals >= 2:
        spec_score = 4
    elif specificity_signals >= 1:
        spec_score = 2
    else:
        spec_score = 0
        issues.append({"severity": "low",
                        "issue": "Hook lacks specific numbers or timeframes",
                        "fix": "Add concrete numbers ('3 Fehler', '10 Sekunden', '80%')"})
    score += spec_score
    breakdown["specificity"] = spec_score

    # 1d. Length - under 10 words ideal (4 pts)
    hook_words = len(hook_text.split())
    if hook_words <= 10:
        len_score = 4
    elif hook_words <= 15:
        len_score = 3
    elif hook_words <= 20:
        len_score = 2
    else:
        len_score = 1
        issues.append({"severity": "medium",
                        "issue": f"Hook is {hook_words} words, ideal is under 10",
                        "fix": "Shorten the hook to under 10 words for maximum impact"})
    score += len_score
    breakdown["length"] = len_score

    # 1e. No cliche patterns (3 pts)
    cliche_found = [
        p for p in DEAD_HOOK_PATTERNS if re.search(p, hook_text)
    ]
    if not cliche_found:
        cliche_score = 3
    else:
        cliche_score = 0
        issues.append({"severity": "high",
                        "issue": "Hook uses a dead/cliche pattern",
                        "fix": "Replace with a Correction, Identity Trigger, or Bold Claim hook"})
    score += cliche_score
    breakdown["no_cliche"] = cliche_score

    return {"score": min(score, 25), "max": 25, "breakdown": breakdown, "issues": issues}


# ---------------------------------------------------------------------------
# Category 2: Content Quality (25 pts)
# ---------------------------------------------------------------------------


def score_content_quality(parsed: dict[str, Any]) -> dict[str, Any]:
    """Score content quality (25 points max)."""
    script = _get_section(parsed, "script", "skript")
    # Fall back to raw content if no script section
    content = script if script else parsed.get("full_text", "")
    breakdown: dict[str, Any] = {}
    issues: list[dict[str, Any]] = []
    score = 0

    if not content.strip():
        return {
            "score": 0, "max": 25,
            "breakdown": {"problem_solution": 0, "value_density": 0,
                          "voice_authenticity": 0, "logical_flow": 0, "length": 0},
            "issues": [{"severity": "high", "issue": "No content/script found",
                        "fix": "Add a ## Script section with the full content"}],
        }

    # 2a. Problem-solution structure (8 pts)
    problem_markers = re.findall(
        r"(?i)\b(?:Problem|Fehler|falsch|schlecht|vermeiden|aufhoren|stopp|nicht|schwierig|Herausforderung)\b",
        content,
    )
    solution_markers = re.findall(
        r"(?i)\b(?:stattdessen|besser|Losung|Tipp|richtig|so geht|mach|versuch|probier|alternative)\b",
        content,
    )
    if problem_markers and solution_markers:
        ps_score = 8
    elif problem_markers or solution_markers:
        ps_score = 5
    else:
        ps_score = 2
        issues.append({"severity": "medium",
                        "issue": "No clear problem-solution structure detected",
                        "fix": "Structure content as: Problem statement -> Why it matters -> Solution"})
    score += ps_score
    breakdown["problem_solution"] = ps_score

    # 2b. Value density (5 pts)
    sentences = [s.strip() for s in re.split(r"[.!?\n]", content) if s.strip()]
    actionable_patterns = re.findall(
        r"(?i)\b(?:mach|versuch|probier|nimm|iss|trink|trainier|starte|beginne|achte|nutze|verwende|do|try|use|start|take)\b",
        content,
    )
    total_sentences = max(len(sentences), 1)
    actionable_ratio = len(actionable_patterns) / total_sentences
    if actionable_ratio >= 0.3:
        vd_score = 5
    elif actionable_ratio >= 0.2:
        vd_score = 4
    elif actionable_ratio >= 0.1:
        vd_score = 2
    else:
        vd_score = 1
        issues.append({"severity": "medium",
                        "issue": "Low value density: not enough actionable statements",
                        "fix": "Add imperative verbs and concrete instructions"})
    score += vd_score
    breakdown["value_density"] = vd_score

    # 2c. Voice authenticity (5 pts)
    voice_markers = re.findall(
        r"(?i)\b(?:du kannst|ich habe|bei mir|ehrlich|lass uns|stell dir vor|ganz einfach|weisst du)\b",
        content,
    )
    short_sentences = [s for s in sentences if len(s.split()) <= 8]
    short_ratio = len(short_sentences) / total_sentences if total_sentences > 0 else 0
    voice_score = 0
    if len(voice_markers) >= 3:
        voice_score += 3
    elif len(voice_markers) >= 1:
        voice_score += 2
    if short_ratio >= 0.25:
        voice_score += 2
    elif short_ratio >= 0.15:
        voice_score += 1
    voice_score = min(voice_score, 5)
    if voice_score <= 2:
        issues.append({"severity": "low",
                        "issue": "Voice lacks conversational authenticity",
                        "fix": "Use shorter sentences, direct address ('du'), personal experience ('ich habe...')"})
    score += voice_score
    breakdown["voice_authenticity"] = voice_score

    # 2d. Logical flow (4 pts)
    has_numbered_steps = bool(re.search(r"(?:^|\n)\s*\d+[.)]\s", content))
    has_transitions = bool(re.search(
        r"(?i)\b(?:zuerst|dann|danach|ausserdem|zum Schluss|first|then|next|finally|also|deshalb)\b",
        content,
    ))
    has_timing = bool(re.search(r"\[\d+:\d+(?:-\d+:\d+)?\]|\b\d+s\b|\bSekunde", content))
    flow_score = 0
    if has_numbered_steps:
        flow_score += 2
    if has_transitions:
        flow_score += 1
    if has_timing:
        flow_score += 1
    flow_score = min(flow_score, 4)
    if flow_score <= 1:
        issues.append({"severity": "low",
                        "issue": "Weak logical flow: no steps, transitions, or timing markers",
                        "fix": "Add numbered steps, transition words, or timing markers ([0:00-0:03])"})
    score += flow_score
    breakdown["logical_flow"] = flow_score

    # 2e. Appropriate length (3 pts)
    word_count = len(content.split())
    fmt_type = parsed["format_info"].get("type", "").lower()
    if fmt_type in ("reel", "reels"):
        ideal_min, ideal_max = 50, 300
    elif fmt_type in ("story", "stories"):
        ideal_min, ideal_max = 20, 100
    elif fmt_type in ("carousel", "karussell"):
        ideal_min, ideal_max = 100, 500
    else:
        ideal_min, ideal_max = 30, 400

    if ideal_min <= word_count <= ideal_max:
        length_score = 3
    elif word_count >= ideal_min * 0.5 and word_count <= ideal_max * 1.5:
        length_score = 2
    elif word_count > 0:
        length_score = 1
    else:
        length_score = 0
    if length_score < 2:
        issues.append({"severity": "medium",
                        "issue": f"Script length ({word_count} words) outside ideal range ({ideal_min}-{ideal_max})",
                        "fix": f"Adjust script to {ideal_min}-{ideal_max} words for this format"})
    score += length_score
    breakdown["length"] = length_score

    return {"score": min(score, 25), "max": 25, "breakdown": breakdown, "issues": issues}


# ---------------------------------------------------------------------------
# Category 3: Caption & CTA (20 pts)
# ---------------------------------------------------------------------------


def score_caption_cta(parsed: dict[str, Any]) -> dict[str, Any]:
    """Score caption and CTA quality (20 points max)."""
    caption = _get_section(parsed, "caption", "bildunterschrift")
    hook_text = _get_section(parsed, "hook")
    breakdown: dict[str, Any] = {}
    issues: list[dict[str, Any]] = []
    score = 0

    if not caption:
        return {
            "score": 0, "max": 20,
            "breakdown": {"length": 0, "save_cta": 0, "hook_variation": 0,
                          "line_breaks": 0, "hashtag_quality": 0},
            "issues": [{"severity": "high", "issue": "No caption section found",
                        "fix": "Add a ## Caption section with 500+ characters"}],
        }

    # 3a. Length >= 500 chars (5 pts)
    caption_len = len(caption)
    if caption_len >= 500:
        len_score = 5
    elif caption_len >= 400:
        len_score = 4
    elif caption_len >= 300:
        len_score = 3
    elif caption_len >= 150:
        len_score = 2
    else:
        len_score = 1
    if len_score < 5:
        issues.append({"severity": "high" if caption_len < 300 else "medium",
                        "issue": f"Caption is {caption_len} chars, needs 500+",
                        "fix": "Add 2-3 more value sentences before the CTA"})
    score += len_score
    breakdown["length"] = len_score

    # 3b. Save-focused CTA present (5 pts)
    has_save_cta = any(re.search(p, caption) for p in SAVE_CTA_PATTERNS)
    has_dm_cta = any(re.search(p, caption) for p in DM_CTA_PATTERNS)
    has_like_cta = any(re.search(p, caption) for p in LIKE_CTA_PATTERNS)

    if has_save_cta and has_dm_cta:
        cta_score = 5  # compound CTA
    elif has_save_cta:
        cta_score = 4
    elif has_dm_cta:
        cta_score = 3
    elif has_like_cta:
        cta_score = 1
        issues.append({"severity": "high",
                        "issue": "CTA optimizes for likes instead of saves/DMs",
                        "fix": "Replace with save CTA ('Speicher dir das') or DM CTA ('Schick das einer Freundin')"})
    else:
        cta_score = 0
        issues.append({"severity": "high",
                        "issue": "No CTA detected in caption",
                        "fix": "Add a save-focused CTA: 'Speicher dir das fur spater'"})
    score += cta_score
    breakdown["save_cta"] = cta_score

    # 3c. Hook variation opener (4 pts)
    caption_first_line = caption.split("\n")[0].strip()
    if hook_text and caption_first_line:
        # Check if caption opener is different from hook but thematically related
        hook_words = set(hook_text.lower().split())
        opener_words = set(caption_first_line.lower().split())
        overlap = len(hook_words & opener_words) / max(len(hook_words), 1)
        if 0.1 <= overlap <= 0.6:
            # Good: variation, not identical
            var_score = 4
        elif overlap > 0.6:
            var_score = 2
            issues.append({"severity": "low",
                            "issue": "Caption opener is too similar to hook",
                            "fix": "Rephrase the caption's first line as a hook variation, not a copy"})
        else:
            var_score = 2  # completely different is acceptable
    elif not hook_text:
        var_score = 2  # no hook to compare
    else:
        var_score = 0
    score += var_score
    breakdown["hook_variation"] = var_score

    # 3d. Line breaks for readability (3 pts)
    lines = [l for l in caption.split("\n") if l.strip()]
    if len(lines) >= 5:
        lb_score = 3
    elif len(lines) >= 3:
        lb_score = 2
    elif len(lines) >= 2:
        lb_score = 1
    else:
        lb_score = 0
        issues.append({"severity": "medium",
                        "issue": "Caption is a wall of text with no line breaks",
                        "fix": "Add paragraph breaks every 2-3 sentences"})
    score += lb_score
    breakdown["line_breaks"] = lb_score

    # 3e. Hashtag quality (3 pts)
    hashtags = re.findall(r"#(\w+)", caption)
    generic_found = [h for h in hashtags if h.lower() in GENERIC_HASHTAGS]
    niche_count = len(hashtags) - len(generic_found)

    if 3 <= niche_count <= 5 and not generic_found:
        ht_score = 3
    elif niche_count >= 3:
        ht_score = 2
        if generic_found:
            issues.append({"severity": "medium",
                            "issue": f"Generic hashtags detected: {', '.join('#' + h for h in generic_found)}",
                            "fix": "Remove generic hashtags and use niche-specific ones"})
    elif niche_count >= 1:
        ht_score = 1
    elif not hashtags:
        ht_score = 0
        issues.append({"severity": "medium",
                        "issue": "No hashtags found",
                        "fix": "Add 3-5 niche-specific hashtags"})
    else:
        ht_score = 0
        issues.append({"severity": "high",
                        "issue": "Only generic hashtags found",
                        "fix": "Replace all generic hashtags (#fitness, #motivation) with niche tags"})
    score += ht_score
    breakdown["hashtag_quality"] = ht_score

    return {"score": min(score, 20), "max": 20, "breakdown": breakdown, "issues": issues}


# ---------------------------------------------------------------------------
# Category 4: Format Compliance (15 pts)
# ---------------------------------------------------------------------------


def score_format_compliance(parsed: dict[str, Any]) -> dict[str, Any]:
    """Score format compliance (15 points max)."""
    fmt_info = parsed["format_info"]
    breakdown: dict[str, Any] = {}
    issues: list[dict[str, Any]] = []
    score = 0

    # 4a. Format type declared (4 pts)
    fmt_type = fmt_info.get("type", "").lower()
    if fmt_type:
        type_score = 4
    else:
        type_score = 0
        issues.append({"severity": "medium",
                        "issue": "No format type declared (Reel, Story, Carousel, Feed)",
                        "fix": "Add a ## Format section with 'Type: Reel' (or Story, Carousel, Feed)"})
    score += type_score
    breakdown["type_declared"] = type_score

    # 4b. Duration within optimal range (4 pts)
    duration_str = fmt_info.get("duration", fmt_info.get("dauer", ""))
    duration_match = re.search(r"(\d+)", duration_str) if duration_str else None
    duration_seconds = int(duration_match.group(1)) if duration_match else 0
    # Convert minutes to seconds if needed
    if duration_str and re.search(r"(?i)min", duration_str) and duration_seconds < 10:
        duration_seconds *= 60

    if fmt_type and fmt_type in DURATION_TARGETS:
        target_min, target_max = DURATION_TARGETS[fmt_type]
        if target_max == 0:
            dur_score = 4  # not time-based
        elif target_min <= duration_seconds <= target_max:
            dur_score = 4
        elif duration_seconds > 0:
            dur_score = 2
            issues.append({"severity": "medium",
                            "issue": f"Duration ({duration_seconds}s) outside optimal range ({target_min}-{target_max}s) for {fmt_type}",
                            "fix": f"Adjust content to fit {target_min}-{target_max}s for {fmt_type}"})
        else:
            dur_score = 1
            issues.append({"severity": "low",
                            "issue": "No duration specified",
                            "fix": f"Add 'Duration: __s' to the ## Format section"})
    elif duration_seconds > 0:
        dur_score = 2
    else:
        dur_score = 0
    score += dur_score
    breakdown["duration"] = dur_score

    # 4c. Thumbnail described (4 pts)
    has_thumbnail = parsed["has_thumbnail"]
    thumbnail_text = _get_section(parsed, "thumbnail")
    if has_thumbnail and len(thumbnail_text) >= 20:
        thumb_score = 4
    elif has_thumbnail:
        thumb_score = 2
    else:
        thumb_score = 0
        if fmt_type in ("reel", "reels", "feed", ""):
            issues.append({"severity": "medium",
                            "issue": "No thumbnail description provided",
                            "fix": "Add a ## Thumbnail section with text overlay concept and visual description"})
    score += thumb_score
    breakdown["thumbnail"] = thumb_score

    # 4d. Safe zone compliance noted (3 pts)
    safe_zone_mentioned = bool(re.search(
        r"(?i)safe\s*zone|sicher.{0,5}bereich|text.{0,10}platz|overlay|UI.{0,5}bereich",
        parsed["full_text"],
    ))
    if safe_zone_mentioned:
        sz_score = 3
    elif not fmt_type:
        sz_score = 1  # no format, partial credit
    else:
        sz_score = 0
        issues.append({"severity": "low",
                        "issue": "No safe zone compliance note",
                        "fix": "Add a note about text placement avoiding UI overlay zones"})
    score += sz_score
    breakdown["safe_zone"] = sz_score

    return {"score": min(score, 15), "max": 15, "breakdown": breakdown, "issues": issues}


# ---------------------------------------------------------------------------
# Category 5: Algorithm Signals (15 pts)
# ---------------------------------------------------------------------------


def score_algorithm_signals(parsed: dict[str, Any]) -> dict[str, Any]:
    """Score algorithm optimization signals (15 points max)."""
    full_text = parsed["full_text"]
    caption = _get_section(parsed, "caption", "bildunterschrift")
    script = _get_section(parsed, "script", "skript")
    breakdown: dict[str, Any] = {}
    issues: list[dict[str, Any]] = []
    score = 0

    # 5a. CTA optimizes for saves/DMs, not likes (5 pts)
    has_save = any(re.search(p, full_text) for p in SAVE_CTA_PATTERNS)
    has_dm = any(re.search(p, full_text) for p in DM_CTA_PATTERNS)
    has_like = any(re.search(p, full_text) for p in LIKE_CTA_PATTERNS)

    if has_save and has_dm:
        cta_score = 5
    elif has_save or has_dm:
        cta_score = 4
    elif has_like:
        cta_score = 1
        issues.append({"severity": "high",
                        "issue": "CTA targets likes, the weakest algorithm signal",
                        "fix": "Optimize CTA for saves or DM-sends instead"})
    else:
        cta_score = 2  # no CTA at all, neutral
    score += cta_score
    breakdown["save_dm_optimized"] = cta_score

    # 5b. Not a controversial opinion post (4 pts)
    is_controversial = any(re.search(p, full_text) for p in OPINION_MARKERS)
    has_value_backing = bool(re.search(
        r"(?i)(?:Studie|Forschung|Daten|weil|deshalb|research|evidence|proven)",
        full_text,
    ))
    if not is_controversial:
        cont_score = 4
    elif has_value_backing:
        cont_score = 3
    else:
        cont_score = 0
        issues.append({"severity": "high",
                        "issue": "Controversial opinion without value delivery (high comments, zero saves)",
                        "fix": "Either back the opinion with research/data or reframe as educational content"})
    score += cont_score
    breakdown["not_controversial"] = cont_score

    # 5c. Originality (3 pts)
    is_dead_format = any(re.search(p, full_text) for p in DEAD_FORMAT_PATTERNS)
    if is_dead_format:
        orig_score = 0
        issues.append({"severity": "medium",
                        "issue": "Uses a recycled/dead format that the algorithm penalizes",
                        "fix": "Adapt through your unique perspective instead of copying the format verbatim"})
    else:
        orig_score = 3
    score += orig_score
    breakdown["originality"] = orig_score

    # 5d. Watch time design (3 pts)
    content = script if script else full_text
    has_reveal = bool(re.search(
        r"(?i)(?:reveal|enthull|auflos|am Ende|Uberraschung|Pointe|plot twist|payoff|wait for it)",
        content,
    ))
    has_open_loop = bool(re.search(
        r"(?i)(?:aber zuerst|bevor|doch vorher|before that|but first|here'?s the thing)",
        content,
    ))
    has_hook_recap = bool(re.search(
        r"(?i)(?:wie versprochen|as promised|zuruck zu|back to|deshalb)",
        content,
    ))
    wt_score = 0
    if has_reveal:
        wt_score += 1
    if has_open_loop:
        wt_score += 1
    if has_hook_recap:
        wt_score += 1
    if wt_score == 0:
        issues.append({"severity": "medium",
                        "issue": "No watch time design elements (open loops, reveals, payoffs)",
                        "fix": "Add an open loop ('aber zuerst...'), a reveal, or a payoff structure"})
    score += wt_score
    breakdown["watch_time_design"] = wt_score

    return {"score": min(score, 15), "max": 15, "breakdown": breakdown, "issues": issues}


# ---------------------------------------------------------------------------
# Severity multipliers
# ---------------------------------------------------------------------------


def apply_multipliers(total_score: int, categories: dict[str, dict[str, Any]]) -> tuple[int, list[str]]:
    """Apply severity multipliers from scoring-system.md. Returns adjusted score and flags."""
    adjusted = float(total_score)
    flags: list[str] = []

    # Count categories below 50% of max
    below_50_count = sum(
        1 for cat in categories.values()
        if cat["score"] < cat["max"] * 0.5
    )
    if below_50_count >= 2:
        adjusted *= 0.85
        flags.append(f"compound_weakness_penalty (0.85x): {below_50_count} categories below 50%")

    # Hook below 10 penalty
    hook = categories.get("hook_strength", {})
    if hook.get("score", 0) < 10:
        adjusted *= 0.9
        flags.append("weak_hook_penalty (0.9x): hook score below 10")

    # Caption under 300 chars penalty (checked via caption_cta breakdown)
    caption_cta = categories.get("caption_cta", {})
    caption_len_score = caption_cta.get("breakdown", {}).get("length", 0)
    if caption_len_score <= 2:
        adjusted *= 0.9
        flags.append("short_caption_penalty (0.9x): caption under 300 characters")

    return max(0, min(100, round(adjusted))), flags


# ---------------------------------------------------------------------------
# Main scoring orchestrator
# ---------------------------------------------------------------------------


def _get_grade(score: int) -> tuple[str, str]:
    """Return (grade, rating) for a given score."""
    if score >= 90:
        return "A", "Publish"
    elif score >= 80:
        return "B", "Strong"
    elif score >= 60:
        return "C", "OK"
    elif score >= 40:
        return "D", "Below Standard"
    else:
        return "F", "Reject"


def score_file(file_path: Path) -> dict[str, Any]:
    """Score a single content file. Returns complete result dict."""
    text = file_path.read_text(encoding="utf-8")
    parsed = parse_content_file(text)

    # Quality gates
    gates = check_quality_gates(parsed)
    gate_failed = any(not g["passed"] for g in gates.values())

    # Score all categories
    hook = score_hook_strength(parsed)
    content = score_content_quality(parsed)
    caption = score_caption_cta(parsed)
    fmt = score_format_compliance(parsed)
    algo = score_algorithm_signals(parsed)

    categories = {
        "hook_strength": hook,
        "content_quality": content,
        "caption_cta": caption,
        "format_compliance": fmt,
        "algorithm_signals": algo,
    }

    raw_total = sum(cat["score"] for cat in categories.values())

    # Apply multipliers
    adjusted_total, multiplier_flags = apply_multipliers(raw_total, categories)

    # Cap at 59 if any quality gate failed
    if gate_failed:
        adjusted_total = min(adjusted_total, 59)

    grade, rating = _get_grade(adjusted_total)

    # Collect all issues and sort by severity
    severity_order = {"high": 0, "medium": 1, "low": 2}
    all_issues: list[dict[str, Any]] = []
    for cat_name, cat_data in categories.items():
        for issue in cat_data.get("issues", []):
            all_issues.append({**issue, "category": cat_name})
    all_issues.sort(key=lambda x: severity_order.get(x.get("severity", "low"), 3))

    # Build flags list
    flags: list[str] = list(multiplier_flags)
    if gate_failed:
        flags.append("quality_gate_failed: score capped at 59")
    for gate_name, gate_result in gates.items():
        if not gate_result["passed"]:
            flags.append(f"GATE_FAIL: {gate_name}: {gate_result['detail']}")

    # Strip issues from category dicts for clean output
    clean_categories: dict[str, dict[str, Any]] = {}
    for cat_name, cat_data in categories.items():
        clean_categories[cat_name] = {
            "score": cat_data["score"],
            "max": cat_data["max"],
            "breakdown": cat_data.get("breakdown", {}),
        }

    return {
        "file": file_path.name,
        "path": str(file_path),
        "score": adjusted_total,
        "raw_score": raw_total,
        "grade": grade,
        "rating": rating,
        "quality_gates": {k: v["passed"] for k, v in gates.items()},
        "quality_gate_details": {k: v["detail"] for k, v in gates.items()},
        "categories": clean_categories,
        "flags": flags,
        "fixes": all_issues,
    }


# ---------------------------------------------------------------------------
# Output formatters
# ---------------------------------------------------------------------------


def _format_json(result: dict[str, Any]) -> str:
    """Format result as JSON."""
    return json.dumps(result, indent=2, ensure_ascii=False)


def _format_markdown(result: dict[str, Any]) -> str:
    """Format result as a visual markdown scorecard."""
    lines: list[str] = []
    lines.append(f"# Content Quality Score: {result['file']}")
    lines.append("")
    lines.append("```")
    lines.append(f"Content Quality Score (0-100)")
    lines.append("\u2501" * 40)

    # Categories
    cat_labels = {
        "hook_strength": ("Hook Strength", "25%"),
        "content_quality": ("Content Quality", "25%"),
        "caption_cta": ("Caption & CTA", "20%"),
        "format_compliance": ("Format Compliance", "15%"),
        "algorithm_signals": ("Algorithm Signals", "15%"),
    }

    for cat_key, (label, weight) in cat_labels.items():
        cat = result["categories"].get(cat_key, {})
        s = cat.get("score", 0)
        m = cat.get("max", 0)
        lines.append(f"{label:<22} ({weight}): {s:>2}/{m}")
        for sub_key, sub_val in cat.get("breakdown", {}).items():
            display_key = sub_key.replace("_", " ").title()
            lines.append(f"  [{'\u2713' if sub_val > 0 else ' '}] {display_key}: {sub_val}")
        lines.append("")

    # Quality gates
    lines.append("QUALITY GATES:")
    for gate_key, passed in result.get("quality_gates", {}).items():
        mark = "\u2713" if passed else "\u2717"
        detail = result.get("quality_gate_details", {}).get(gate_key, "")
        lines.append(f"  [{mark}] {gate_key}: {detail}")
    lines.append("")

    # Total
    lines.append(f"TOTAL: {result['score']}/100  [Grade: {result['grade']} | Action: {result['rating']}]")
    if result["raw_score"] != result["score"]:
        lines.append(f"  (Raw: {result['raw_score']}, adjusted by multipliers/gates)")
    lines.append("\u2501" * 40)
    lines.append("```")

    # Flags
    if result.get("flags"):
        lines.append("")
        lines.append("## Flags")
        for flag in result["flags"]:
            lines.append(f"- {flag}")

    # Fixes
    if result.get("fixes"):
        lines.append("")
        lines.append("## Revision Needed")
        for fix in result["fixes"]:
            severity = fix.get("severity", "").upper()
            cat = fix.get("category", "").replace("_", " ").title()
            lines.append(f"")
            lines.append(f"**[{severity}] {cat}**")
            lines.append(f"- Issue: {fix.get('issue', '')}")
            lines.append(f"- Fix: {fix.get('fix', '')}")

    return "\n".join(lines)


def _format_table_header() -> str:
    """Return table header for batch mode."""
    return (
        f"{'File':<35} {'Score':>5} {'Grade':>5} {'Rating':<16} "
        f"{'Hook':>4} {'Cont':>4} {'Capt':>4} {'Fmt':>4} {'Algo':>4} {'Gates':>5}"
    )


def _format_table_row(result: dict[str, Any]) -> str:
    """Format a single result as a compact table row."""
    cats = result["categories"]
    gates = result.get("quality_gates", {})
    gate_status = "PASS" if all(gates.values()) else "FAIL"
    return (
        f"{result['file']:<35} {result['score']:>5} {result['grade']:>5} {result['rating']:<16} "
        f"{cats.get('hook_strength', {}).get('score', 0):>4} "
        f"{cats.get('content_quality', {}).get('score', 0):>4} "
        f"{cats.get('caption_cta', {}).get('score', 0):>4} "
        f"{cats.get('format_compliance', {}).get('score', 0):>4} "
        f"{cats.get('algorithm_signals', {}).get('score', 0):>4} "
        f"{gate_status:>5}"
    )


def _format_fix(result: dict[str, Any]) -> str:
    """Format only the fixes for a result."""
    lines: list[str] = []
    lines.append(f"Fixes for: {result['file']} (Score: {result['score']}/100, {result['grade']})")
    lines.append("-" * 60)

    if not result.get("fixes"):
        lines.append("No fixes needed.")
        return "\n".join(lines)

    for i, fix in enumerate(result["fixes"], 1):
        severity = fix.get("severity", "").upper()
        cat = fix.get("category", "").replace("_", " ").title()
        lines.append(f"{i}. [{severity}] {cat}")
        lines.append(f"   Issue: {fix.get('issue', '')}")
        lines.append(f"   Fix:   {fix.get('fix', '')}")
        lines.append("")

    return "\n".join(lines)


def _format_category_detail(result: dict[str, Any], category: str) -> str:
    """Format detailed view of a single category."""
    # Map short names to internal keys
    key_map = {
        "hook": "hook_strength",
        "content": "content_quality",
        "caption": "caption_cta",
        "format": "format_compliance",
        "algorithm": "algorithm_signals",
    }
    cat_key = key_map.get(category, category)
    cat = result["categories"].get(cat_key)

    if not cat:
        return f"Category '{category}' not found. Available: {', '.join(key_map.keys())}"

    lines: list[str] = []
    lines.append(f"Category Detail: {cat_key.replace('_', ' ').title()}")
    lines.append(f"Score: {cat['score']}/{cat['max']}")
    lines.append("")

    lines.append("Breakdown:")
    for sub, val in cat.get("breakdown", {}).items():
        lines.append(f"  {sub.replace('_', ' ').title()}: {val}")

    # Find relevant fixes
    cat_fixes = [f for f in result.get("fixes", []) if f.get("category") == cat_key]
    if cat_fixes:
        lines.append("")
        lines.append("Issues:")
        for fix in cat_fixes:
            lines.append(f"  [{fix['severity'].upper()}] {fix['issue']}")
            lines.append(f"           Fix: {fix['fix']}")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    """Build the argument parser."""
    parser = argparse.ArgumentParser(
        description="Score Instagram content quality (5-category, 100-point rubric)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python score_content.py draft-reel.md
  python score_content.py draft-reel.md --format markdown
  python score_content.py drafts/ --batch --sort score
  python score_content.py draft-reel.md --fix
  python score_content.py draft-reel.md --category hook
        """,
    )
    parser.add_argument("target", help="File or directory to score")
    parser.add_argument("--batch", action="store_true",
                        help="Score all .md/.txt files in directory")
    parser.add_argument("--format", choices=["json", "markdown", "table"],
                        default="json", help="Output format (default: json)")
    parser.add_argument("--sort", choices=["score", "category", "name"],
                        default="score", help="Sort order for batch mode")
    parser.add_argument("--fix", action="store_true",
                        help="Show only fixes/recommendations")
    parser.add_argument("--category",
                        choices=["hook", "content", "caption", "format", "algorithm"],
                        help="Show detailed breakdown for a single category")
    return parser


def main(args: argparse.Namespace) -> None:
    """Main entry point."""
    _print_dependency_notice()

    target = Path(args.target)

    if not target.exists():
        print(f"Error: '{target}' not found", file=sys.stderr)
        sys.exit(1)

    # Collect files
    files: list[Path] = []
    if target.is_file():
        files = [target]
    elif target.is_dir():
        if not args.batch:
            print(
                f"Error: '{target}' is a directory. Use --batch to score all files.",
                file=sys.stderr,
            )
            sys.exit(1)
        files = sorted(
            [f for f in target.iterdir()
             if f.suffix.lower() in (".md", ".txt", ".markdown")],
            key=lambda f: f.name,
        )
        if not files:
            print(f"Error: No .md or .txt files found in '{target}'", file=sys.stderr)
            sys.exit(1)
    else:
        print(f"Error: '{target}' is neither a file nor a directory", file=sys.stderr)
        sys.exit(1)

    # Score all files
    results: list[dict[str, Any]] = []
    for f in files:
        print(f"Scoring: {f.name}...", file=sys.stderr)
        try:
            result = score_file(f)
            results.append(result)
        except Exception as e:
            print(f"Error scoring {f.name}: {e}", file=sys.stderr)

    if not results:
        print("Error: No files could be scored", file=sys.stderr)
        sys.exit(1)

    # Sort
    if args.sort == "score":
        results.sort(key=lambda r: r["score"], reverse=True)
    elif args.sort == "name":
        results.sort(key=lambda r: r["file"])

    # Output
    if args.fix:
        for r in results:
            print(_format_fix(r))
            if len(results) > 1:
                print()
    elif args.category:
        for r in results:
            print(_format_category_detail(r, args.category))
            if len(results) > 1:
                print()
    elif args.format == "json":
        if len(results) == 1:
            print(_format_json(results[0]))
        else:
            print(_format_json(results))
    elif args.format == "markdown":
        for r in results:
            print(_format_markdown(r))
            if len(results) > 1:
                print()
    elif args.format == "table":
        print(_format_table_header())
        print("-" * 100)
        for r in results:
            print(_format_table_row(r))
        print("-" * 100)
        avg_score = sum(r["score"] for r in results) / len(results)
        below_80 = sum(1 for r in results if r["score"] < 80)
        print(f"Files: {len(results)} | Avg: {avg_score:.0f} | Below 80: {below_80}")

    # Exit code
    all_above_80 = all(r["score"] >= 80 for r in results)
    sys.exit(0 if all_above_80 else 2)


if __name__ == "__main__":
    parser = build_parser()
    args = parser.parse_args()
    main(args)
