# GitHub Deploy Notes

## Canonical Apps Script

Use the root script:

`C:\Projects\Dannys40th\apps-script.gs`

That is the file to paste into Google Apps Script / Sheets. It has been updated to the single-sheet `Bookings` setup.

After pasting it into Apps Script:

1. Save
2. `Deploy -> Manage deployments -> Edit -> New version -> Deploy`
3. Keep the existing web app URL if you want, but it must be redeployed

## Real GitHub / Pages Repo

These are the files and folders that should go to the real public site repo:

- `index.html`
- `Tickets.html`
- `Costumes.html`
- `styles.css`
- `script.js`
- `visualiser2.js`
- `hero-debug-panel.js`
- `favicon.svg`
- `dannys-40th.ics`
- `apps-script.gs` (source-of-truth backup for the Sheets backend, even though GitHub Pages will not execute it)
- `images/`
- `Video/`

These are publish only if you intentionally want them public:

- `og-image.html`
- `svg-reference.html`
- `visualiser.html`
- `visualiser.js`
- `visualiser2.html`
- `visualiser2-pane.js`
- `presets/`

## Dev Repo Only

Keep these in the dev/back-up repo only, not the real public Pages repo:

- `.github/` if it is only for dev workflows
- `Claude-Design-14-06-26/`
- `_archive/`
- local AI/editor state like `.claude/` and `.playwright-mcp/`

Note: the dev repo is not a Pages repo on purpose. Because private Pages deployment is not available on the free plan, the dev repo is mainly for development and backup.

## Gitignore

These should stay in `.gitignore` because they are local/dev-only:

- `.claude/`
- `.playwright-mcp/`
- `.cursor/`
- `agent-transcripts/`
- `_archive/`
- `Claude-Design-14-06-26/`
- `Testing/`
- `screenshots/`
- `scripts/`
- `__pycache__/`
- `*.pyc`
- `.env`
- `.env.*`

## Current Remote

Current configured Git remote:

- `origin = https://github.com/DanPageGitHub/dannys40th-dev.git`

That is the dev repo, not the real public site repo.
