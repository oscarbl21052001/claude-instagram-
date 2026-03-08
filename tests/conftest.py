"""Shared fixtures for claude-ig tests."""

import sys
from pathlib import Path

import pytest

# Add scripts directory to path so we can import score_content / analyze_post
sys.path.insert(0, str(Path(__file__).parent.parent / "scripts"))


# ---------------------------------------------------------------------------
# score_content fixtures: markdown drafts
# ---------------------------------------------------------------------------


@pytest.fixture
def sample_reel_draft():
    """Complete reel draft with all sections."""
    return """# Reel: 3 Fehler beim Abnehmen ab 40

## Hook
Machst du diese 3 Fehler beim Abnehmen ab 40?

## Script
[0:00-0:03] Machst du diese 3 Fehler beim Abnehmen ab 40?
[0:03-0:10] Fehler 1: Du isst zu wenig. Dein Stoffwechsel braucht Energie. Stattdessen probier 1.500 kcal als Basis.
[0:10-0:20] Fehler 2: Du trainierst falsch. Vergiss stundenlanges Cardio. Mach stattdessen 3x Krafttraining pro Woche.
[0:20-0:28] Fehler 3: Du schlaefst zu wenig. Ohne Schlaf keine Regeneration, deshalb mindestens 7 Stunden.
[0:28-0:30] Speicher dir das fuer spaeter und schick es einer Freundin.

## Caption
Machst du einen dieser Fehler?

Abnehmen ab 40 funktioniert anders als mit 20. Dein Koerper veraendert sich, deine Hormone spielen verrueckt, und die alten Methoden greifen nicht mehr.

Hier sind 3 Fehler, die ich bei fast jeder Kundin sehe:

1. Zu wenig essen: Dein Stoffwechsel braucht Energie, um Fett zu verbrennen. Unter 1.200 kcal schaltet dein Koerper auf Sparflamme.

2. Nur Cardio: Krafttraining ist der Gamechanger fuer Frauen ab 40. Es baut Muskelmasse auf und kurbelt deinen Grundumsatz an.

3. Schlaf vernachlaessigen: Ohne ausreichend Schlaf kann dein Koerper nicht regenerieren. Ziel: 7+ Stunden.

Speicher dir das fuer spaeter und schick es einer Freundin, die das auch wissen sollte.

#frauenab40 #abnehmenab40 #krafttrainingfrauen #hormonebalance #nicolstanzel

## Thumbnail
Text Overlay: "3 FEHLER beim Abnehmen ab 40" in bold. Hintergrund: Nicol im Gym mit Kurzhantel. Safe Zone beachtet: kein Text im unteren Drittel.

## Format
Type: Reel
Duration: 30s
"""


@pytest.fixture
def sample_hook_only():
    """Content with only a hook section."""
    return """# Reel: Warum du nicht abnimmst

## Hook
Warum du trotz Diaet kein Fett verlierst
"""


@pytest.fixture
def sample_caption_only():
    """Content with only a caption section."""
    return """# Post: Ernaehrungstipps

## Caption
Hier sind 5 Ernaehrungstipps, die dir wirklich helfen.

1. Proteinreich fruehstuecken
2. Genuegend Wasser trinken (mindestens 2 Liter)
3. Keine Kalorienzaehler-Apps verwenden
4. Auf deinen Koerper hoeren
5. Mahlzeiten planen

Speicher dir diese Liste fuer spaeter.

#ernaehrungstipps #gesundessen #mealprep
"""


