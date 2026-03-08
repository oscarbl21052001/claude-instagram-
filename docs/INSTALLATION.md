# Installation Guide

## Prerequisites

- **Claude Code** (required)
- **Python 3.12+** (optional, for analysis scripts)
- **Instagram API access** via MCP (for live data in `/ig analyze` and `/ig audit`)

## Quick Install

### From GitHub

```bash
curl -sL https://raw.githubusercontent.com/NicoJunk/claude-ig/main/install.sh | bash
```

### From Local Clone

```bash
git clone https://github.com/NicoJunk/claude-ig.git
cd claude-ig
bash install.sh
```

### Manual Install

Copy files to the correct locations:

```bash
# Main skill + references
cp -r skills/ig/ ~/.claude/skills/ig/

# Sub-skills
for skill in skills/ig-*/; do
  cp -r "$skill" ~/.claude/skills/$(basename "$skill")/
done

# Agents
cp agents/*.md ~/.claude/agents/

# Scripts (optional)
cp scripts/*.py ~/.claude/skills/ig/scripts/
```

## API Setup (for live data)

The skill works without API access (using general best practices), but live data
enables `/ig analyze`, `/ig audit`, and account-calibrated scoring.

### Option 1: Instagram Graph API (recommended)

1. Create a Meta Developer App at https://developers.facebook.com/
2. Add the Instagram Graph API product
3. Generate a Long-Lived User Token (valid 60 days)
4. Set environment variables:

```bash
# In .env or shell profile
export INSTAGRAM_ACCESS_TOKEN="your-long-lived-token"
export INSTAGRAM_USER_ID="your-user-id"
export INSTAGRAM_BUSINESS_ACCOUNT_ID="your-business-account-id"
```

**Token refresh:** Long-lived tokens expire after 60 days. Refresh before expiry:
```bash
curl -s "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=$INSTAGRAM_ACCESS_TOKEN"
```

### Option 2: Apify (fallback)

If the Graph API token is expired or unavailable, the skill falls back to Apify:

1. Create an account at https://apify.com/
2. Get your API token from Settings > Integrations
3. Set environment variable:

```bash
export APIFY_TOKEN="your-apify-token"
```

Install the Apify client: `pip install apify-client`

### Option 3: No API access

The skill still works for content creation (`/ig reel`, `/ig hook`, `/ig caption`, etc.)
without API access. Analysis features (`/ig analyze`, `/ig audit`) require at least one
data source. You can also provide data via JSON files.

## Post-Install

1. **Restart Claude Code** to activate the new skill
2. **Verify installation:** Type `/ig` and check that the command is recognized
3. **Test data access:** Run `/ig analyze` to verify API connectivity
4. **Populate baseline:** Customize `references/account-baseline.md` with your metrics

## Uninstall

```bash
# From repo directory
bash uninstall.sh

# Or manually
rm -rf ~/.claude/skills/ig/
rm -rf ~/.claude/skills/ig-*/
rm -f ~/.claude/agents/ig-*.md
```

## What Gets Installed

| Component | Location | Count |
|-----------|----------|-------|
| Orchestrator | `~/.claude/skills/ig/SKILL.md` | 1 |
| References | `~/.claude/skills/ig/references/*.md` | 12 |
| Sub-skills | `~/.claude/skills/ig-*/SKILL.md` | 13 |
| Agents | `~/.claude/agents/ig-*.md` | 6 |
| Scripts | `~/.claude/skills/ig/scripts/*.py` | (optional) |

## Updating

Re-run the installer to update all files:

```bash
cd claude-ig
git pull
bash install.sh
```

The installer overwrites existing files. Your reference files (especially
`account-baseline.md` with live metrics) will be reset to defaults. Back up
any customized reference files before updating.

## Troubleshooting

### Skill not recognized after install
- Restart Claude Code (required after installing new skills)
- Check that `~/.claude/skills/ig/SKILL.md` exists

### Instagram API errors
- **"Invalid OAuth 2.0 Access Token"**: Token expired. Refresh it (see API Setup above)
- **No data returned**: Check `INSTAGRAM_USER_ID` is the correct business account ID
- **Apify fallback**: Set `APIFY_TOKEN` as alternative data source
- **Neither available**: Use `--input` flag with a JSON file of exported post data

### Sub-skills not triggering
- Verify sub-skill files exist: `ls ~/.claude/skills/ig-*/SKILL.md`
- Each sub-skill needs its own directory with a SKILL.md file
