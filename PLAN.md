# Project Plan

## Stack Choice

I chose Astro because the portfolio is mostly content: pages, case studies, and Markdown blog posts. Static output keeps the site fast and simple. Cloudflare Workers Static Assets fits the assignment because the same Worker project serves the built site and handles `/api/contact`.

Tailwind CSS v4 is used through PostCSS for a small utility-based design system. Vitest covers the contact validation logic because that is the main dynamic behavior.

## Pages to Ship

- Home
- About
- Projects index
- Three project case studies
- Blog index
- Two Markdown blog posts
- Contact
- Custom 404
- RSS feed at `/rss.xml`

## Explicit Cuts

- No authentication.
- No comments.
- No search, because there are only two posts.
- No CMS, because Markdown is enough at this scale.
- No guestbook or visit counter until the required basics are fully deployed.
- No custom domain requirement; a workers.dev URL is acceptable.

## Risks and Unknowns

- Real project repository links still need to be added.
- The deployed URL and public GitHub URL are not known yet.
- D1 storage needs a real Cloudflare database ID before production deploy.
- Cloudflare Web Analytics needs a token from the dashboard.
- Personal content should be reviewed by Sri Charan so the voice stays authentic.

These open items are tracked in `QUESTIONS.md` and `LINKS.md`.
