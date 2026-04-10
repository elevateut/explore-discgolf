# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Do not open a public issue.** Instead, email **security@elevateut.org** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

We will acknowledge receipt within 48 hours and provide a timeline for resolution.

## Scope

This policy covers the EXPLORE Disc Golf codebase and any deployed instances at explorediscgolf.org.

## What we consider in scope

- Authentication or authorization flaws
- Exposure of API keys or secrets
- Cross-site scripting (XSS) or injection vulnerabilities
- Insecure handling of user data
- Server-side request forgery (SSRF) via BLM API proxy or LLM tool calls

## What is out of scope

- BLM ArcGIS service availability or vulnerabilities (report to BLM)
- Third-party service issues (Supabase, Anthropic, MapLibre)
- Social engineering attacks against project maintainers

## API keys

This project uses API keys for Supabase, Anthropic (Claude), and optionally Gemini. These must never be committed to the repository. The `.env.example` file documents required variables; actual keys belong only in `.env` (which is gitignored).

If you find an exposed key in the repository history, report it immediately.
