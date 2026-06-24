# shadcn/ui Migration — Design

**Date:** 2026-06-25
**Status:** Approved

## Problem

Schedo's shared UI primitives (`components/ui/Button`, `Input`, `Card`, `Badge`)
are hand-rolled. We want to adopt **shadcn/ui** as the component foundation,
take a modest visual refresh while keeping the green brand, and add dark mode —
without breaking the live production site (`schedo.me`, auto-deployed from
`master`).

The stack is already Next.js 14 (App Router) + Tailwind CSS; the only new piece
is shadcn/ui and its supporting libraries.

## Scope & Decisions

Settled during brainstorming:

- **Scope:** **Full migration** — replace all four custom primitives with
  shadcn/ui equivalents and update every call site (~15 files). `Logo` is kept
  (brand asset, no shadcn equivalent).
- **Visual target:** **Refresh, keep green brand** — adopt shadcn's default
  radii/shadows/spacing, but `--primary` stays the brand green (`#16a34a`).
- **Dark mode:** **In scope** — full dark palette, a theme toggle in the Navbar,
  and verification of every screen in both light and dark.
- **Rollout:** Isolated branch (`feature/shadcn-ui`) → Vercel **preview**
  verification (tests + build + Playwright click-through in both modes) → merge
  to `master` for the single production cutover. No work directly on `master`.

## A. Setup & dependencies

Run `npx shadcn@latest init` and add the four components plus what the toggle
needs. This introduces:

- `components.json` — shadcn config (style, base color = `neutral`, CSS
  variables = true, aliases `@/components`, `@/lib/utils`).
- `lib/utils.ts` — the `cn()` helper (`clsx` + `tailwind-merge`).
- Dependencies: `class-variance-authority`, `clsx`, `tailwind-merge`,
  `tailwindcss-animate`, `lucide-react`, `next-themes`, and the Radix primitives
  pulled in per component.
- Rewrites of `tailwind.config.ts` and `app/globals.css` to the CSS-variable
  theming system (see section B).

shadcn copies component source into the repo (`components/ui/*`), so these are
owned, editable files — not a runtime dependency.

## B. Theming (refresh + green brand + dark mode)

`app/globals.css` defines CSS variables under `:root` (light) and `.dark`
(dark). Key mappings:

- `--primary` → brand green `#16a34a` (HSL `142 71% 45%`) in both modes;
  `--primary-foreground` → white. This replaces the current Tailwind
  `primary` color extension; existing `text-primary` / `bg-primary` usages are
  migrated to the shadcn tokens (`text-primary` continues to work since
  `tailwind.config` maps `primary` → `hsl(var(--primary))`).
- Neutrals (`--background`, `--foreground`, `--muted`, `--border`, `--card`,
  etc.) use shadcn's `neutral` base — visually close to the current stone, and
  warmer than zinc.
- `--radius` adopts shadcn's default (`0.5rem`) for the refresh.
- Dark palette uses shadcn's standard dark neutrals with the same green primary.

The old `@layer base { body { @apply bg-stone-50 text-stone-900 } }` is replaced
by `@apply bg-background text-foreground`.

**Booking-status colors** (amber/green/red/stone) used by `Badge` are preserved
as explicit utility classes within the Badge variant definitions, tuned to read
correctly in both light and dark.

## C. Component mapping

The four primitives are replaced; `Logo` is retained (verified in dark mode via
its existing `textColor` prop).

| Current | shadcn | Migration notes |
|---|---|---|
| `Button` (`primary`/`secondary`/`ghost`) | `Button` | Map `primary→default`, `secondary→outline`, `ghost→ghost`. Update call sites where the variant name changes. Sizes default to shadcn's. |
| `Input` (`label`, `error` built in) | `Input` + `Label` | Provide a thin `Field` wrapper (`components/ui/field.tsx`) composing `Label` + `Input` + error text, preserving the current `<Input label= error= />` ergonomics so the ~6 forms change minimally (swap `Input`→`Field`). |
| `Card` (styled `div`) | `Card` | shadcn `Card` is also a styled `div` accepting `className`; existing `<Card className="p-6">` usages keep working. No forced restructure to `CardContent`. |
| `Badge` (booking-status variants) | `Badge` | Extend the shadcn Badge `cva` with `pending`/`confirmed`/`declined`/`cancelled` variants carrying the current colors, so `BookingRow` keeps its `<Badge variant={status}/>` API. |

