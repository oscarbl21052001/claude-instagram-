# Contributing to claude-ig

Contributions are welcome! Here's how to help.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/claude-ig.git`
3. Install locally: `cd claude-ig && bash install.sh`
4. Make your changes
5. Test: `python3 -m pytest tests/ -v`
6. Submit a pull request

## What to Contribute

### High Impact
- New hook templates for `references/hook-library.md` (with performance data)
- Niche-specific examples (beauty, food, business, education)
- Algorithm signal updates as Instagram evolves
- Bug fixes in scoring scripts

### Reference Updates
- Update `references/algorithm-2026.md` when Instagram announces changes
- Add new format specs to `references/format-specs.md`
- Expand compliance rules for new jurisdictions

### Scripts
- Improve `analyze_post.py` and `score_content.py`
- Add new analysis scripts
- Write additional tests

## Code Style

- Python: Type hints, docstrings, PEP 8
- Markdown: ATX headings, pipe tables, reference links
- Shell: `set -euo pipefail`, quote variables

## Quality Gates

All content in this repo must pass the same Quality Gates the skill enforces:
- No em dashes (U+2014)
- No generic hashtags in examples
- No hardcoded account data (use `[placeholder]` syntax)
- All references must be niche-agnostic

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
