# Project Copy Rule

- Never write em dashes or en dashes in customer-facing or marketing copy. Use commas, parentheses, colons, semicolons, or plain hyphens instead.

# Deployment Notes

- Live/dev separation is by GitHub repository, not by Cloudflare Pages branch names.
- The `live` Git remote points at the tracked public website repository. Do not push there unless explicitly asked to update the public live site.
- The `origin` Git remote points at the dev repository. It is okay for that dev repository to trigger a Cloudflare Pages deployment named "live"; that deployment is the untracked/dev website at https://f8dbaf70.dannys40th-dev.pages.dev.