**Filename casing (cross-OS correctness):** shadcn uses lowercase filenames
(`button.tsx`), but the current files are PascalCase (`Button.tsx`). Windows dev
is case-insensitive; Vercel's Linux build is **case-sensitive**. We standardize
on shadcn's lowercase filenames and update **all** imports
(`@/components/ui/button`, etc.) to match, so the production build does not break
on case mismatch. The rename is done via `git mv` to preserve history and avoid
case-only-rename pitfalls.

## D. Dark mode

- Wrap the app in `next-themes` `ThemeProvider` inside the existing
  `app/providers.tsx` (alongside the NextAuth `SessionProvider`), with
  `attribute="class"`, `defaultTheme="system"`, `enableSystem`.
- Add `suppressHydrationWarning` to `<html>` in `app/layout.tsx`.
- Add a **theme toggle** to `components/ui/Navbar.tsx`: a shadcn ghost
  `Button` with lucide `Sun`/`Moon` icons calling `setTheme`. It renders on all
  non-auth pages (where the Navbar shows) and is mounted-guarded to avoid
  hydration mismatch.

## E. Call-site migration

~15 files import the primitives (per `grep`): auth pages, booking pages,
dashboard (`DashboardClient`, `BookingRow`, settings), provider components
(`ProviderCard`, `CompletedJobCard`), `HomeSearchForm`, `SearchFilters`,
`BookingForm`, `GoogleButton`, `not-found`, `p/[slug]`, `booking/confirmation`.
Each: update import paths to lowercase, swap `Input`→`Field`, and adjust Button
variant names. `Logo` imports are unchanged.

## F. Testing & rollout

- **Unit:** existing 73 Jest tests are logic-focused (geo, availability, auth,
  calendar) and must stay green — they do not assert on UI primitives.
- **Build:** `npm run build` must pass (lint + typecheck), including on Vercel's
  Linux preview build (validates the casing change).
- **Visual/functional:** Playwright click-through (reusing the earlier audit
  scripts) on the **preview URL**, exercised in **both** light and dark:
  homepage, search → profile → booking flow, auth pages, dashboard, the new
  theme toggle, and the 404/privacy/terms pages.
- **Cutover:** merge `feature/shadcn-ui` → `master`; the GitHub→Vercel
  integration auto-deploys to `schedo.me`; verify the production site (incl.
  Google sign-in button) and both modes.

## Error Handling / Risks

| Risk | Mitigation |
|---|---|
| Case-only filename rename breaks Linux build | Standardize on lowercase shadcn names; `git mv`; verify on preview build before merge. |
| Dark-mode hydration flash/mismatch | `suppressHydrationWarning` on `<html>`; mounted-guard the toggle; `next-themes` `attribute="class"`. |
| `primary` token regressions (text-primary usages) | `tailwind.config` maps `primary`→`hsl(var(--primary))`; spot-check all `*-primary` usages in both modes. |
| Visual regressions on live site | All work on a branch; preview click-through in both modes before the single merge cutover. |
| Badge status colors unreadable in dark | Tune the four status variants explicitly for dark. |

## Out of Scope (v1)

- Replacing emoji category icons with lucide icons.
- Migrating the bespoke carousel/lightbox (`WorksCarousel`, `PastWorkGallery`)
  to shadcn `Dialog`.
- Adding shadcn components beyond the four primitives + the toggle.
- Any change to application logic, data model, or routes.

## Open Questions

None — scope, visual target, dark mode, and rollout are all settled above.
