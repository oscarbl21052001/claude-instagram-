#!/usr/bin/env python3
"""
Instagram Post Performance Analyzer — 5-Category, 100-Point Scoring System

Analyzes Instagram post performance using the Instagram Graph API (primary)
or Apify Instagram Scraper (fallback). Returns structured JSON, markdown
reports, or compact tables.

Usage:
    python analyze_post.py --user-id 123 --token <token>                   # Graph API
    python analyze_post.py --username handle --apify-token <token>         # Apify fallback
    python analyze_post.py --input posts.json                              # From saved JSON
    python analyze_post.py --post-id 456 --token <token>                   # Single post
    python analyze_post.py --user-id 123 --format markdown --top 5         # Markdown top 5
    python analyze_post.py --input posts.json --sort saves --format table  # Table by saves

Scoring (per post, 0-100):
    Reach & Distribution   25 pts   Reach vs average, non-follower reach %
    Engagement Quality     25 pts   Save rate, share rate, engagement rate
    Watch Time             20 pts   Avg watch time, completion rate (Reels only)
    Audience Growth        15 pts   Profile visits, follows from post
    Content Signals        15 pts   Comment-to-save ratio, controversy check

Bands:
    90-100  Flagship (replicate this format)
    80-89   Strong performer
    60-79   Average (identify improvement areas)
    40-59   Below standard (specific fixes needed)
    <40     Underperformer (analyze why)

Optional dependencies (graceful degradation):
    pip install apify-client python-dotenv
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
import urllib.parse
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

# ---------------------------------------------------------------------------
# Optional dependency detection
# ---------------------------------------------------------------------------

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed, rely on environment variables

try:
    from apify_client import ApifyClient
    HAS_APIFY = True
except ImportError:
    HAS_APIFY = False

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

GRAPH_API_BASE = "https://graph.facebook.com/v21.0"

# Metrics requested from the insights endpoint (plays/impressions NOT supported)
MEDIA_INSIGHTS_METRICS = [
    "reach", "saved", "shares", "likes", "comments",
    "total_interactions",
]
REEL_EXTRA_METRICS = ["ig_reels_avg_watch_time"]

ACCOUNT_INSIGHTS_METRICS = ["reach", "follower_count", "total_interactions"]

MEDIA_FIELDS = (
    "id,caption,media_type,media_url,thumbnail_url,"
    "timestamp,like_count,comments_count,permalink"
)

SORT_KEYS = {"score", "reach", "saves", "engagement"}
FORMAT_CHOICES = {"json", "markdown", "table"}

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _log(msg: str) -> None:
    """Print progress/status to stderr so stdout stays clean for results."""
    print(msg, file=sys.stderr)


def _api_get(url: str) -> dict[str, Any]:
    """Execute a GET request and return parsed JSON. Raises on HTTP errors."""
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as exc:
        body = exc.read().decode() if exc.fp else ""
        raise RuntimeError(
            f"Graph API error {exc.code}: {body[:500]}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"Network error: {exc.reason}") from exc


def _clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def _safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    return numerator / denominator if denominator else default


def _short_type(media_type: str) -> str:
    """Abbreviate media type for compact display."""
    return {"CAROUSEL_ALBUM": "CARO", "IMAGE": "IMG", "REEL": "REEL", "VIDEO": "VID"}.get(media_type, media_type[:4])


def _caption_preview(caption: Optional[str], length: int = 100) -> str:
    if not caption:
        return ""
    clean = caption.replace("\n", " ").strip()
    if len(clean) <= length:
        return clean
    return clean[:length] + "..."


def _tier_label(score: float) -> str:
    if score >= 90:
        return "Flagship"
    if score >= 80:
        return "Strong performer"
    if score >= 60:
        return "Average"
    if score >= 40:
        return "Below standard"
    return "Underperformer"


# ---------------------------------------------------------------------------
# Data fetching: Graph API
# ---------------------------------------------------------------------------


def fetch_account_info(user_id: str, token: str) -> dict[str, Any]:
    """Fetch basic account info via Graph API."""
    fields = "id,username,media_count,followers_count,follows_count"
    url = f"{GRAPH_API_BASE}/{user_id}?fields={fields}&access_token={token}"
    _log(f"Fetching account info for user {user_id}...")
    data = _api_get(url)
    return {
        "id": data.get("id", user_id),
        "username": data.get("username", ""),
        "media_count": data.get("media_count", 0),
        "followers": data.get("followers_count", 0),
        "follows": data.get("follows_count", 0),
    }


def fetch_media_list(
    user_id: str, token: str, limit: int = 50
) -> list[dict[str, Any]]:
    """Fetch recent media from the Graph API, handling pagination."""
    posts: list[dict[str, Any]] = []
    url = (
        f"{GRAPH_API_BASE}/{user_id}/media"
        f"?fields={MEDIA_FIELDS}&limit={min(limit, 100)}&access_token={token}"
    )
    while url and len(posts) < limit:
        _log(f"  Fetching media page ({len(posts)} so far)...")
        data = _api_get(url)
        items = data.get("data", [])
        if not items:
            break
        posts.extend(items)
        paging = data.get("paging", {})
        url = paging.get("next") if len(posts) < limit else None

    return posts[:limit]


def fetch_media_insights(
    media_id: str, media_type: str, token: str
) -> dict[str, Any]:
    """Fetch insights for a single media object."""
    metrics = list(MEDIA_INSIGHTS_METRICS)
    if media_type == "REEL" or media_type == "VIDEO":
        metrics.extend(REEL_EXTRA_METRICS)

    metric_str = ",".join(metrics)
    url = (
        f"{GRAPH_API_BASE}/{media_id}/insights"
        f"?metric={metric_str}&access_token={token}"
    )
    try:
        data = _api_get(url)
    except RuntimeError as exc:
        _log(f"  Warning: Could not fetch insights for {media_id}: {exc}")
        return {}

    result: dict[str, Any] = {}
    for entry in data.get("data", []):
        name = entry.get("name", "")
        values = entry.get("values", [])
        if values:
            result[name] = values[0].get("value", 0)
    return result


def fetch_posts_graph_api(
    user_id: str,
    token: str,
    limit: int = 50,
    days: Optional[int] = None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """
    Full Graph API fetch: account info + media list + per-post insights.
    Returns (account_info, posts_with_insights).
    """
    account = fetch_account_info(user_id, token)
    raw_posts = fetch_media_list(user_id, token, limit)

    # Filter by date if requested
    if days:
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
        raw_posts = [
            p for p in raw_posts
            if _parse_timestamp(p.get("timestamp", "")) >= cutoff
        ]

    _log(f"Fetching insights for {len(raw_posts)} posts...")
    posts: list[dict[str, Any]] = []
    for i, post in enumerate(raw_posts):
        media_id = post["id"]
        media_type = post.get("media_type", "IMAGE")
        insights = fetch_media_insights(media_id, media_type, token)

        combined = {
            "id": media_id,
            "permalink": post.get("permalink", ""),
            "type": media_type,
            "timestamp": post.get("timestamp", ""),
            "caption": post.get("caption", ""),
            "media_url": post.get("media_url", ""),
            "thumbnail_url": post.get("thumbnail_url", ""),
            "metrics": {
                "likes": insights.get("likes", post.get("like_count", 0)),
                "comments": insights.get("comments", post.get("comments_count", 0)),
                "saves": insights.get("saved", 0),
                "shares": insights.get("shares", 0),
                "reach": insights.get("reach", 0),
                "total_interactions": insights.get("total_interactions", 0),
            },
        }
        if "ig_reels_avg_watch_time" in insights:
            combined["metrics"]["avg_watch_time"] = insights["ig_reels_avg_watch_time"]

        posts.append(combined)
        if (i + 1) % 10 == 0:
            _log(f"  Processed {i + 1}/{len(raw_posts)} posts")

    _log(f"Fetched {len(posts)} posts with insights.")
    return account, posts


def fetch_single_post_graph_api(
    post_id: str, token: str
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Fetch a single post by ID via Graph API."""
    url = (
        f"{GRAPH_API_BASE}/{post_id}"
        f"?fields={MEDIA_FIELDS}&access_token={token}"
    )
    _log(f"Fetching post {post_id}...")
    post = _api_get(url)
    media_type = post.get("media_type", "IMAGE")
    insights = fetch_media_insights(post_id, media_type, token)

    combined = {
        "id": post_id,
        "permalink": post.get("permalink", ""),
        "type": media_type,
        "timestamp": post.get("timestamp", ""),
        "caption": post.get("caption", ""),
        "media_url": post.get("media_url", ""),
        "thumbnail_url": post.get("thumbnail_url", ""),
        "metrics": {
            "likes": insights.get("likes", post.get("like_count", 0)),
            "comments": insights.get("comments", post.get("comments_count", 0)),
            "saves": insights.get("saved", 0),
            "shares": insights.get("shares", 0),
            "reach": insights.get("reach", 0),
            "total_interactions": insights.get("total_interactions", 0),
        },
    }
    if "ig_reels_avg_watch_time" in insights:
        combined["metrics"]["avg_watch_time"] = insights["ig_reels_avg_watch_time"]

    account: dict[str, Any] = {"id": "", "username": "", "media_count": 0, "followers": 0}
    return account, [combined]


