# Changelog

## [2.0.0] - 2026-03-08

### Added
- Full 5-layer architecture: Orchestrator, 13 Sub-Skills, 6 Agents, 12 References, 2 Scripts
- 5-category 100-point Content Quality Score with severity multipliers
- 7 Quality Gates (zero tolerance rules)
- Parallel audit with 6 specialized agents
- RAG-style on-demand reference loading
- `analyze_post.py`: Instagram Graph API + Apify fallback performance analysis
- `score_content.py`: Offline content quality scoring (5-category rubric)
- install.sh and uninstall.sh for one-command setup
- Niche detection for fitness, beauty, food, business, education, lifestyle, creator
- Instagram Graph API integration with graceful degradation

### Changed
- Complete architecture rebuild from monolithic skill to hub-and-spoke pattern
- Scoring system upgraded from 4 categories (30/25/25/20) to 5 categories (25/25/20/15/15)
- Moved from `instagram-intelligence` namespace to `ig` namespace
- All inline workflows extracted to dedicated sub-skills

### Removed
- XML-style `<procedure>`, `<critical>`, `<prohibited>` tags (replaced by structured markdown)
- Inline workflow definitions in orchestrator (moved to sub-skills)

## [1.0.0] - 2025-12-01

### Initial Release
- Monolithic `instagram-intelligence` skill
- 4-category scoring (Hook 30, Caption 25, Format 25, Algorithm 20)
- 7 reference files
- Basic routing via Sub-Skill Routing table
