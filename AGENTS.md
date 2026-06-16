# Project Copy Rule

- Never write em dashes or en dashes in customer-facing or marketing copy, including website copy, emails, PDFs, and other user-visible event text. Use commas, parentheses, colons, semicolons, or plain hyphens instead.
- Em dashes and en dashes are okay in code, internal comments, developer documentation, or other non-public implementation text when they are useful. Do not churn code just to remove them.

# Repository And Deployment Structure

- This project uses separate GitHub repositories for live and dev. Do not infer production safety from Cloudflare environment labels alone.
- `origin` is the dev repository: `https://github.com/DanPageGitHub/dannys40th-dev`.
- `live` is the tracked public website repository: `https://github.com/DanPageGitHub/dannys40th`.
- Push to `origin` for dev work unless the user explicitly asks to update the public live site.
- Do not push to `live` unless the user explicitly asks to update the public live site.

# Cloudflare Pages

- The dev repository has a Cloudflare Pages project for `dannys40th-dev.pages.dev`.
- In that Cloudflare project, the Production environment is built from the dev repo `main` branch.
- Preview deployments are created from non-main branches such as `codex/...`.
- It is okay for `origin/main` to trigger a Cloudflare deployment labelled "Production" or "live", because this is the dev Pages site, not the public tracked website.
- Current dev Pages production URL seen in Cloudflare: `https://f8dbaf70.dannys40th-dev.pages.dev`.
- If the user wants changes to appear on the dev Pages production URL, fast-forward `origin/main` in the dev repository.
- Preferred safe flow for dev Pages production:
  - commit changes on the working branch,
  - push the working branch to `origin`,
  - switch to local `main`,
  - `git pull origin main`,
  - `git merge --ff-only <working-branch>`,
  - `git push origin main`.
- A direct `git push origin HEAD:main` also updates the dev Pages production branch, but prefer the explicit fast-forward flow so local `main` matches the deployed dev state.

# Current Working Branch Pattern

- Codex branches should normally use the `codex/` prefix.
- The active development branch for the current ticket/email/plan work has been `codex/venue-booking-copy-previews`.
- After pushing a Codex branch to `origin`, Cloudflare will show it as a Preview deployment until it is merged or pushed to `origin/main`.

# Apps Script Backend

- `apps-script.gs` is the Google Apps Script backend source for ticket booking and emails.
- Editing `apps-script.gs` locally does not update the live Google Apps Script Web App. The user must paste or sync the code into Google Apps Script, save, test preview helpers, and redeploy the existing Web App deployment.
- Keep the existing Web App `/exec` URL unless intentionally changing `API_URL` in `Tickets.html`.
- Whenever a change touches `apps-script.gs`, final replies must remind the user that the Google Apps Script project still needs updating and redeploying before backend/email changes go live.
- Also mention the curl/API update option when relevant: the Apps Script API can update project content with `projects.updateContent`, but it needs an OAuth bearer token, the script ID, and a JSON payload containing every source file in the project. Manual paste or `clasp push` is usually safer unless the API workflow is already set up.
- Useful Apps Script preview helpers:
  - `sendTicketEmailPreviewsToMe`
  - `createTicketPdfPreviewFiles`

# Local Generated Or Untracked Files

- `previews/` contains local PDF/image previews and should normally stay untracked.
- `images/NotOnLiveSite/` contains local design or non-live assets and should normally stay untracked.
- `images/CampingMap - Backup-DoNotPutLive.jpg` is a local backup and should stay untracked unless the user explicitly asks otherwise.
