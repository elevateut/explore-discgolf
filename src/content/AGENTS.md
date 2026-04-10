# Content Layer — Astro Content Collections

This directory is the **content layer** for the Explore Disc Golf site, powered by [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/) (Astro 5). Each subfolder is a collection defined in `config.ts` with a Zod schema that validates frontmatter at build time.

## How to add new content

1. Choose the correct collection folder (e.g., `explore-act/`, `resources/`).
2. Create a new `.md` (or `.mdx` for embedded components) file.
3. Add YAML frontmatter that matches the collection's schema (see below).
4. Write the body in Markdown. Use MDX only when you need interactive or embedded Astro/React components.
5. Astro will type-check the frontmatter automatically on build.

## Collections

### explore-act

Powers the educational "Explore the EXPLORE Act" section of the site. Each entry explains a facet of the legislation — its background, key provisions, or implementation guidance.

| Field       | Type     | Required | Notes                                          |
|-------------|----------|----------|-------------------------------------------------|
| slug        | string   | yes      | URL-safe identifier                             |
| title       | string   | yes      | Display title                                   |
| description | string   | yes      | Short summary for cards and meta tags           |
| order       | number   | yes      | Controls display order within the section       |
| section     | enum     | yes      | `"legislative"`, `"provisions"`, or `"implementation"` |

### resources

Powers downloadable engagement materials — one-pagers, letter templates, talking points, and guides that advocates can use when working with BLM field offices or elected officials.

| Field        | Type    | Required | Notes                                               |
|--------------|---------|----------|------------------------------------------------------|
| slug         | string  | yes      | URL-safe identifier                                  |
| title        | string  | yes      | Display title                                        |
| description  | string  | yes      | Short summary                                        |
| category     | enum    | yes      | `"template"`, `"one-pager"`, `"guide"`, or `"talking-points"` |
| downloadable | boolean | yes      | Whether a PDF/file download is available             |
| filePath     | string  | no       | Path to the downloadable file (e.g., `/downloads/…`) |

### case-studies

Showcases existing and proposed disc golf courses on BLM public lands. Each entry documents a specific course — its location, permitting journey, current status, and lessons learned.

| Field        | Type   | Required | Notes                                                  |
|--------------|--------|----------|--------------------------------------------------------|
| slug         | string | yes      | URL-safe identifier                                    |
| title        | string | yes      | Course name                                            |
| description  | string | yes      | Short summary                                          |
| blm_office   | string | yes      | Responsible BLM field office                           |
| state        | string | yes      | U.S. state                                             |
| status       | enum   | yes      | `"built"`, `"approved"`, `"proposed"`, or `"in-progress"` |
| course_holes | number | no       | Number of holes (if known)                             |
| date         | date   | yes      | Relevant date (opened, approved, proposed, etc.)       |

### news

Tracks project updates and advocacy milestones — site announcements, legislative progress, event recaps, and community wins.

| Field       | Type   | Required | Notes                        |
|-------------|--------|----------|------------------------------|
| slug        | string | yes      | URL-safe identifier          |
| title       | string | yes      | Headline                     |
| description | string | yes      | Short summary                |
| date        | date   | yes      | Publication date             |
| author      | string | no       | Author name                  |

## Source research

Existing research documents in the `/docs/` folder contain the raw source material that should be migrated into these collections. When writing new content entries, reference those docs for accuracy.

## Markdown and MDX

Content is written in standard Markdown. If you need to embed interactive Astro or framework components (maps, charts, interactive tables), rename the file to `.mdx` and import the component at the top of the file. The frontmatter schema stays the same regardless of file extension.