# ---------------------------------------------------------------------------
# Data fetching: Apify fallback
# ---------------------------------------------------------------------------


def fetch_posts_apify(
    username: str,
    apify_token: str,
    limit: int = 50,
    days: Optional[int] = None,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Fetch posts via Apify Instagram Scraper as fallback."""
    if not HAS_APIFY:
        raise RuntimeError(
            "apify-client not installed. Run: pip install apify-client"
        )

    client = ApifyClient(apify_token)

    # Fetch profile data
    _log(f"Fetching profile for @{username} via Apify...")
    profile_run = client.actor("apify/instagram-profile-scraper").call(
        run_input={"usernames": [username]}
    )
    account: dict[str, Any] = {"id": "", "username": username, "media_count": 0, "followers": 0}
    for item in client.dataset(profile_run["defaultDatasetId"]).iterate_items():
        account = {
            "id": item.get("id", ""),
            "username": item.get("username", username),
            "media_count": item.get("postsCount", 0),
            "followers": item.get("followersCount", 0),
            "follows": item.get("followingCount", 0),
        }
        break

    # Fetch posts
    _log(f"Fetching posts for @{username} via Apify...")
    start_date = ""
    if days:
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")

    run_input: dict[str, Any] = {
        "directUrls": [f"https://www.instagram.com/{username}/"],
        "resultsType": "posts",
        "resultsLimit": limit,
    }
    if start_date:
        run_input["onlyPostsNewerThan"] = start_date

    run = client.actor("apify/instagram-scraper").call(run_input=run_input)

    posts: list[dict[str, Any]] = []
    for item in client.dataset(run["defaultDatasetId"]).iterate_items():
        post = {
            "id": item.get("id", item.get("shortCode", "")),
            "permalink": item.get("url", ""),
            "type": _apify_type(item),
            "timestamp": item.get("timestamp", ""),
            "caption": item.get("caption", ""),
            "media_url": item.get("displayUrl", ""),
            "thumbnail_url": item.get("displayUrl", ""),
            "metrics": {
                "likes": item.get("likesCount", 0),
                "comments": item.get("commentsCount", 0),
                "saves": 0,  # not available via Apify
                "shares": 0,  # not available via Apify
                "reach": 0,  # not available via Apify
                "total_interactions": (
                    item.get("likesCount", 0) + item.get("commentsCount", 0)
                ),
            },
        }
        if item.get("videoViewCount"):
            post["metrics"]["video_views"] = item["videoViewCount"]
        posts.append(post)

    _log(f"Fetched {len(posts)} posts via Apify (saves/shares/reach not available).")
    return account, posts


def _apify_type(item: dict[str, Any]) -> str:
    """Map Apify item type to Graph API media_type equivalent."""
    if item.get("type") == "Video" or item.get("isVideo"):
        return "REEL"
    if item.get("type") == "Sidecar" or item.get("childPosts"):
        return "CAROUSEL_ALBUM"
    return "IMAGE"


# ---------------------------------------------------------------------------
# Data loading: JSON file
# ---------------------------------------------------------------------------


def load_posts_from_file(path: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Load posts from a saved JSON file."""
    _log(f"Loading data from {path}...")
    with open(path, "r") as f:
        data = json.load(f)

    # Support two formats: raw list or structured object
    if isinstance(data, list):
        posts = _normalize_post_list(data)
        account: dict[str, Any] = {
            "id": "", "username": "", "media_count": len(posts), "followers": 0
        }
        return account, posts

    if isinstance(data, dict):
        account = data.get("account", {
            "id": "", "username": "", "media_count": 0, "followers": 0
        })
        raw_posts = data.get("posts", data.get("data", []))
        return account, _normalize_post_list(raw_posts)

    raise ValueError(f"Unexpected JSON structure in {path}")


def _normalize_post_list(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Normalize various post formats to internal schema."""
    posts: list[dict[str, Any]] = []
    for item in items:
        # Already in our format
        if "metrics" in item and isinstance(item["metrics"], dict):
            posts.append(item)
            continue

        # Apify format
        if "likesCount" in item or "commentsCount" in item:
            post = {
                "id": item.get("id", item.get("shortCode", "")),
                "permalink": item.get("url", item.get("permalink", "")),
                "type": _apify_type(item),
                "timestamp": item.get("timestamp", ""),
                "caption": item.get("caption", ""),
                "metrics": {
                    "likes": item.get("likesCount", 0),
                    "comments": item.get("commentsCount", 0),
                    "saves": 0,
                    "shares": 0,
                    "reach": 0,
                },
            }
            if item.get("videoViewCount"):
                post["metrics"]["video_views"] = item["videoViewCount"]
            posts.append(post)
            continue

        # Graph API raw format (without insights)
        post = {
            "id": item.get("id", ""),
            "permalink": item.get("permalink", ""),
            "type": item.get("media_type", item.get("type", "IMAGE")),
            "timestamp": item.get("timestamp", ""),
            "caption": item.get("caption", ""),
            "metrics": {
                "likes": item.get("like_count", item.get("likes", 0)),
                "comments": item.get("comments_count", item.get("comments", 0)),
                "saves": item.get("saves", item.get("saved", 0)),
                "shares": item.get("shares", 0),
                "reach": item.get("reach", 0),
            },
        }
        posts.append(post)

    return posts


# ---------------------------------------------------------------------------
# Timestamp utilities
# ---------------------------------------------------------------------------


def _parse_timestamp(ts: str) -> datetime:
    """Parse various timestamp formats to UTC datetime."""
    if not ts:
        return datetime.min.replace(tzinfo=timezone.utc)
    # ISO format from Graph API: 2024-01-15T10:30:00+0000
    for fmt in (
        "%Y-%m-%dT%H:%M:%S%z",
        "%Y-%m-%dT%H:%M:%S.%f%z",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S",
    ):
        try:
            dt = datetime.strptime(ts, fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            continue
    # Unix timestamp
    try:
        return datetime.fromtimestamp(int(ts), tz=timezone.utc)
    except (ValueError, TypeError, OSError):
        pass
    return datetime.min.replace(tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Analysis engine: per-post rates
# ---------------------------------------------------------------------------


def compute_post_rates(post: dict[str, Any]) -> dict[str, float]:
    """Calculate engagement rates for a single post."""
    m = post.get("metrics", {})
    likes = m.get("likes", 0)
    comments = m.get("comments", 0)
    saves = m.get("saves", 0)
    shares = m.get("shares", 0)
    reach = m.get("reach", 0)

    total_engagement = likes + comments + saves + shares

    return {
        "engagement": round(_safe_div(total_engagement, reach) * 100, 2) if reach else 0.0,
        "save": round(_safe_div(saves, reach) * 100, 2) if reach else 0.0,
        "share": round(_safe_div(shares, reach) * 100, 2) if reach else 0.0,
        "comment_to_save_ratio": round(_safe_div(comments, saves), 2) if saves else 0.0,
    }


# ---------------------------------------------------------------------------
# Analysis engine: scoring
# ---------------------------------------------------------------------------


def score_reach_distribution(
    post: dict[str, Any], avg_reach: float
) -> tuple[float, list[str]]:
    """
    Category 1: Reach & Distribution (25 pts).
    Compares post reach to account average reach.
    """
    m = post.get("metrics", {})
    reach = m.get("reach", 0)
    details: list[str] = []

    if not avg_reach or not reach:
        details.append("No reach data available")
        return 0.0, details

    # Reach vs average (0-20 pts)
    ratio = reach / avg_reach
    if ratio >= 2.0:
        reach_score = 20.0
        details.append(f"Reach {ratio:.1f}x above average (excellent)")
    elif ratio >= 1.5:
        reach_score = 17.0
        details.append(f"Reach {ratio:.1f}x above average (strong)")
    elif ratio >= 1.0:
        reach_score = 13.0 + (ratio - 1.0) * 8
        details.append(f"Reach {ratio:.1f}x of average (on track)")
    elif ratio >= 0.5:
        reach_score = 5.0 + (ratio - 0.5) * 16
        details.append(f"Reach {ratio:.1f}x of average (below)")
    else:
        reach_score = ratio * 10
        details.append(f"Reach {ratio:.1f}x of average (low)")

    # Distribution bonus: high reach with low follower-content suggests
    # algorithm push (0-5 pts, estimated from total_interactions/reach)
    interactions = m.get("total_interactions", 0)
    interaction_rate = _safe_div(interactions, reach) * 100
    if interaction_rate > 15:
        dist_score = 5.0
        details.append("High interaction-to-reach ratio (algorithm boost likely)")
    elif interaction_rate > 8:
        dist_score = 3.0
    elif interaction_rate > 3:
        dist_score = 1.5
    else:
        dist_score = 0.0

    return _clamp(reach_score + dist_score, 0, 25), details


def score_engagement_quality(
    post: dict[str, Any], rates: dict[str, float], avg_rates: dict[str, float]
) -> tuple[float, list[str]]:
    """
    Category 2: Engagement Quality (25 pts).
    Save rate, share rate, overall engagement rate.
    """
    details: list[str] = []
    score = 0.0

    # Save rate (0-10 pts) - saves are the #1 algorithm signal
    save_rate = rates.get("save", 0)
    if save_rate >= 5.0:
        score += 10.0
        details.append(f"Save rate {save_rate:.1f}% (exceptional)")
    elif save_rate >= 3.0:
        score += 8.0
        details.append(f"Save rate {save_rate:.1f}% (strong)")
    elif save_rate >= 1.5:
        score += 5.0 + (save_rate - 1.5) * 2
        details.append(f"Save rate {save_rate:.1f}% (good)")
    elif save_rate > 0:
        score += save_rate * 3.3
        details.append(f"Save rate {save_rate:.1f}% (low)")
    else:
        details.append("No save data")

    # Share rate (0-8 pts) - shares = DM sends, strong signal
    share_rate = rates.get("share", 0)
    if share_rate >= 3.0:
        score += 8.0
        details.append(f"Share rate {share_rate:.1f}% (viral potential)")
    elif share_rate >= 1.5:
        score += 5.0 + (share_rate - 1.5) * 2
        details.append(f"Share rate {share_rate:.1f}% (good)")
    elif share_rate > 0:
        score += share_rate * 3.3
    else:
        pass  # no share data, no penalty

    # Engagement rate vs account average (0-7 pts)
    eng_rate = rates.get("engagement", 0)
    avg_eng = avg_rates.get("engagement", 0)
    if avg_eng and eng_rate:
        ratio = eng_rate / avg_eng
        if ratio >= 2.0:
            score += 7.0
            details.append(f"Engagement {ratio:.1f}x above average")
        elif ratio >= 1.0:
            score += 4.0 + (ratio - 1.0) * 3
        else:
            score += ratio * 4.0
    elif eng_rate >= 5.0:
        score += 7.0
    elif eng_rate >= 3.0:
        score += 5.0
    elif eng_rate > 0:
        score += eng_rate * 1.5

    return _clamp(score, 0, 25), details


def score_watch_time(post: dict[str, Any]) -> tuple[float, list[str]]:
    """
    Category 3: Watch Time (20 pts).
    Only applies to Reels/Videos. Non-video posts get a neutral 12/20.
    """
    details: list[str] = []
    media_type = post.get("type", "IMAGE")

    if media_type not in ("REEL", "VIDEO"):
        details.append("Non-video content (neutral score)")
        return 12.0, details

    m = post.get("metrics", {})
    avg_watch = m.get("avg_watch_time", 0)

    if not avg_watch:
        details.append("No watch time data available")
        return 8.0, details

    # avg_watch_time is in seconds
    if avg_watch >= 30:
        score = 20.0
        details.append(f"Avg watch time {avg_watch:.1f}s (exceptional retention)")
    elif avg_watch >= 20:
        score = 16.0
        details.append(f"Avg watch time {avg_watch:.1f}s (strong retention)")
    elif avg_watch >= 10:
        score = 10.0 + (avg_watch - 10) * 0.6
        details.append(f"Avg watch time {avg_watch:.1f}s (moderate)")
    elif avg_watch >= 5:
        score = 5.0 + (avg_watch - 5) * 1.0
        details.append(f"Avg watch time {avg_watch:.1f}s (short)")
    else:
        score = avg_watch
        details.append(f"Avg watch time {avg_watch:.1f}s (very low)")

    return _clamp(score, 0, 20), details


def score_audience_growth(post: dict[str, Any]) -> tuple[float, list[str]]:
    """
    Category 4: Audience Growth (15 pts).
    Profile visits and follows from post (when available via insights).
    Without this data, estimate from engagement signals.
    """
    details: list[str] = []
    m = post.get("metrics", {})

    profile_visits = m.get("profile_visits", 0)
    follows = m.get("follows_from_post", 0)

    if profile_visits or follows:
        visit_score = min(profile_visits / 50, 1.0) * 8  # 50+ visits = max
        follow_score = min(follows / 10, 1.0) * 7  # 10+ follows = max
        score = visit_score + follow_score
        details.append(f"Profile visits: {profile_visits}, Follows: {follows}")
    else:
        # Estimate from save+share signals (saves/shares correlate with growth)
        saves = m.get("saves", 0)
        shares = m.get("shares", 0)
        reach = m.get("reach", 0)
        if reach:
            growth_signal = _safe_div(saves + shares, reach) * 100
            if growth_signal >= 5.0:
                score = 12.0
                details.append("Strong save+share signals (estimated growth potential)")
            elif growth_signal >= 2.0:
                score = 8.0
                details.append("Moderate save+share signals")
            elif growth_signal > 0:
                score = 4.0 + growth_signal
            else:
                score = 4.0
                details.append("Low growth signals")
        else:
            score = 5.0
            details.append("No growth data available (neutral estimate)")

    return _clamp(score, 0, 15), details


def score_content_signals(
    post: dict[str, Any], rates: dict[str, float]
) -> tuple[float, list[str]]:
    """
    Category 5: Content Signals (15 pts).
    Comment-to-save ratio, controversy detection, caption quality.
    """
    details: list[str] = []
    score = 0.0
    m = post.get("metrics", {})
    caption = post.get("caption", "") or ""

    # Comment-to-save ratio analysis (0-6 pts)
    c2s = rates.get("comment_to_save_ratio", 0)
    saves = m.get("saves", 0)
    comments = m.get("comments", 0)

    if saves > 0 and comments > 0:
        if c2s > 3.0:
            score += 2.0
            details.append(f"Comment/save ratio {c2s:.1f} (controversy risk: many comments, few saves)")
        elif c2s > 2.0:
            score += 3.0
            details.append(f"Comment/save ratio {c2s:.1f} (comment-heavy, possible controversy)")
        elif 0.3 <= c2s <= 2.0:
            score += 6.0
            details.append(f"Comment/save ratio {c2s:.1f} (balanced)")
        else:
            score += 5.0
            details.append(f"Comment/save ratio {c2s:.1f} (save-heavy, strong value content)")
    elif saves > 0:
        score += 5.0
        details.append("Save-dominant engagement (value content)")
    elif comments > 0:
        score += 3.0
        details.append("Comment-only engagement")
    else:
        score += 2.0

    # Caption quality signals (0-5 pts)
    cap_score = 0.0
    if caption:
        word_count = len(caption.split())
        has_cta = bool(
            any(phrase in caption.lower() for phrase in [
                "link in bio", "speichern", "teilen", "kommentier",
                "save this", "share this", "comment", "tap the link",
                "schreib mir", "dm me", "check out",
            ])
        )
        has_hashtags = "#" in caption
        hashtag_count = caption.count("#")

        if 50 <= word_count <= 300:
            cap_score += 2.0
        elif word_count > 300:
            cap_score += 1.5
        elif word_count > 20:
            cap_score += 1.0

        if has_cta:
            cap_score += 1.5
            details.append("Caption has CTA")

        if has_hashtags and 3 <= hashtag_count <= 15:
            cap_score += 1.0
        elif hashtag_count > 30:
            cap_score -= 0.5
            details.append("Excessive hashtags (>30)")

    score += min(cap_score, 5.0)

    # Engagement distribution health (0-4 pts)
    likes = m.get("likes", 0)
    total = likes + comments + saves + m.get("shares", 0)
    if total > 0:
        like_ratio = likes / total
        if like_ratio < 0.9:
            score += 4.0  # Diverse engagement (not just likes)
        elif like_ratio < 0.95:
            score += 2.5
        else:
            score += 1.0
            details.append("Like-dominated engagement (low depth)")
    else:
        score += 1.0

    return _clamp(score, 0, 15), details


def score_post(
    post: dict[str, Any],
    avg_reach: float,
    avg_rates: dict[str, float],
) -> dict[str, Any]:
    """
    Calculate full 100-point score for a single post.
    Returns score breakdown with details.
    """
    rates = compute_post_rates(post)

    reach_score, reach_details = score_reach_distribution(post, avg_reach)
    eng_score, eng_details = score_engagement_quality(post, rates, avg_rates)
    watch_score, watch_details = score_watch_time(post)
    growth_score, growth_details = score_audience_growth(post)
    signal_score, signal_details = score_content_signals(post, rates)

    total = reach_score + eng_score + watch_score + growth_score + signal_score

    # Generate flags
    flags: list[str] = []
    m = post.get("metrics", {})
    if rates.get("save", 0) >= 3.0:
        flags.append("high_saves")
    if rates.get("share", 0) >= 2.0:
        flags.append("high_shares")
    if rates.get("comment_to_save_ratio", 0) > 2.0:
        flags.append("controversy_risk")
    if m.get("avg_watch_time", 0) >= 20:
        flags.append("strong_retention")
    reach = m.get("reach", 0)
    if avg_reach and reach >= avg_reach * 2:
        flags.append("viral_reach")
    if avg_reach and reach and reach < avg_reach * 0.3:
        flags.append("low_reach")

    return {
        "rates": rates,
        "score": round(total, 1),
        "tier": _tier_label(total),
        "flags": flags,
        "breakdown": {
            "reach_distribution": {"score": round(reach_score, 1), "max": 25, "details": reach_details},
            "engagement_quality": {"score": round(eng_score, 1), "max": 25, "details": eng_details},
            "watch_time": {"score": round(watch_score, 1), "max": 20, "details": watch_details},
            "audience_growth": {"score": round(growth_score, 1), "max": 15, "details": growth_details},
            "content_signals": {"score": round(signal_score, 1), "max": 15, "details": signal_details},
        },
    }


# ---------------------------------------------------------------------------
# Analysis engine: account summary
# ---------------------------------------------------------------------------


def compute_account_summary(
    posts: list[dict[str, Any]],
    scored_posts: list[dict[str, Any]],
) -> dict[str, Any]:
    """Generate account-level summary from scored posts."""
    if not posts:
        return {}

    # Aggregate metrics
    all_rates = [sp["rates"] for sp in scored_posts]
    all_scores = [sp["score"] for sp in scored_posts]

    avg_engagement = _safe_div(sum(r["engagement"] for r in all_rates), len(all_rates))
    avg_save = _safe_div(sum(r["save"] for r in all_rates), len(all_rates))
    avg_share = _safe_div(sum(r["share"] for r in all_rates), len(all_rates))

    # Content type distribution
    type_counts = Counter(p.get("type", "IMAGE") for p in posts)

    # Top content type by average score
    type_scores: dict[str, list[float]] = defaultdict(list)
    for p, sp in zip(posts, scored_posts):
        type_scores[p.get("type", "IMAGE")].append(sp["score"])
    top_type = max(type_scores, key=lambda t: sum(type_scores[t]) / len(type_scores[t])) if type_scores else "IMAGE"

    # Posting frequency
    timestamps = [_parse_timestamp(p.get("timestamp", "")) for p in posts]
    valid_ts = sorted([t for t in timestamps if t != datetime.min.replace(tzinfo=timezone.utc)])
    if len(valid_ts) >= 2:
        span_days = max((valid_ts[-1] - valid_ts[0]).days, 1)
        posts_per_week = round(len(valid_ts) / span_days * 7, 1)
    else:
        posts_per_week = 0

    # Best day of week
    day_metrics: dict[int, list[float]] = defaultdict(list)
    for p, sp in zip(posts, scored_posts):
        ts = _parse_timestamp(p.get("timestamp", ""))
        if ts != datetime.min.replace(tzinfo=timezone.utc):
            day_metrics[ts.weekday()].append(sp["score"])

    best_day = ""
    if day_metrics:
        best_day_idx = max(day_metrics, key=lambda d: sum(day_metrics[d]) / len(day_metrics[d]))
        best_day = DAY_NAMES[best_day_idx]

    # Best hour
    hour_metrics: dict[int, list[float]] = defaultdict(list)
    for p, sp in zip(posts, scored_posts):
        ts = _parse_timestamp(p.get("timestamp", ""))
        if ts != datetime.min.replace(tzinfo=timezone.utc):
            hour_metrics[ts.hour].append(sp["score"])

    best_hour = ""
    if hour_metrics:
        best_hour_idx = max(hour_metrics, key=lambda h: sum(hour_metrics[h]) / len(hour_metrics[h]))
        best_hour = f"{best_hour_idx:02d}:00-{(best_hour_idx + 1) % 24:02d}:00"

    # Algorithm signal analysis
    if avg_save >= 2.0 and avg_save > avg_engagement * 0.3:
        algo_health = "save-optimized"
    elif avg_engagement > 5.0 and avg_save < 1.0:
        algo_health = "comment-heavy"
    else:
        algo_health = "balanced"

    # Top posts by category
    posts_with_scores = list(zip(posts, scored_posts))

    def _top_by(key: str, n: int = 3) -> list[dict[str, Any]]:
        sorted_list = sorted(
            posts_with_scores,
            key=lambda ps: ps[0].get("metrics", {}).get(key, 0),
            reverse=True,
        )
        return [
            {"id": p["id"], "permalink": p.get("permalink", ""), key: p["metrics"].get(key, 0), "score": sp["score"]}
            for p, sp in sorted_list[:n]
        ]

    # Day of week performance
    day_perf: dict[str, dict[str, float]] = {}
    for d, scores in sorted(day_metrics.items()):
        day_perf[DAY_NAMES[d]] = {
            "avg_score": round(sum(scores) / len(scores), 1),
            "post_count": len(scores),
        }

    # Hour performance
    hour_perf: dict[str, dict[str, float]] = {}
    for h, scores in sorted(hour_metrics.items()):
        hour_perf[f"{h:02d}:00"] = {
            "avg_score": round(sum(scores) / len(scores), 1),
            "post_count": len(scores),
        }

    # Recommendations
    recommendations = _generate_recommendations(
        avg_engagement, avg_save, avg_share, type_counts, posts_per_week,
        best_day, algo_health, posts, scored_posts,
    )

    return {
        "avg_engagement_rate": round(avg_engagement, 2),
        "avg_save_rate": round(avg_save, 2),
        "avg_share_rate": round(avg_share, 2),
        "avg_score": round(sum(all_scores) / len(all_scores), 1) if all_scores else 0,
        "top_content_type": top_type,
        "best_day": best_day,
        "best_hour": best_hour,
        "posting_frequency": f"{posts_per_week}/week",
        "algorithm_health": algo_health,
        "content_type_breakdown": dict(type_counts),
        "top_by_saves": _top_by("saves"),
        "top_by_reach": _top_by("reach"),
        "day_of_week_performance": day_perf,
        "hour_performance": hour_perf,
        "recommendations": recommendations,
    }


def _generate_recommendations(
    avg_eng: float,
    avg_save: float,
    avg_share: float,
    type_counts: Counter,
    posts_per_week: float,
    best_day: str,
    algo_health: str,
    posts: list[dict[str, Any]],
    scored_posts: list[dict[str, Any]],
) -> list[str]:
    """Generate actionable recommendations based on analysis."""
    recs: list[str] = []

    # Posting frequency
    if posts_per_week < 3:
        recs.append(
            f"Posting frequency is {posts_per_week}/week. Aim for 4-5 posts/week for consistent growth."
        )
    elif posts_per_week > 10:
        recs.append(
            f"Posting frequency is {posts_per_week}/week. Consider reducing to focus on quality over quantity."
        )

    # Save rate
    if avg_save < 1.0:
        recs.append(
            "Save rate is below 1%. Create more saveable content: tutorials, infographics, checklists, tips lists."
        )
    elif avg_save >= 3.0:
        recs.append(
            f"Save rate is {avg_save:.1f}%, which is excellent. Maintain this educational/value-driven content strategy."
        )

    # Share rate
    if avg_share < 0.5:
        recs.append(
            "Share rate is low. Create more relatable/shareable content: memes, relatable situations, quote graphics."
        )

    # Content type mix
    total_posts = sum(type_counts.values())
    reel_pct = type_counts.get("REEL", 0) / total_posts * 100 if total_posts else 0
    if reel_pct < 30:
        recs.append(
            f"Only {reel_pct:.0f}% Reels. Instagram currently favors Reels for reach. Aim for 50%+ Reels."
        )

    # Algorithm health
    if algo_health == "comment-heavy":
        recs.append(
            "Engagement is comment-heavy. This may indicate controversial content or low value-add. "
            "Focus on content that encourages saves (actionable tips, reference material)."
        )

    # Best day
    if best_day:
        recs.append(f"Best performing day: {best_day}. Schedule your strongest content for this day.")

    # Low performers analysis
    low_scores = [sp for sp in scored_posts if sp["score"] < 40]
    if len(low_scores) > len(scored_posts) * 0.3:
        recs.append(
            f"{len(low_scores)} of {len(scored_posts)} posts scored below 40. "
            "Review underperformers for common patterns (timing, format, topic)."
        )

    # Carousel usage
    carousel_count = type_counts.get("CAROUSEL_ALBUM", 0)
    if carousel_count == 0 and total_posts > 5:
        recs.append(
            "No carousel posts detected. Carousels typically get higher save rates and time-on-post. Try educational carousels."
        )

    return recs


# ---------------------------------------------------------------------------
# Output formatting: JSON
# ---------------------------------------------------------------------------


def format_json(
    account: dict[str, Any],
    posts: list[dict[str, Any]],
    scored_posts: list[dict[str, Any]],
    summary: dict[str, Any],
    data_source: str,
) -> str:
    """Build the full JSON output."""
    timestamps = [_parse_timestamp(p.get("timestamp", "")) for p in posts]
    valid_ts = sorted([t for t in timestamps if t != datetime.min.replace(tzinfo=timezone.utc)])

    post_entries = []
    for post, sp in zip(posts, scored_posts):
        entry = {
            "id": post.get("id", ""),
            "permalink": post.get("permalink", ""),
            "type": post.get("type", "IMAGE"),
            "timestamp": post.get("timestamp", ""),
            "caption_preview": _caption_preview(post.get("caption")),
            "metrics": post.get("metrics", {}),
            "rates": sp["rates"],
            "score": sp["score"],
            "tier": sp["tier"],
            "flags": sp["flags"],
        }
        post_entries.append(entry)

    output = {
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S"),
        "account": {
            "username": account.get("username", ""),
            "followers": account.get("followers", 0),
            "media_count": account.get("media_count", 0),
        },
        "data_source": data_source,
        "period": {
            "start": valid_ts[0].strftime("%Y-%m-%d") if valid_ts else "",
            "end": valid_ts[-1].strftime("%Y-%m-%d") if valid_ts else "",
            "posts_analyzed": len(posts),
        },
        "summary": {
            "avg_engagement_rate": summary.get("avg_engagement_rate", 0),
            "avg_save_rate": summary.get("avg_save_rate", 0),
            "avg_share_rate": summary.get("avg_share_rate", 0),
            "avg_score": summary.get("avg_score", 0),
            "top_content_type": summary.get("top_content_type", ""),
            "best_day": summary.get("best_day", ""),
            "best_hour": summary.get("best_hour", ""),
            "posting_frequency": summary.get("posting_frequency", ""),
            "algorithm_health": summary.get("algorithm_health", ""),
        },
        "posts": post_entries,
        "insights": {
            "top_by_saves": summary.get("top_by_saves", []),
            "top_by_reach": summary.get("top_by_reach", []),
            "content_type_breakdown": summary.get("content_type_breakdown", {}),
            "day_of_week_performance": summary.get("day_of_week_performance", {}),
            "hour_performance": summary.get("hour_performance", {}),
            "recommendations": summary.get("recommendations", []),
        },
    }

    return json.dumps(output, indent=2, ensure_ascii=False, default=str)


# ---------------------------------------------------------------------------
# Output formatting: Markdown
# ---------------------------------------------------------------------------


def format_markdown(
    account: dict[str, Any],
    posts: list[dict[str, Any]],
    scored_posts: list[dict[str, Any]],
    summary: dict[str, Any],
    data_source: str,
) -> str:
    """Build a human-readable markdown report."""
    lines: list[str] = []
    username = account.get("username", "unknown")
    followers = account.get("followers", 0)

    lines.append(f"# Instagram Performance Report: @{username}")
    lines.append("")
    lines.append(f"**Followers:** {followers:,}  ")
    lines.append(f"**Posts analyzed:** {len(posts)}  ")
    lines.append(f"**Data source:** {data_source}  ")
    lines.append(f"**Generated:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}  ")
    lines.append("")

    # Summary
    lines.append("## Summary")
    lines.append("")
    lines.append(f"| Metric | Value |")
    lines.append(f"|--------|-------|")
    lines.append(f"| Avg Engagement Rate | {summary.get('avg_engagement_rate', 0):.2f}% |")
    lines.append(f"| Avg Save Rate | {summary.get('avg_save_rate', 0):.2f}% |")
    lines.append(f"| Avg Share Rate | {summary.get('avg_share_rate', 0):.2f}% |")
    lines.append(f"| Avg Score | {summary.get('avg_score', 0):.1f}/100 |")
    lines.append(f"| Top Content Type | {summary.get('top_content_type', '-')} |")
    lines.append(f"| Best Day | {summary.get('best_day', '-')} |")
    lines.append(f"| Best Hour | {summary.get('best_hour', '-')} |")
    lines.append(f"| Posting Frequency | {summary.get('posting_frequency', '-')} |")
    lines.append(f"| Algorithm Health | {summary.get('algorithm_health', '-')} |")
    lines.append("")

    # Content type breakdown
    breakdown = summary.get("content_type_breakdown", {})
    if breakdown:
        lines.append("## Content Type Breakdown")
        lines.append("")
        lines.append("| Type | Count | % |")
        lines.append("|------|-------|---|")
        total = sum(breakdown.values())
        for ctype, count in sorted(breakdown.items(), key=lambda x: -x[1]):
            pct = count / total * 100 if total else 0
            lines.append(f"| {ctype} | {count} | {pct:.0f}% |")
        lines.append("")

    # Post performance table
    lines.append("## Post Performance")
    lines.append("")
    lines.append("| # | Type | Score | Tier | Reach | Saves | Eng% | Save% | Flags |")
    lines.append("|---|------|-------|------|-------|-------|------|-------|-------|")
    for i, (post, sp) in enumerate(zip(posts, scored_posts), 1):
        m = post.get("metrics", {})
        flags_str = ", ".join(sp["flags"]) if sp["flags"] else "-"
        lines.append(
            f"| {i} | {_short_type(post.get('type', '-'))} "
            f"| {sp['score']:.0f} | {sp['tier']} "
            f"| {m.get('reach', 0):,} | {m.get('saves', 0):,} "
            f"| {sp['rates']['engagement']:.1f}% | {sp['rates']['save']:.1f}% "
            f"| {flags_str} |"
        )
    lines.append("")

    # Day of week performance
    day_perf = summary.get("day_of_week_performance", {})
    if day_perf:
        lines.append("## Day of Week Performance")
        lines.append("")
        lines.append("| Day | Avg Score | Posts |")
        lines.append("|-----|-----------|-------|")
        for day in DAY_NAMES:
            if day in day_perf:
                d = day_perf[day]
                lines.append(f"| {day} | {d['avg_score']:.1f} | {d['post_count']} |")
        lines.append("")

    # Recommendations
    recs = summary.get("recommendations", [])
    if recs:
        lines.append("## Recommendations")
        lines.append("")
        for rec in recs:
            lines.append(f"- {rec}")
        lines.append("")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Output formatting: Table
# ---------------------------------------------------------------------------


def format_table(
    posts: list[dict[str, Any]],
    scored_posts: list[dict[str, Any]],
) -> str:
    """Build a compact one-line-per-post table."""
    lines: list[str] = []
    header = f"{'#':>3}  {'Type':<4}  {'Score':>5}  {'Tier':<16}  {'Reach':>8}  {'Likes':>7}  {'Saves':>6}  {'Shares':>6}  {'Eng%':>6}  {'Save%':>6}  {'Flags'}"
    lines.append(header)
    lines.append("-" * len(header))

    for i, (post, sp) in enumerate(zip(posts, scored_posts), 1):
        m = post.get("metrics", {})
        flags_str = ", ".join(sp["flags"]) if sp["flags"] else ""
        lines.append(
            f"{i:>3}  {_short_type(post.get('type', '-')):<4}  {sp['score']:>5.0f}  {sp['tier']:<16}  "
            f"{m.get('reach', 0):>8,}  {m.get('likes', 0):>7,}  {m.get('saves', 0):>6,}  "
            f"{m.get('shares', 0):>6,}  {sp['rates']['engagement']:>5.1f}%  "
            f"{sp['rates']['save']:>5.1f}%  {flags_str}"
        )

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main analysis pipeline
# ---------------------------------------------------------------------------


def analyze(
    posts: list[dict[str, Any]],
    account: dict[str, Any],
    data_source: str,
    sort_by: str = "score",
    top_n: Optional[int] = None,
    output_format: str = "json",
) -> str:
    """
    Run the full analysis pipeline.
    Returns formatted output string.
    """
    if not posts:
        _log("No posts to analyze.")
        return json.dumps({"error": "No posts to analyze"}, indent=2)

    # Compute average reach across all posts
    reaches = [p.get("metrics", {}).get("reach", 0) for p in posts]
    avg_reach = _safe_div(sum(reaches), len(reaches))

    # First pass: compute rates for averages
    all_rates = [compute_post_rates(p) for p in posts]
    avg_rates = {
        "engagement": _safe_div(sum(r["engagement"] for r in all_rates), len(all_rates)),
        "save": _safe_div(sum(r["save"] for r in all_rates), len(all_rates)),
        "share": _safe_div(sum(r["share"] for r in all_rates), len(all_rates)),
    }

    # Score all posts
    scored_posts = [score_post(p, avg_reach, avg_rates) for p in posts]

    # Sort
    sort_map = {
        "score": lambda ps: ps[1]["score"],
        "reach": lambda ps: ps[0].get("metrics", {}).get("reach", 0),
        "saves": lambda ps: ps[0].get("metrics", {}).get("saves", 0),
        "engagement": lambda ps: ps[1]["rates"]["engagement"],
    }
    sort_fn = sort_map.get(sort_by, sort_map["score"])
    paired = sorted(zip(posts, scored_posts), key=sort_fn, reverse=True)
    posts = [p for p, _ in paired]
    scored_posts = [sp for _, sp in paired]

    # Top N filter
    if top_n and top_n < len(posts):
        posts = posts[:top_n]
        scored_posts = scored_posts[:top_n]

    # Compute summary (from ALL posts, not just top N, for accurate averages)
    all_paired = sorted(
        zip([p for p, _ in sorted(zip(posts, scored_posts), key=sort_fn, reverse=True)],
            [sp for _, sp in sorted(zip(posts, scored_posts), key=sort_fn, reverse=True)]),
        key=sort_fn, reverse=True,
    )
    summary = compute_account_summary(posts, scored_posts)

    # Format output
    if output_format == "markdown":
        return format_markdown(account, posts, scored_posts, summary, data_source)
    elif output_format == "table":
        return format_table(posts, scored_posts)
    else:
        return format_json(account, posts, scored_posts, summary, data_source)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_parser() -> argparse.ArgumentParser:
    """Build the argument parser."""
    parser = argparse.ArgumentParser(
        description="Instagram Post Performance Analyzer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  %(prog)s --user-id 123 --token <token>\n"
            "  %(prog)s --username strongeryou --apify-token <token>\n"
            "  %(prog)s --input posts.json --format markdown\n"
            "  %(prog)s --post-id 456 --token <token>\n"
        ),
    )

    # Data source arguments
    source = parser.add_argument_group("Data Source")
    source.add_argument(
        "--user-id",
        help="Instagram User ID for Graph API (env: INSTAGRAM_USER_ID or INSTAGRAM_BUSINESS_ACCOUNT_ID)",
    )
    source.add_argument(
        "--token",
        help="Instagram Graph API access token (env: INSTAGRAM_ACCESS_TOKEN)",
    )
    source.add_argument(
        "--page-token",
        help="Meta Page Token for Instagram content endpoints (env: META_PAGE_TOKEN). "
             "If not provided, derived automatically from --token + --page-id.",
    )
    source.add_argument(
        "--page-id",
        help="Facebook Page ID for Page Token derivation (env: META_PAGE_ID)",
    )
    source.add_argument(
        "--username",
        help="Instagram username for Apify fallback",
    )
    source.add_argument(
        "--apify-token",
        help="Apify API token (env: APIFY_TOKEN)",
    )
    source.add_argument(
        "--post-id",
        help="Single post/media ID to analyze via Graph API",
    )
    source.add_argument(
        "--input", "-i",
        help="Path to JSON file with saved post data",
    )

    # Output options
    output = parser.add_argument_group("Output Options")
    output.add_argument(
        "--format", "-f",
        choices=sorted(FORMAT_CHOICES),
        default="json",
        help="Output format (default: json)",
    )
    output.add_argument(
        "--sort", "-s",
        choices=sorted(SORT_KEYS),
        default="score",
        help="Sort posts by (default: score)",
    )
    output.add_argument(
        "--top", "-t",
        type=int,
        default=None,
        help="Only show top N posts",
    )
    output.add_argument(
        "--limit", "-l",
        type=int,
        default=50,
        help="Max posts to fetch (default: 50)",
    )
    output.add_argument(
        "--days", "-d",
        type=int,
        default=None,
        help="Only analyze posts from last N days",
    )

    return parser


def resolve_credentials(args: argparse.Namespace) -> argparse.Namespace:
    """Fill in missing credentials from environment variables."""
    if not args.token:
        args.token = os.environ.get("INSTAGRAM_ACCESS_TOKEN", "")
    if not args.user_id:
        args.user_id = os.environ.get(
            "INSTAGRAM_USER_ID",
            os.environ.get("INSTAGRAM_BUSINESS_ACCOUNT_ID", ""),
        )
    if not args.apify_token:
        args.apify_token = os.environ.get("APIFY_TOKEN", "")
    if not getattr(args, "page_token", None):
        args.page_token = os.environ.get("META_PAGE_TOKEN", "")
    if not getattr(args, "page_id", None):
        args.page_id = os.environ.get("META_PAGE_ID", "")
    return args


def derive_page_token(user_token: str, page_id: str) -> str:
    """Derive a Page Token from User Token + Page ID via Graph API."""
    if not user_token or not page_id:
        return ""
    url = f"{GRAPH_API_BASE}/{page_id}?fields=access_token&access_token={user_token}"
    try:
        data = _api_get(url)
        token = data.get("access_token", "")
        if token:
            _log(f"Derived fresh Page Token from Page ID {page_id}")
        return token
    except RuntimeError as exc:
        _log(f"Warning: Could not derive Page Token: {exc}")
        return ""


def get_content_token(args: argparse.Namespace) -> str:
    """Get the correct token for Instagram content endpoints (Page Token preferred).

    Instagram content endpoints (media, insights, stories) require a Page Token.
    The User Token (INSTAGRAM_ACCESS_TOKEN) alone will fail with '(#200) Provide valid app ID'.

    Priority: 1) explicit --page-token  2) derive from --token + --page-id  3) fall back to --token
    """
    if args.page_token:
        return args.page_token
    if args.token and args.page_id:
        derived = derive_page_token(args.token, args.page_id)
        if derived:
            return derived
    _log("Warning: No Page Token available. Using User Token (may fail for content endpoints).")
    return args.token


def main() -> int:
    """Entry point. Returns exit code."""
    parser = build_parser()
    args = parser.parse_args()
    args = resolve_credentials(args)

    account: dict[str, Any] = {}
    posts: list[dict[str, Any]] = []
    data_source = ""
    partial = False

    # Determine data source
    try:
        if args.input:
            # File input
            account, posts = load_posts_from_file(args.input)
            data_source = "file"

        elif args.post_id and args.token:
            # Single post via Graph API (needs Page Token for content endpoints)
            content_token = get_content_token(args)
            account, posts = fetch_single_post_graph_api(args.post_id, content_token)
            data_source = "graph_api"

        elif args.user_id and args.token:
            # Graph API (needs Page Token for content endpoints)
            content_token = get_content_token(args)
            account, posts = fetch_posts_graph_api(
                args.user_id, content_token, args.limit, args.days,
            )
            data_source = "graph_api"

        elif args.username and args.apify_token:
            # Apify fallback
            account, posts = fetch_posts_apify(
                args.username, args.apify_token, args.limit, args.days,
            )
            data_source = "apify"

        elif args.username and args.token and args.user_id:
            # Try Graph API first, Apify as fallback
            try:
                account, posts = fetch_posts_graph_api(
                    args.user_id, args.token, args.limit, args.days,
                )
                data_source = "graph_api"
            except RuntimeError as exc:
                _log(f"Graph API failed: {exc}")
                if args.apify_token:
                    _log("Falling back to Apify...")
                    account, posts = fetch_posts_apify(
                        args.username, args.apify_token, args.limit, args.days,
                    )
                    data_source = "apify"
                else:
                    raise

        elif args.token and args.user_id:
            # Graph API without explicit flag
            try:
                account, posts = fetch_posts_graph_api(
                    args.user_id, args.token, args.limit, args.days,
                )
                data_source = "graph_api"
            except RuntimeError as exc:
                _log(f"Graph API failed: {exc}")
                if args.apify_token and args.username:
                    _log("Falling back to Apify...")
                    account, posts = fetch_posts_apify(
                        args.username, args.apify_token, args.limit, args.days,
                    )
                    data_source = "apify"
                else:
                    raise

        else:
            _log("Error: No valid data source specified.")
            _log("")
            _log("Provide one of:")
            _log("  --user-id <id> --token <token>           (Graph API)")
            _log("  --username <handle> --apify-token <token> (Apify)")
            _log("  --input <file.json>                       (Saved JSON)")
            _log("  --post-id <id> --token <token>            (Single post)")
            _log("")
            _log("Or set environment variables:")
            _log("  INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_USER_ID, APIFY_TOKEN")
            return 1

    except RuntimeError as exc:
        _log(f"Error: {exc}")
        return 1
    except FileNotFoundError as exc:
        _log(f"Error: File not found: {exc}")
        return 1
    except json.JSONDecodeError as exc:
        _log(f"Error: Invalid JSON in input file: {exc}")
        return 1
    except Exception as exc:
        _log(f"Unexpected error during data fetch: {exc}")
        return 1

    if not posts:
        _log("No posts found. Check your parameters and try again.")
        return 1

    # Run analysis
    try:
        result = analyze(
            posts=posts,
            account=account,
            data_source=data_source,
            sort_by=args.sort,
            top_n=args.top,
            output_format=args.format,
        )
        print(result)
    except Exception as exc:
        _log(f"Error during analysis: {exc}")
        return 1

    return 2 if partial else 0


if __name__ == "__main__":
    sys.exit(main())
