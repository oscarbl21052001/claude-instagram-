#!/usr/bin/env bash
set -euo pipefail

# claude-ig uninstaller
# Removes the Instagram content engine from ~/.claude/skills/ and ~/.claude/agents/

main() {
    local SKILL_DIR="${HOME}/.claude/skills"
    local AGENT_DIR="${HOME}/.claude/agents"

    echo ""
    echo "  ╔══════════════════════════════════════╗"
    echo "  ║        claude-ig Uninstaller          ║"
    echo "  ╚══════════════════════════════════════╝"
    echo ""

    # Remove main skill and references
    if [ -d "${SKILL_DIR}/ig" ]; then
        echo "→ Removing main skill: ig..."
        rm -rf "${SKILL_DIR}/ig"
    fi

    # Remove sub-skills
    echo "→ Removing sub-skills..."
    for skill in ig-reel ig-hook ig-caption ig-story ig-carousel ig-analyze ig-audit ig-competitor ig-calendar ig-strategy ig-affiliate ig-comment ig-repurpose; do
        if [ -d "${SKILL_DIR}/${skill}" ]; then
            rm -rf "${SKILL_DIR}/${skill}"
            echo "  - ${skill}"
        fi
    done

    # Remove agents
    echo "→ Removing agents..."
    for agent in ig-content ig-engagement ig-creative ig-growth ig-competitor ig-compliance; do
        if [ -f "${AGENT_DIR}/${agent}.md" ]; then
            rm "${AGENT_DIR}/${agent}.md"
            echo "  - ${agent}"
        fi
    done

    echo ""
    echo "  ╔══════════════════════════════════════╗"
    echo "  ║       Uninstall Complete!            ║"
    echo "  ╚══════════════════════════════════════╝"
    echo ""
    echo "  Restart Claude Code to complete removal."
}

main "$@"
