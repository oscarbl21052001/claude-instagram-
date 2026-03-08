#!/usr/bin/env bash
set -euo pipefail

# claude-ig installer
# Installs the Instagram content engine to ~/.claude/skills/ and ~/.claude/agents/
#
# One-command install:
#   curl -sL https://raw.githubusercontent.com/NicoJunk/claude-ig/main/install.sh | bash

TEMP_DIR=""

main() {
    local SKILL_DIR="${HOME}/.claude/skills"
    local AGENT_DIR="${HOME}/.claude/agents"
    local SCRIPT_DIR

    echo ""
    echo "  ╔══════════════════════════════════════╗"
    echo "  ║         claude-ig Installer           ║"
    echo "  ║  Instagram Content Engine for Claude  ║"
    echo "  ╚══════════════════════════════════════╝"
    echo ""

    # Determine source directory (local clone or piped from curl)
    if [ -f "${BASH_SOURCE[0]:-}" ] && [ -d "$(dirname "${BASH_SOURCE[0]}")/skills/ig" ]; then
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    else
        echo "→ Cloning claude-ig..."
        TEMP_DIR="$(mktemp -d)"
        trap 'rm -rf "${TEMP_DIR}"' EXIT
        git clone --depth 1 https://github.com/NicoJunk/claude-ig.git "${TEMP_DIR}/claude-ig" 2>/dev/null
        SCRIPT_DIR="${TEMP_DIR}/claude-ig"
    fi

    # Create directories
    echo "→ Creating directories..."
    mkdir -p "${SKILL_DIR}/ig/references"
    for skill in ig-reel ig-hook ig-caption ig-story ig-carousel ig-analyze ig-audit ig-competitor ig-calendar ig-strategy ig-affiliate ig-comment ig-repurpose; do
        mkdir -p "${SKILL_DIR}/${skill}"
    done
    mkdir -p "${AGENT_DIR}"
    mkdir -p "${SKILL_DIR}/ig/scripts"

    # Copy main skill
    echo "→ Installing main skill: ig..."
    cp "${SCRIPT_DIR}/skills/ig/SKILL.md" "${SKILL_DIR}/ig/SKILL.md"

    # Copy references
    echo "→ Installing reference files..."
    if ls "${SCRIPT_DIR}/skills/ig/references/"*.md &>/dev/null; then
        cp "${SCRIPT_DIR}/skills/ig/references/"*.md "${SKILL_DIR}/ig/references/"
    fi

    # Copy sub-skills
    echo "→ Installing sub-skills..."
    for skill_dir in "${SCRIPT_DIR}/skills/"*/; do
        skill_name="$(basename "${skill_dir}")"
        [ "$skill_name" = "ig" ] && continue
        if [ -f "${skill_dir}SKILL.md" ]; then
            cp "${skill_dir}SKILL.md" "${SKILL_DIR}/${skill_name}/SKILL.md"
            echo "  + ${skill_name}"
        fi
    done

    # Copy agents
    echo "→ Installing agents..."
    for agent_file in "${SCRIPT_DIR}/agents/"*.md; do
        if [ -f "${agent_file}" ]; then
            agent_name="$(basename "${agent_file}")"
            cp "${agent_file}" "${AGENT_DIR}/${agent_name}"
            echo "  + ${agent_name%.md}"
        fi
    done

    # Copy scripts
    if ls "${SCRIPT_DIR}/scripts/"*.py &>/dev/null; then
        echo "→ Installing scripts..."
        cp "${SCRIPT_DIR}/scripts/"*.py "${SKILL_DIR}/ig/scripts/"
        chmod +x "${SKILL_DIR}/ig/scripts/"*.py
    fi

    # Install Python dependencies
    if [ -f "${SCRIPT_DIR}/requirements.txt" ] && command -v pip3 &>/dev/null; then
        echo "→ Installing Python dependencies..."
        pip3 install --quiet -r "${SCRIPT_DIR}/requirements.txt" 2>/dev/null || \
        echo "  Skipped: Install manually with 'pip3 install -r requirements.txt'"
    fi

    echo ""
    echo "  ╔══════════════════════════════════════╗"
    echo "  ║       Installation Complete!         ║"
    echo "  ╚══════════════════════════════════════╝"
    echo ""
    echo "  Installed:"
    echo "    Main skill:   ig/ (orchestrator + references)"
    echo "    Sub-skills:   13 (content creation, analysis, strategy)"
    echo "    Agents:       6 specialists (audit parallelization)"
    echo "    Scripts:      Instagram analysis tools"
    echo ""
    echo "  Commands available:"
    echo "    /ig reel <topic>           Write a complete Reel"
    echo "    /ig hook <topic>           Generate and score hooks"
    echo "    /ig caption <topic>        Write optimized caption"
    echo "    /ig story <topic>          Plan Story sequence"
    echo "    /ig carousel <topic>       Plan Carousel"
    echo "    /ig analyze [post-url]     Analyze post performance"
    echo "    /ig audit                  Full content audit"
    echo "    /ig competitor <accounts>  Research competitors"
    echo "    /ig calendar               Editorial calendar"
    echo "    /ig strategy               Content strategy"
    echo "    /ig affiliate <partner>    Compliant affiliate content"
    echo "    /ig comment                Comment response strategy"
    echo "    /ig repurpose <post>       Cross-platform repurposing"
    echo ""
    echo "  Restart Claude Code to activate the new skill."
}

main "$@"
