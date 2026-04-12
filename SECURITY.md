# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Schoolyard, **please report it
privately** rather than opening a public issue. Security reports are
critical to protecting the schools that use this platform.

### How to report

1. **GitHub private reporting** (preferred): Use [GitHub's private
   vulnerability reporting](../../security/advisories/new) on this
   repository. This keeps the conversation between you and the
   maintainers until a fix is released.

2. **Email**: Send details to **security@schoolyard.dev** with the
   subject line `[Schoolyard Security] <short description>`.

### What to include

- Description of the vulnerability and its impact
- Steps to reproduce or proof of concept
- Affected versions / components (web, mobile, edge function, RLS, etc.)
- Suggested fix, if you have one

### What to expect

- **Acknowledgement** within 48 hours of your report
- A fix target of **7 days** for critical issues (RLS bypass, auth bypass,
  data exposure), **30 days** for moderate issues
- Credit in the release notes unless you prefer to remain anonymous

### Scope

The following are **in scope**:

- Row-Level Security (RLS) policy bypass or misconfiguration
- Authentication / authorization flaws (role escalation, cross-tenant
  data access)
- Edge function vulnerabilities (contact-submit, donate, stripe-webhook,
  announce, volunteer-hours-export)
- XSS, CSRF, injection, or OWASP Top 10 vulnerabilities in the web app
- Secrets or credentials accidentally committed to the repository
- Dependency vulnerabilities with a plausible exploit path

The following are **out of scope**:

- Vulnerabilities in upstream Supabase, Astro, or Expo themselves (report
  those to their respective projects)
- Social engineering attacks
- Denial of service that requires infrastructure-level mitigation
- Issues in demo/seed data that do not affect production deployments

## Security Architecture

Schoolyard's security model is documented in `BACKEND.md` and `CLAUDE.md`.
Key design decisions:

- **Tenant isolation via RLS** — every table is scoped to `school_id` with
  row-level security policies enforced by Postgres, not application code.
- **Service role key restricted** — only edge functions and trusted Node
  scripts may use the service role key. It never appears in browser or
  mobile bundles.
- **RLS tests are release-blocking** — `supabase/tests/rls.spec.ts`
  verifies the full permission matrix before every merge.
- **No PII in client bundles** — user data flows through RLS-protected
  queries, never cached in static assets.
- **COPPA + FERPA aware** — no photos of children without explicit
  per-post opt-in. No advertising, tracking, or data sale.
