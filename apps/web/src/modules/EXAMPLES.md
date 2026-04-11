# Module `_examples/` content convention

Every built module may ship an `_examples/` folder containing seed content
that matches the module's Astro content collections. The folder structure is:

```
apps/web/src/modules/<module>/_examples/<collection>/*.md
```

For example:

```
apps/web/src/modules/events/_examples/events/back-to-school-night.md
apps/web/src/modules/pta/_examples/board/president.md
apps/web/src/modules/pta/_examples/committees/fundraising.md
```

## Purpose

These files are **not** picked up at build time. They are templates — a
minimal "just enough to look populated" set of example entries that the Hub
(apps/hub/) or `pnpm setup` wizard can copy into the real content directory
at `apps/web/src/content/<collection>/` when a school enables a module.

This keeps the progressive-onboarding promise honest: when a PTA parent picks
"Active PTA" in the Hub editor, they should see a working page immediately,
not an empty one. Seed content is that bridge.

## Conventions

- Keep examples **generic** — no real school names, no real contact info. Use
  placeholders like "Your School" and "example@yourschool.org".
- Keep examples **short** — 2-3 files per collection is plenty. The goal is
  "proves the page works," not "complete content library."
- Keep frontmatter **aligned with the collection schema** in
  `apps/web/src/content/config.ts`. If the schema requires a field, the
  example must set it.
- The setup wizard / Hub is responsible for copying these files into the real
  content directory, not the build pipeline. Examples are version-controlled
  but not shipped.

## Modules without content collections

Some modules (currently `fundraising`) are driven entirely by
`school.config.json` fields rather than a content collection. Those modules
ship a single `_examples/README.md` describing the relevant config block.
