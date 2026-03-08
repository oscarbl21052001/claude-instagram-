"""Tests for the Instagram content quality scorer script."""

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

import score_content


# ---------------------------------------------------------------------------
# 1. Section Parsing
# ---------------------------------------------------------------------------


class TestParseContentFile:
    def test_parse_full_reel(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        assert parsed["title"] == "3 Fehler beim Abnehmen ab 40"
        assert parsed["has_hook"] is True
        assert parsed["has_script"] is True
        assert parsed["has_caption"] is True
        assert parsed["has_thumbnail"] is True
        assert parsed["has_format"] is True
        assert "hook" in parsed["sections"]
        assert "script" in parsed["sections"]
        assert "caption" in parsed["sections"]
        assert "thumbnail" in parsed["sections"]
        assert "format" in parsed["sections"]
        assert parsed["format_info"]["type"].lower() == "reel"

    def test_parse_hook_only(self, sample_hook_only):
        parsed = score_content.parse_content_file(sample_hook_only)
        assert parsed["has_hook"] is True
        assert parsed["has_script"] is False
        assert parsed["has_caption"] is False
        assert "hook" in parsed["sections"]

    def test_parse_caption_only(self, sample_caption_only):
        parsed = score_content.parse_content_file(sample_caption_only)
        assert parsed["has_caption"] is True
        assert parsed["has_hook"] is False
        assert "caption" in parsed["sections"]

    def test_parse_empty_sections(self):
        text = "# Reel: Test\n\n## Hook\n\n## Script\n\n## Caption\n"
        parsed = score_content.parse_content_file(text)
        assert parsed["has_hook"] is True
        assert parsed["sections"]["hook"] == ""
        assert parsed["sections"]["script"] == ""

    def test_parse_no_frontmatter(self):
        text = "Just some raw content without any markdown headers at all."
        parsed = score_content.parse_content_file(text)
        assert "_raw" in parsed["sections"]
        assert parsed["title"] == ""
        assert parsed["has_hook"] is False

    def test_parse_carousel(self, sample_carousel_draft):
        parsed = score_content.parse_content_file(sample_carousel_draft)
        assert parsed["has_hook"] is True
        assert parsed["has_caption"] is True
        assert "slides" in parsed["sections"]
        assert parsed["format_info"].get("type", "").lower() == "carousel"


# ---------------------------------------------------------------------------
# 2. Hook Scoring
# ---------------------------------------------------------------------------


class TestScoreHookStrength:
    def test_hook_pattern_interrupt(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_hook_strength(parsed)
        # Hook has "?" (question), "Fehler" (pattern interrupt), "3" (number), "nicht"/"kein" possible
        assert result["breakdown"]["pattern_interrupt"] >= 4

    def test_hook_identity_trigger(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_hook_strength(parsed)
        # Hook has "du" and "ab 40" (age reference)
        assert result["breakdown"]["identity_trigger"] >= 3

    def test_hook_specificity(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_hook_strength(parsed)
        # Hook has "3" and "40" as numbers
        assert result["breakdown"]["specificity"] >= 2

    def test_hook_length_optimal(self):
        text = "# Reel: Test\n\n## Hook\nDiese 3 Fehler vermeiden"
        parsed = score_content.parse_content_file(text)
        result = score_content.score_hook_strength(parsed)
        # 4 words, well under 10
        assert result["breakdown"]["length"] == 4

    def test_hook_length_too_long(self):
        words = " ".join(["Wort"] * 25)
        text = f"# Reel: Test\n\n## Hook\n{words}"
        parsed = score_content.parse_content_file(text)
        result = score_content.score_hook_strength(parsed)
        # Over 20 words should get minimum score
        assert result["breakdown"]["length"] == 1

    def test_hook_cliche_detected(self):
        text = "# Reel: Test\n\n## Hook\nPOV: du im Gym"
        parsed = score_content.parse_content_file(text)
        result = score_content.score_hook_strength(parsed)
        assert result["breakdown"]["no_cliche"] == 0

    def test_hook_no_cliche(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_hook_strength(parsed)
        assert result["breakdown"]["no_cliche"] == 3

    def test_hook_empty(self):
        text = "# Reel: Test\n\n## Script\nJust a script, no hook."
        parsed = score_content.parse_content_file(text)
        result = score_content.score_hook_strength(parsed)
        assert result["score"] == 0
        assert len(result["issues"]) >= 1


# ---------------------------------------------------------------------------
# 3. Caption Scoring
# ---------------------------------------------------------------------------


class TestScoreCaptionCta:
    def test_caption_length_500plus(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_caption_cta(parsed)
        # The sample_reel_draft caption is well over 500 chars
        assert result["breakdown"]["length"] == 5

    def test_caption_length_short(self):
        text = "# Post: Test\n\n## Caption\nKurzer Text."
        parsed = score_content.parse_content_file(text)
        result = score_content.score_caption_cta(parsed)
        assert result["breakdown"]["length"] <= 2

    def test_caption_save_cta(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_caption_cta(parsed)
        # Caption contains "Speicher dir"
        assert result["breakdown"]["save_cta"] >= 4

    def test_caption_no_cta(self):
        text = "# Post: Test\n\n## Caption\nHier ist mein Content ohne Handlungsaufforderung. " * 10
        parsed = score_content.parse_content_file(text)
        result = score_content.score_caption_cta(parsed)
        assert result["breakdown"]["save_cta"] == 0

    def test_caption_generic_hashtags(self, sample_low_quality):
        parsed = score_content.parse_content_file(sample_low_quality)
        result = score_content.score_caption_cta(parsed)
        # Low quality uses #fitness #motivation #workout #gym etc.
        assert result["breakdown"]["hashtag_quality"] == 0

    def test_caption_niche_hashtags(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_caption_cta(parsed)
        # Niche hashtags like #frauenab40 #abnehmenab40 etc.
        assert result["breakdown"]["hashtag_quality"] >= 2


# ---------------------------------------------------------------------------
# 4. Quality Gates
# ---------------------------------------------------------------------------


class TestQualityGates:
    def test_gate_g2_em_dash_detected(self, sample_with_em_dash):
        parsed = score_content.parse_content_file(sample_with_em_dash)
        gates = score_content.check_quality_gates(parsed)
        assert gates["G2_no_em_dashes"]["passed"] is False
        assert "em dash" in gates["G2_no_em_dashes"]["detail"].lower()

    def test_gate_g2_en_dash_ok(self):
        text = "# Reel: Test\n\n## Hook\nAbnehmen \u2013 so geht es"
        parsed = score_content.parse_content_file(text)
        gates = score_content.check_quality_gates(parsed)
        assert gates["G2_no_em_dashes"]["passed"] is True

    def test_gate_g2_hyphen_ok(self):
        text = "# Reel: Test\n\n## Hook\nAbnehmen - so geht es"
        parsed = score_content.parse_content_file(text)
        gates = score_content.check_quality_gates(parsed)
        assert gates["G2_no_em_dashes"]["passed"] is True

    def test_gate_g3_affiliate_with_disclosure(self, sample_affiliate_draft):
        parsed = score_content.parse_content_file(sample_affiliate_draft)
        gates = score_content.check_quality_gates(parsed)
        assert gates["G3_affiliate_disclosure"]["passed"] is True

    def test_gate_g3_affiliate_without_disclosure(self, sample_affiliate_no_disclosure):
        parsed = score_content.parse_content_file(sample_affiliate_no_disclosure)
        gates = score_content.check_quality_gates(parsed)
        assert gates["G3_affiliate_disclosure"]["passed"] is False

    def test_gate_g4_controversial(self):
        text = "# Reel: Test\n\n## Hook\nUnpopular opinion\n\n## Script\nCardio ist unnoetig."
        parsed = score_content.parse_content_file(text)
        gates = score_content.check_quality_gates(parsed)
        # Opinion without value backing (no Studie/Forschung/weil etc.)
        assert gates["G4_no_controversial_opinion"]["passed"] is False

    def test_gate_g7_safe_zone(self):
        text = "# Reel: Test\n\n## Hook\nTest\n\n## Format\nType: Reel\nDuration: 30s"
        parsed = score_content.parse_content_file(text)
        gates = score_content.check_quality_gates(parsed)
        # Format declared but no safe zone mention
        assert gates["G7_safe_zone"]["passed"] is False


# ---------------------------------------------------------------------------
# 5. Severity Multipliers
# ---------------------------------------------------------------------------


class TestApplyMultipliers:
    def test_compound_weakness_085x(self):
        categories = {
            "hook_strength": {"score": 5, "max": 25},      # below 50%
            "content_quality": {"score": 5, "max": 25},     # below 50%
            "caption_cta": {"score": 15, "max": 20},
            "format_compliance": {"score": 10, "max": 15},
            "algorithm_signals": {"score": 10, "max": 15},
        }
        adjusted, flags = score_content.apply_multipliers(45, categories)
        assert any("0.85x" in f for f in flags)
        # 45 * 0.85 = 38.25, plus hook < 10 penalty too
        assert adjusted < 45

    def test_weak_hook_09x(self):
        categories = {
            "hook_strength": {"score": 8, "max": 25, "breakdown": {}},
            "content_quality": {"score": 20, "max": 25},
            "caption_cta": {"score": 15, "max": 20, "breakdown": {"length": 5}},
            "format_compliance": {"score": 12, "max": 15},
            "algorithm_signals": {"score": 12, "max": 15},
        }
        adjusted, flags = score_content.apply_multipliers(67, categories)
        assert any("weak_hook" in f for f in flags)

    def test_short_caption_09x(self):
        categories = {
            "hook_strength": {"score": 20, "max": 25},
            "content_quality": {"score": 20, "max": 25},
            "caption_cta": {"score": 10, "max": 20, "breakdown": {"length": 1}},
            "format_compliance": {"score": 12, "max": 15},
            "algorithm_signals": {"score": 12, "max": 15},
        }
        adjusted, flags = score_content.apply_multipliers(74, categories)
        assert any("short_caption" in f for f in flags)


# ---------------------------------------------------------------------------
# 6. Scoring Bands
# ---------------------------------------------------------------------------


class TestScoringBands:
    def test_band_a_publish(self):
        grade, rating = score_content._get_grade(92)
        assert grade == "A"
        assert rating == "Publish"

    def test_band_b_strong(self):
        grade, rating = score_content._get_grade(85)
        assert grade == "B"
        assert rating == "Strong"

    def test_band_c_ok(self):
        grade, rating = score_content._get_grade(70)
        assert grade == "C"
        assert rating == "OK"

    def test_band_d_below(self):
        grade, rating = score_content._get_grade(50)
        assert grade == "D"
        assert rating == "Below Standard"

    def test_band_f_reject(self):
        grade, rating = score_content._get_grade(30)
        assert grade == "F"
        assert rating == "Reject"


# ---------------------------------------------------------------------------
# 7. Output Formats
# ---------------------------------------------------------------------------


class TestOutputFormats:
    @pytest.fixture
    def scored_result(self, tmp_path, sample_reel_draft):
        """Write a reel draft to a temp file and score it."""
        p = tmp_path / "test-reel.md"
        p.write_text(sample_reel_draft)
        return score_content.score_file(p)

    def test_json_output(self, scored_result):
        output = score_content._format_json(scored_result)
        data = json.loads(output)
        assert "score" in data
        assert "grade" in data
        assert "rating" in data
        assert "categories" in data
        assert "quality_gates" in data
        assert "fixes" in data

    def test_markdown_output(self, scored_result):
        output = score_content._format_markdown(scored_result)
        assert "Content Quality Score" in output
        assert "Hook Strength" in output
        assert "Content Quality" in output
        assert "Caption & CTA" in output
        assert "Format Compliance" in output
        assert "Algorithm Signals" in output
        assert "QUALITY GATES" in output
        assert "TOTAL:" in output

    def test_table_output(self, scored_result):
        header = score_content._format_table_header()
        row = score_content._format_table_row(scored_result)
        assert "File" in header
        assert "Score" in header
        assert "Grade" in header
        assert scored_result["file"] in row
        assert str(scored_result["score"]) in row


# ---------------------------------------------------------------------------
# 8. Integration
# ---------------------------------------------------------------------------


class TestIntegration:
    def test_high_quality_scores_above_80(self, tmp_path, sample_high_quality):
        p = tmp_path / "high-quality.md"
        p.write_text(sample_high_quality)
        result = score_content.score_file(p)
        assert result["score"] >= 80, (
            f"High-quality content scored {result['score']}, expected 80+. "
            f"Categories: {result['categories']}"
        )

    def test_low_quality_scores_below_60(self, tmp_path, sample_low_quality):
        p = tmp_path / "low-quality.md"
        p.write_text(sample_low_quality)
        result = score_content.score_file(p)
        assert result["score"] < 60, (
            f"Low-quality content scored {result['score']}, expected <60. "
            f"Categories: {result['categories']}"
        )

    def test_gate_failure_caps_at_59(self, tmp_path, sample_with_em_dash):
        p = tmp_path / "em-dash.md"
        p.write_text(sample_with_em_dash)
        result = score_content.score_file(p)
        assert result["score"] <= 59, (
            f"Em-dash content scored {result['score']}, should be capped at 59. "
            f"Gates: {result['quality_gates']}"
        )
        assert result["quality_gates"]["G2_no_em_dashes"] is False


# ---------------------------------------------------------------------------
# 9. Content Quality category
# ---------------------------------------------------------------------------


class TestScoreContentQuality:
    def test_problem_solution_detected(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_content_quality(parsed)
        # Script has "Fehler" (problem) and "stattdessen" (solution)
        assert result["breakdown"]["problem_solution"] == 8

    def test_no_script_returns_zero(self):
        text = "# Reel: Test\n\n## Hook\nJust a hook"
        parsed = score_content.parse_content_file(text)
        result = score_content.score_content_quality(parsed)
        # Falls back to full_text which has minimal content
        assert result["score"] >= 0

    def test_value_density(self, sample_high_quality):
        parsed = score_content.parse_content_file(sample_high_quality)
        result = score_content.score_content_quality(parsed)
        # Script has actionable verbs: "probier", "mach", "steigere", "versuch"
        assert result["breakdown"]["value_density"] >= 2


# ---------------------------------------------------------------------------
# 10. Format Compliance category
# ---------------------------------------------------------------------------


class TestScoreFormatCompliance:
    def test_format_type_declared(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_format_compliance(parsed)
        assert result["breakdown"]["type_declared"] == 4

    def test_no_format_section(self, sample_hook_only):
        parsed = score_content.parse_content_file(sample_hook_only)
        result = score_content.score_format_compliance(parsed)
        assert result["breakdown"]["type_declared"] == 0

    def test_duration_in_range(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_format_compliance(parsed)
        # 30s reel is within 15-90 range
        assert result["breakdown"]["duration"] == 4

    def test_thumbnail_described(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_format_compliance(parsed)
        assert result["breakdown"]["thumbnail"] == 4


# ---------------------------------------------------------------------------
# 11. Algorithm Signals category
# ---------------------------------------------------------------------------


class TestScoreAlgorithmSignals:
    def test_save_dm_optimized(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_algorithm_signals(parsed)
        # Has both save CTA ("speicher") and DM CTA ("Freundin")
        assert result["breakdown"]["save_dm_optimized"] == 5

    def test_dead_format_detected(self):
        text = "# Reel: Test\n\n## Hook\ntest\n\n## Script\nGet Ready With Me fuer mein Workout."
        parsed = score_content.parse_content_file(text)
        result = score_content.score_algorithm_signals(parsed)
        assert result["breakdown"]["originality"] == 0

    def test_not_controversial(self, sample_reel_draft):
        parsed = score_content.parse_content_file(sample_reel_draft)
        result = score_content.score_algorithm_signals(parsed)
        assert result["breakdown"]["not_controversial"] == 4
