# Content Model

The entities the site is built around. Defined as TypeScript types and Zod schemas in
Phase 3; materialized as Prisma models in Phase 6.

**Nothing here exists yet.** This is the target shape.

## Shared fields

Every content entity carries:

| Field                     | Purpose                                                     |
| ------------------------- | ----------------------------------------------------------- |
| `id`                      | Primary key                                                 |
| `slug`                    | Stable public identifier, where the entity has a public URL |
| `status`                  | `DRAFT \| PUBLISHED` — public queries filter to `PUBLISHED` |
| `sortOrder`               | Manual ordering, editable from the CMS                      |
| `createdAt` / `updatedAt` | Timestamps                                                  |

Status, ordering, and timestamps are the CMS backbone. They are present from the first
schema because adding them later would touch every model and every query.

## V1 entities

### `Profile` (singleton)

Name, headline, short bio, long bio, location, availability, email, avatar. Exists so the
Home and About copy is editable without a deploy.

### `Project`

`slug`, `title`, `summary`, `description` (Markdown), `role`, `featured`, `startDate`,
`endDate`, `outcomes`, `challenges`, `repoUrl`, `liveUrl`, `coverImage`, `gallery[]`,
`tags: Tag[]`.

Project detail pages get the most design attention — they are what actually earns
interviews.

### ~~`Tag`~~ — not implemented

Originally planned as a shared model normalizing technologies across projects and skills.
`Project.tech` is a `String[]` instead. For seven projects and one editor, a join table
does not pay for itself. See `docs/decisions/0006` for when to revisit.

### `Experience`

The model that solves the two-kinds-of-experience problem:

```ts
kind:           "TECHNICAL" | "PROFESSIONAL"
engagementType: "INTERNSHIP" | "EMPLOYMENT" | "CONTRACT"
              | "PLATFORM_ENGAGEMENT" | "VOLUNTEER"
organization:   string | null   // the actual client or employer
platform:       string | null   // e.g. "Taskrabbit" — renders as "via Taskrabbit"
title, startDate, endDate, current, location, summary, highlights[], skills: Tag[]
```

`kind` selects the page section. `platform` being separate from `organization` is what keeps
the Taskrabbit terminology accurate — a platform is a channel, not an employer. Adding a new
engagement type of the same shape never requires a schema change.

### `Education`

Institution, degree, field, dates, GPA (optional), coursework, honors.

### `Skill`

`name`, `category`, `proficiency`, `yearsOfExperience`, optional link to a `Tag`.

### `ResumeVersion`

`label`, `fileUrl`, `isCurrent`, `uploadedAt`. Versioned rather than overwritten, so an
older resume is never lost.

### `SocialLink`

`platform`, `url`, `label`, `sortOrder`.

## Future models — NOT in the schema

Planned, but deliberately not created yet. The earlier claim that empty tables should exist
up front was wrong for standalone models: adding one later is a single routine migration.
See correction 1 in `docs/decisions/0006`.

- **`Service`** — `slug`, `name`, `summary`, `description`, `category`, `areasServed[]`,
  `startingRate`, `status`, `sortOrder`, `referralLinkId?`
- **`ServiceCategory`** — `name`, `slug`, `icon`, `sortOrder`
- **`ReferralLink`** — `slug`, `label`, `targetUrl`, `code?`, `campaign?`, `isDefault`,
  `serviceId?`
- **`ContactMessage`** _(Phase 9)_ — `name`, `email`, `message`, `sourceService?`,
  `referralSlug?`, hashed IP, `createdAt`, read/archived flags
- **`ReferralClick`** _(Phase 12, optional)_ — `referralLinkId`, `createdAt`, hashed IP,
  user agent, referer, landing path. Hashed IP and no cookie: enough for volume analytics,
  no consent banner, no personal data retained.

## Deliberately deferred

Blog `Post`, `Certification`, `Award`, internationalization, multi-user roles. Each is
purely additive — a new table and a new page — and none changes an existing model. That is
the test for whether something belongs in V1.
