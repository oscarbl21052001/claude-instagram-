"""Tests for the Instagram post performance analyzer script (analysis functions only, no API calls)."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))

import analyze_post


# ---------------------------------------------------------------------------
# 1. Metric Calculations
# ---------------------------------------------------------------------------


class TestComputePostRates:
    def test_engagement_rate_calculation(self):
        post = {
            "metrics": {
                "likes": 450,
                "comments": 35,
                "saves": 120,
                "shares": 28,
                "reach": 5000,
            }
        }
        rates = analyze_post.compute_post_rates(post)
        # (450+35+120+28) / 5000 * 100 = 12.66%
        expected_engagement = round((450 + 35 + 120 + 28) / 5000 * 100, 2)
        assert rates["engagement"] == expected_engagement

    def test_save_rate_calculation(self):
        post = {
            "metrics": {
                "likes": 200,
                "comments": 10,
                "saves": 45,
                "shares": 5,
                "reach": 3000,
            }
        }
        rates = analyze_post.compute_post_rates(post)
        expected_save = round(45 / 3000 * 100, 2)
        assert rates["save"] == expected_save

    def test_share_rate_calculation(self):
        post = {
            "metrics": {
                "likes": 200,
                "comments": 10,
                "saves": 45,
                "shares": 30,
                "reach": 3000,
            }
        }
        rates = analyze_post.compute_post_rates(post)
        expected_share = round(30 / 3000 * 100, 2)
        assert rates["share"] == expected_share

    def test_comment_to_save_ratio(self):
        post = {
            "metrics": {
                "likes": 200,
                "comments": 50,
                "saves": 25,
                "shares": 5,
                "reach": 3000,
            }
        }
        rates = analyze_post.compute_post_rates(post)
        expected_c2s = round(50 / 25, 2)
        assert rates["comment_to_save_ratio"] == expected_c2s

    def test_zero_reach_handling(self):
        post = {
            "metrics": {
                "likes": 100,
                "comments": 10,
                "saves": 20,
                "shares": 5,
                "reach": 0,
            }
        }
        rates = analyze_post.compute_post_rates(post)
        assert rates["engagement"] == 0.0
        assert rates["save"] == 0.0
        assert rates["share"] == 0.0


# ---------------------------------------------------------------------------
# 2. Performance Scoring
# ---------------------------------------------------------------------------


class TestPerformanceScoring:
    def test_score_high_performer(self, sample_json_posts):
        """Post 3 (carousel) has high saves and shares, should score well."""
        post = sample_json_posts[2]  # carousel with 200 saves, 8000 reach
        avg_reach = 5000.0
        rates = analyze_post.compute_post_rates(post)
        avg_rates = {"engagement": 8.0, "save": 2.0, "share": 1.0}
        result = analyze_post.score_post(post, avg_reach, avg_rates)
        assert result["score"] >= 60
        assert result["tier"] in ("Flagship", "Strong performer", "Average")

    def test_score_average_post(self, sample_json_posts):
        """Post 2 (image) has moderate metrics."""
        post = sample_json_posts[1]
        avg_reach = 5000.0
        rates = analyze_post.compute_post_rates(post)
        avg_rates = {"engagement": 8.0, "save": 2.0, "share": 1.0}
        result = analyze_post.score_post(post, avg_reach, avg_rates)
        assert result["score"] >= 0
        assert result["tier"] is not None

    def test_score_underperformer(self):
        """Post with zero reach and minimal engagement."""
        post = {
            "type": "IMAGE",
            "metrics": {
                "likes": 5,
                "comments": 0,
                "saves": 0,
                "shares": 0,
                "reach": 0,
            },
        }
        avg_reach = 5000.0
        avg_rates = {"engagement": 8.0, "save": 2.0, "share": 1.0}
        result = analyze_post.score_post(post, avg_reach, avg_rates)
        assert result["score"] < 40
        assert result["tier"] == "Underperformer"

    def test_score_controversy_flag(self, sample_json_posts):
        """Post 4 has many comments and few saves (controversy risk)."""
        post = sample_json_posts[3]  # 150 comments, 10 saves
        avg_reach = 5000.0
        avg_rates = {"engagement": 8.0, "save": 2.0, "share": 1.0}
        result = analyze_post.score_post(post, avg_reach, avg_rates)
        rates = result["rates"]
        assert rates["comment_to_save_ratio"] > 2.0
        assert "controversy_risk" in result["flags"]


# ---------------------------------------------------------------------------
# 3. Individual Score Categories
# ---------------------------------------------------------------------------


class TestScoreCategories:
    def test_reach_distribution_above_average(self, sample_json_posts):
        post = sample_json_posts[2]  # 8000 reach
        avg_reach = 5000.0
        score, details = analyze_post.score_reach_distribution(post, avg_reach)
        assert score > 13  # above average should score 13+
        assert len(details) >= 1

    def test_reach_distribution_no_data(self):
        post = {"metrics": {"reach": 0}}
        score, details = analyze_post.score_reach_distribution(post, 5000.0)
        assert score == 0.0

    def test_engagement_quality_high_saves(self, sample_json_posts):
        post = sample_json_posts[2]  # 200 saves, 8000 reach
        rates = analyze_post.compute_post_rates(post)
        avg_rates = {"engagement": 5.0, "save": 1.0, "share": 0.5}
        score, details = analyze_post.score_engagement_quality(post, rates, avg_rates)
        assert score > 10

    def test_watch_time_reel(self, sample_json_posts):
        post = sample_json_posts[0]  # REEL with avg_watch_time 22.5
        score, details = analyze_post.score_watch_time(post)
        assert score >= 16.0  # 22.5s >= 20 should score 16+

    def test_watch_time_non_video(self, sample_json_posts):
        post = sample_json_posts[1]  # IMAGE
        score, details = analyze_post.score_watch_time(post)
        assert score == 12.0  # neutral score for non-video

    def test_audience_growth_estimated(self, sample_json_posts):
        post = sample_json_posts[2]  # high saves + shares
        score, details = analyze_post.score_audience_growth(post)
        assert score > 0

    def test_content_signals_balanced(self, sample_json_posts):
        post = sample_json_posts[0]  # 35 comments, 120 saves
        rates = analyze_post.compute_post_rates(post)
        score, details = analyze_post.score_content_signals(post, rates)
        assert score > 0


# ---------------------------------------------------------------------------
# 4. Account Summary
# ---------------------------------------------------------------------------


class TestAccountSummary:
    def _score_all(self, posts):
        """Helper to score all posts and return scored list."""
        avg_reach = sum(p["metrics"]["reach"] for p in posts) / len(posts)
        all_rates = [analyze_post.compute_post_rates(p) for p in posts]
        avg_rates = {
            "engagement": sum(r["engagement"] for r in all_rates) / len(all_rates),
            "save": sum(r["save"] for r in all_rates) / len(all_rates),
            "share": sum(r["share"] for r in all_rates) / len(all_rates),
        }
        scored = [analyze_post.score_post(p, avg_reach, avg_rates) for p in posts]
        return scored, avg_reach, avg_rates

    def test_content_type_distribution(self, sample_json_posts):
        scored, _, _ = self._score_all(sample_json_posts)
        summary = analyze_post.compute_account_summary(sample_json_posts, scored)
        breakdown = summary["content_type_breakdown"]
        assert breakdown["REEL"] == 2
        assert breakdown["IMAGE"] == 1
        assert breakdown["CAROUSEL_ALBUM"] == 1

    def test_best_day_detection(self, sample_json_posts):
        scored, _, _ = self._score_all(sample_json_posts)
        summary = analyze_post.compute_account_summary(sample_json_posts, scored)
        # best_day should be one of the valid day names
        assert summary["best_day"] in analyze_post.DAY_NAMES

    def test_posting_frequency(self, sample_json_posts):
        scored, _, _ = self._score_all(sample_json_posts)
        summary = analyze_post.compute_account_summary(sample_json_posts, scored)
        freq = summary["posting_frequency"]
        assert "/week" in freq
        # Parse the numeric part
        freq_val = float(freq.replace("/week", ""))
        assert freq_val > 0


# ---------------------------------------------------------------------------
# 5. Data Normalization
# ---------------------------------------------------------------------------


class TestDataNormalization:
    def test_normalize_graph_api_post(self):
        """Graph API raw format (without insights) should normalize."""
        raw = [
            {
                "id": "12345",
                "permalink": "https://instagram.com/p/ABC",
                "media_type": "REEL",
                "timestamp": "2026-03-01T10:00:00+0000",
                "caption": "Test caption",
                "like_count": 100,
                "comments_count": 10,
            }
        ]
        posts = analyze_post._normalize_post_list(raw)
        assert len(posts) == 1
        p = posts[0]
        assert p["id"] == "12345"
        assert p["type"] == "REEL"
        assert p["metrics"]["likes"] == 100
        assert p["metrics"]["comments"] == 10

    def test_normalize_apify_post(self):
        """Apify format should normalize."""
        raw = [
            {
                "id": "apify_001",
                "shortCode": "XYZABC",
                "url": "https://instagram.com/p/XYZABC",
                "isVideo": True,
                "timestamp": "2026-03-01T10:00:00+0000",
                "caption": "Test from Apify",
                "likesCount": 200,
                "commentsCount": 15,
                "videoViewCount": 5000,
            }
        ]
        posts = analyze_post._normalize_post_list(raw)
        assert len(posts) == 1
        p = posts[0]
        assert p["type"] == "REEL"
        assert p["metrics"]["likes"] == 200
        assert p["metrics"]["comments"] == 15
        assert p["metrics"]["video_views"] == 5000

    def test_normalize_file_post(self):
        """Internal format (already has 'metrics' dict) should pass through."""
        raw = [
            {
                "id": "internal_001",
                "type": "IMAGE",
                "timestamp": "2026-03-01T10:00:00+0000",
                "caption": "Already formatted",
                "metrics": {
                    "likes": 300,
                    "comments": 20,
                    "saves": 50,
                    "shares": 10,
                    "reach": 4000,
                },
            }
        ]
        posts = analyze_post._normalize_post_list(raw)
        assert len(posts) == 1
        p = posts[0]
        assert p["metrics"]["likes"] == 300
        assert p["metrics"]["saves"] == 50


# ---------------------------------------------------------------------------
# 6. Tier Labels
# ---------------------------------------------------------------------------


class TestTierLabels:
    def test_flagship(self):
        assert analyze_post._tier_label(92) == "Flagship"

    def test_strong(self):
        assert analyze_post._tier_label(85) == "Strong performer"

    def test_average(self):
        assert analyze_post._tier_label(65) == "Average"

    def test_below_standard(self):
        assert analyze_post._tier_label(45) == "Below standard"

    def test_underperformer(self):
        assert analyze_post._tier_label(30) == "Underperformer"


# ---------------------------------------------------------------------------
# 7. Helper Functions
# ---------------------------------------------------------------------------


class TestHelpers:
    def test_safe_div_normal(self):
        assert analyze_post._safe_div(10, 5) == 2.0

    def test_safe_div_zero_denominator(self):
        assert analyze_post._safe_div(10, 0) == 0.0

    def test_safe_div_custom_default(self):
        assert analyze_post._safe_div(10, 0, default=-1.0) == -1.0

    def test_clamp(self):
        assert analyze_post._clamp(150, 0, 100) == 100.0
        assert analyze_post._clamp(-5, 0, 100) == 0.0
        assert analyze_post._clamp(50, 0, 100) == 50.0

    def test_caption_preview_short(self):
        assert analyze_post._caption_preview("Short caption") == "Short caption"

    def test_caption_preview_long(self):
        long = "A" * 200
        preview = analyze_post._caption_preview(long, length=100)
        assert len(preview) == 103  # 100 chars + "..."
        assert preview.endswith("...")

    def test_caption_preview_none(self):
        assert analyze_post._caption_preview(None) == ""

    def test_short_type(self):
        assert analyze_post._short_type("CAROUSEL_ALBUM") == "CARO"
        assert analyze_post._short_type("IMAGE") == "IMG"
        assert analyze_post._short_type("REEL") == "REEL"