@pytest.fixture
def sample_carousel_draft():
    """Carousel post with slides section."""
    return """# Carousel: 5 Protein-Quellen fuer Frauen

## Hook
Diese 5 Protein-Quellen sind besser als Proteinshakes

## Slides
Slide 1: Titel "5 Protein-Quellen, die besser sind als Shakes"
Slide 2: Eier, 13g Protein pro Stueck. Guenstig und vielseitig.
Slide 3: Griechischer Joghurt, 10g pro 100g. Perfekt als Snack.
Slide 4: Linsen, 9g pro 100g gekocht. Ideal fuer Vegetarierinnen.
Slide 5: Haehnchenbrust, 31g pro 100g. Der Klassiker.
Slide 6: CTA: Speicher dir diesen Beitrag fuer deinen naechsten Einkauf!

## Caption
Du brauchst keine teuren Proteinshakes, um deinen Bedarf zu decken.

Diese 5 Lebensmittel liefern dir hochwertiges Protein, sind guenstig und du bekommst sie in jedem Supermarkt.

Mein Favorit? Griechischer Joghurt mit Beeren als Snack nach dem Training.

Welche Proteinquelle nutzt du am liebsten? Schreib es in die Kommentare!

Speicher dir diese Liste fuer deinen naechsten Einkauf.

#proteinreich #ernaehrungstipps #frauengesundheit #krafttrainingfrauen

## Format
Type: Carousel
"""


@pytest.fixture
def sample_affiliate_draft():
    """Affiliate post WITH proper disclosure."""
    return """# Post: Meine Lieblings-Supplements

## Hook
Diese 3 Supplements nehme ich taeglich

## Caption
Werbung | Ich werde oft gefragt, welche Supplements ich nehme.

Hier sind meine Top 3 mit Affiliate-Link in der Bio:
1. Omega 3 von XY
2. Vitamin D3 von AB
3. Magnesium von CD

Speicher dir das fuer spaeter.

#supplements #partnerlink #gesundheit

## Format
Type: Feed
"""


@pytest.fixture
def sample_affiliate_no_disclosure():
    """Affiliate post WITHOUT disclosure (should fail G3)."""
    return """# Post: Meine Lieblings-Supplements

## Hook
Diese 3 Supplements nehme ich taeglich

## Caption
Ich werde oft gefragt, welche Supplements ich nehme.

Hier sind meine Top 3 mit Affiliate-Link in der Bio:
1. Omega 3 von XY
2. Vitamin D3 von AB
3. Magnesium von CD

Speicher dir das fuer spaeter.

#supplements #partnerlink #gesundheit

## Format
Type: Feed
"""


@pytest.fixture
def sample_with_em_dash():
    """Content containing em dashes (U+2014) that should fail G2."""
    return """# Reel: Abnehmen ab 40

## Hook
Du willst abnehmen \u2014 aber es klappt nicht?

## Script
Abnehmen ab 40 ist anders \u2014 dein Koerper braucht neue Strategien.
Probier stattdessen Krafttraining \u2014 3x pro Woche reicht.

## Caption
Abnehmen ab 40 funktioniert anders.

Dein Koerper veraendert sich \u2014 und die alten Methoden greifen nicht mehr.

Speicher dir das.

#abnehmenab40

## Format
Type: Reel
Duration: 20s
"""


