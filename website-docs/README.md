# Dongle Docs

The documentation site for [Dongle](https://dongle.app), deployed to **docs.dongle.app**.

Built with [Nextra 3](https://nextra.site/) (Next.js + MDX).

## Local Development

```bash
npm install
npm run dev
# → http://localhost:3001
```

## Structure

```
website-docs/
├── pages/
│   ├── index.mdx                  # Landing page
│   ├── getting-started/           # Quick start, setup, env, wallet
│   ├── api-reference/             # REST, GraphQL, auth, errors, rate-limiting
│   ├── components/                # Button, Card, Badge, Input
│   ├── service-contracts/         # Project/Review/Wallet/Draft/Stellar services
│   ├── integration-guides/        # Wallet, hooks, features, TypeScript SDK, Python SDK
│   ├── smart-contracts/           # Project/Review/Verification registry ABIs
│   ├── architecture/              # ADR 0001–0004
│   ├── types.mdx                  # TypeScript types reference
│   ├── testing.mdx                # Vitest + Playwright + a11y guide
│   ├── deployment.mdx             # CI/CD pipeline and production checklist
│   ├── contributing.mdx           # Commit conventions, PR template, code style
│   └── changelog.mdx              # Release history
├── theme.config.tsx               # Nextra theme (logo, nav, footer, search)
├── next.config.mjs                # Next.js + Nextra config
└── vercel.json                    # Vercel deployment config
```

## Deployment

| Event | Action |
|-------|--------|
| PR touching `website-docs/**` | Preview deploy via `deploy-docs.yml` |
| Merge to `main` | Production deploy to `docs.dongle.app` (requires approval in GitHub `docs-production` environment) |

## Adding a Page

1. Create a `.mdx` file in the appropriate `pages/` subdirectory.
2. Add the filename (without extension) to the sibling `_meta.json` with a display title.
3. The page appears automatically in the sidebar.

## Required Secrets (for deployment)

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel personal/team access token |
| `VERCEL_ORG_ID` | From `.vercel/project.json` after `vercel link` |
| `VERCEL_PROJECT_ID_DOCS` | Separate Vercel project for the docs site |

## Search

Full-text search is powered by [FlexSearch](https://github.com/nextapps-de/flexsearch), bundled with Nextra — no external service or API key required.

To upgrade to Algolia DocSearch, edit `theme.config.tsx` and uncomment the `search` config block.