@pytest.fixture
def sample_high_quality():
    """Well-crafted content designed to score 85+."""
    return """# Reel: 3 Fehler beim Krafttraining fuer Frauen ab 40

## Hook
Frauen ab 40: Diese 3 Fehler im Krafttraining kosten dich Muskelmasse

## Script
[0:00-0:03] Frauen ab 40: Diese 3 Fehler kosten dich Muskelmasse.
[0:03-0:08] Fehler Nummer 1: Du trainierst zu leicht. Dein Koerper braucht progressive Ueberlastung. Stattdessen steigere alle 2 Wochen das Gewicht.
[0:08-0:15] Fehler Nummer 2: Du machst kein Aufwaermtraining. Ohne Aufwaermen riskierst du Verletzungen. Mach deshalb 5 Minuten dynamisches Stretching.
[0:15-0:22] Fehler Nummer 3: Du isst zu wenig Protein. Studien zeigen: Frauen ab 40 brauchen 1,6g pro Kilo. Versuch morgens schon 30g zu schaffen.
[0:22-0:28] Aber zuerst: Welchen Fehler machst du? Schreib es in die Kommentare.
[0:28-0:30] Speicher dir dieses Video und schick es einer Freundin.

## Caption
Diese 3 Fehler sehe ich bei fast jeder Frau ab 40 im Gym.

Ich habe ueber 500 Frauen gecoacht und weiss: Mit 40+ aendern sich die Spielregeln. Dein Koerper braucht andere Reize als mit 25.

Fehler 1: Zu leichtes Training. Progressive Ueberlastung ist der Schluessel. Alle 2 Wochen das Gewicht steigern.

Fehler 2: Kein Aufwaermen. 5 Minuten dynamisches Stretching schuetzen deine Gelenke und verbessern deine Leistung.

Fehler 3: Zu wenig Protein. Forschung zeigt: 1,6g pro Kilo Koerpergewicht ist ideal ab 40. Starte morgens mit einem proteinreichen Fruehstueck.

Welchen Fehler hast du schon gemacht? Ich bin gespannt auf deine Antwort.

Speicher dir diese Tipps und schick sie einer Freundin, die auch trainiert.

#krafttrainingfrauen #frauenab40 #muskelaufbau #proteinreich #nicolstanzel

## Thumbnail
Text Overlay: "3 FEHLER im Krafttraining" in Playfair Display Bold. Hintergrund: Nicol mit Langhantel. Safe Zone beachtet: Text im oberen Drittel, kein Text im UI-Bereich.

## Format
Type: Reel
Duration: 30s
"""


@pytest.fixture
def sample_low_quality():
    """Poorly crafted content designed to score below 60."""
    return """# Reel: Fitness Tipps

## Hook
POV: du bist im Gym

## Script
Heute zeige ich euch mein Workout.
Wir machen Squats. Dann Lunges. Dann Planks.
Das war es.

## Caption
Gym day! #fitness #motivation #workout #gym #love #instagood #happy

## Format
Type: Reel
Duration: 10s
"""


@pytest.fixture
def sample_minimal():
    """Minimal content with just a hook line."""
    return """# Reel: Kurzer Tipp

## Hook
Trink mehr Wasser
"""


@pytest.fixture
def sample_json_posts():
    """List of post dicts mimicking Graph API response."""
    return [
        {
            "id": "post_001",
            "permalink": "https://instagram.com/p/ABC123",
            "type": "REEL",
            "timestamp": "2026-03-01T10:00:00+0000",
            "caption": "Krafttraining fuer Frauen ab 40. Speichern! #krafttraining #frauenab40",
            "metrics": {
                "likes": 450,
                "comments": 35,
                "saves": 120,
                "shares": 28,
                "reach": 5000,
                "total_interactions": 633,
                "avg_watch_time": 22.5,
            },
        },
        {
            "id": "post_002",
            "permalink": "https://instagram.com/p/DEF456",
            "type": "IMAGE",
            "timestamp": "2026-03-03T14:30:00+0000",
            "caption": "Mein Morgen-Smoothie Rezept. #smoothie #gesund",
            "metrics": {
                "likes": 200,
                "comments": 10,
                "saves": 45,
                "shares": 5,
                "reach": 3000,
                "total_interactions": 260,
            },
        },
        {
            "id": "post_003",
            "permalink": "https://instagram.com/p/GHI789",
            "type": "CAROUSEL_ALBUM",
            "timestamp": "2026-03-05T09:00:00+0000",
            "caption": "5 Ernaehrungsmythen entlarvt. Teilen! #ernaehrung #mythen",
            "metrics": {
                "likes": 380,
                "comments": 55,
                "saves": 200,
                "shares": 65,
                "reach": 8000,
                "total_interactions": 700,
            },
        },
        {
            "id": "post_004",
            "permalink": "https://instagram.com/p/JKL012",
            "type": "REEL",
            "timestamp": "2026-02-28T18:00:00+0000",
            "caption": "Kontroverse Meinung zum Intervallfasten",
            "metrics": {
                "likes": 800,
                "comments": 150,
                "saves": 10,
                "shares": 5,
                "reach": 12000,
                "total_interactions": 965,
            },
        },
    ]
