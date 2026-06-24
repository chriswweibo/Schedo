# shadcn/ui Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Schedo's four custom UI primitives (Button, Input, Card, Badge) with shadcn/ui, apply a modest visual refresh that keeps the green brand, and add dark mode — without breaking the live `schedo.me` deployment.

**Architecture:** Adopt shadcn/ui via a CSS-variable theme (shadcn **stone** base for warm neutrals + green `#16a34a` as `--primary`). Each primitive is migrated end-to-end in its own task (create the lowercase shadcn file, delete the old PascalCase file, update all call sites, build green, commit) so every commit is deployable. Dark mode is added with `next-themes` and a Navbar toggle. All work happens on `feature/shadcn-ui`, verified on a Vercel preview, then merged to `master` for the production cutover.

**Tech Stack:** Next.js 14.2 (App Router) · Tailwind CSS v3.4 · shadcn/ui · class-variance-authority · tailwind-merge · tailwindcss-animate · lucide-react · next-themes · Radix (`react-slot`, `react-label`).

**Spec:** `docs/superpowers/specs/2026-06-25-shadcn-ui-migration-design.md`

**Note (refinement of spec §B):** the spec mentions shadcn's `neutral` base "warmer than zinc". This plan uses the **stone** base instead — it is genuinely warm-tinted and closer to the app's existing stone palette, better honoring "keep the current warm look + green". This is the only deviation from the spec.

---

## File Structure

**Create:**
- `components.json` — shadcn config
- `lib/utils.ts` — `cn()` helper
- `components/ui/button.tsx`, `input.tsx`, `label.tsx`, `field.tsx`, `card.tsx`, `badge.tsx` — primitives
- `components/ui/theme-toggle.tsx` — dark-mode toggle

**Modify:**
- `tailwind.config.ts`, `app/globals.css` — CSS-variable theming
- `app/layout.tsx` — body tokens + `suppressHydrationWarning`
- `app/providers.tsx` — wrap with `next-themes` `ThemeProvider`
- `components/ui/Navbar.tsx` — add the toggle
- `components/dashboard/BookingRow.tsx` — Badge renders children
- ~14 call-site files — import path + variant updates (listed per task)

**Delete (replaced):**
- `components/ui/Button.tsx`, `Input.tsx`, `Card.tsx`, `Badge.tsx`

**Keep as-is:** `components/ui/Logo.tsx` (brand), `components/ui/Navbar.tsx` filename (PascalCase), `components/provider/ProviderCalendar.tsx` (its `bg-primary-light` keeps working — see Task 2).

---

## Task 1: Branch + dependencies

**Files:** `package.json`, `package-lock.json`

- [ ] **Step 1: Create the working branch**

Run:
```bash
git checkout -b feature/shadcn-ui
```
Expected: switched to a new branch `feature/shadcn-ui` (based on current HEAD, which includes the approved spec).

- [ ] **Step 2: Install dependencies**

Run:
```bash
npm install class-variance-authority clsx tailwind-merge tailwindcss-animate lucide-react next-themes @radix-ui/react-slot @radix-ui/react-label
```
Expected: packages added, no peer-dependency errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add shadcn/ui dependencies"
```

---

## Task 2: Theming foundation (config + CSS variables)

**Files:**
- Create: `components.json`, `lib/utils.ts`
- Modify: `tailwind.config.ts`, `app/globals.css`, `app/layout.tsx`

- [ ] **Step 1: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "stone",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 2: Create `lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

- [ ] **Step 3: Replace `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          light: 'hsl(var(--primary-light))',
          hover: 'hsl(var(--primary-hover))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

Note: `primary.light` and `primary.hover` are kept so the existing `bg-primary-light` in `ProviderCalendar.tsx:135` and any `*-primary-hover` keep working with zero changes.

- [ ] **Step 4: Replace `app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 20 14.3% 4.1%;
    --card: 0 0% 100%;
    --card-foreground: 20 14.3% 4.1%;
    --popover: 0 0% 100%;
    --popover-foreground: 20 14.3% 4.1%;
    --primary: 142 76% 36%;
    --primary-foreground: 0 0% 100%;
    --primary-light: 141 84% 93%;
    --primary-hover: 142 72% 29%;
    --secondary: 60 4.8% 95.9%;
    --secondary-foreground: 24 9.8% 10%;
    --muted: 60 4.8% 95.9%;
    --muted-foreground: 25 5.3% 44.7%;
    --accent: 60 4.8% 95.9%;
    --accent-foreground: 24 9.8% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 60 9.1% 97.8%;
    --border: 20 5.9% 90%;
    --input: 20 5.9% 90%;
    --ring: 142 76% 36%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 20 14.3% 4.1%;
    --foreground: 60 9.1% 97.8%;
    --card: 20 14.3% 4.1%;
    --card-foreground: 60 9.1% 97.8%;
    --popover: 20 14.3% 4.1%;
    --popover-foreground: 60 9.1% 97.8%;
    --primary: 142 70% 45%;
    --primary-foreground: 144 80% 10%;
    --primary-light: 142 40% 18%;
    --primary-hover: 142 70% 50%;
    --secondary: 12 6.5% 15.1%;
    --secondary-foreground: 60 9.1% 97.8%;
    --muted: 12 6.5% 15.1%;
    --muted-foreground: 24 5.4% 63.9%;
    --accent: 12 6.5% 15.1%;
    --accent-foreground: 60 9.1% 97.8%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 60 9.1% 97.8%;
    --border: 12 6.5% 15.1%;
    --input: 12 6.5% 15.1%;
    --ring: 142 70% 45%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 5: Update `app/layout.tsx` body classes**

Change the body line from:
```tsx
      <body className={`${inter.className} bg-stone-50 text-stone-900 min-h-screen`}>
```
to:
```tsx
      <body className={`${inter.className} min-h-screen`}>
```
(The `bg-background text-foreground` now comes from `globals.css`. `suppressHydrationWarning` is added in Task 7.)

- [ ] **Step 6: Verify the build still passes**

Run: `npm run build`
Expected: `✓ Compiled successfully`, lint + types pass. (Old custom primitives still exist and still work because `bg-primary`, `text-primary`, `bg-primary-light`, and `bg-stone-*` all still resolve.)

- [ ] **Step 7: Commit**

```bash
git add components.json lib/utils.ts tailwind.config.ts app/globals.css app/layout.tsx
git commit -m "feat: add shadcn/ui theming foundation (stone base + green primary + dark vars)"
```

---

## Task 3: Migrate Button

**Files:**
- Create: `components/ui/button.tsx`
- Delete: `components/ui/Button.tsx`
- Modify (imports + variants): `app/auth/login/page.tsx`, `app/auth/register/page.tsx`, `app/HomeSearchForm.tsx`, `app/not-found.tsx`, `app/booking/confirmation/page.tsx`, `app/search/SearchFilters.tsx`, `app/dashboard/DashboardClient.tsx`, `app/dashboard/settings/SettingsForm.tsx`, `components/booking/BookingForm.tsx`, `components/dashboard/BookingRow.tsx`, `components/provider/ProviderCard.tsx`, `components/auth/GoogleButton.tsx`

- [ ] **Step 1: Remove the old Button (avoids case-collision with `button.tsx` on Windows)**

Run:
```bash
git rm components/ui/Button.tsx
```

- [ ] **Step 2: Create `components/ui/button.tsx`**

```tsx
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

- [ ] **Step 3: Update Button import paths**

In every file listed above, change:
```tsx
from '@/components/ui/Button'
```
to:
```tsx
from '@/components/ui/button'
```
Verify none remain: `npx grep is fine, or:` run `grep -rn "components/ui/Button'" app components` → expect no results.

- [ ] **Step 4: Update variant names at call sites**

Our old variants map to shadcn as: `primary→default`, `secondary→outline`, `ghost→ghost` (unchanged).
Replace across `app/` and `components/`:
- `variant="secondary"` → `variant="outline"`  (in `GoogleButton.tsx`, `confirmation/page.tsx`, `SettingsForm.tsx`, `ProviderCard.tsx`)
- `variant="primary"` → `variant="default"`  (in `BookingRow.tsx` "Accept")

`variant="ghost"` (BookingRow "Decline") and no-variant buttons (submit buttons → default green) need no change.
Verify: `grep -rn 'variant="primary"\|variant="secondary"' app components` → expect no results.

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`. If a type error mentions a Button prop, confirm the variant rename in that file.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: migrate Button to shadcn/ui (primary→default, secondary→outline)"
```

---

## Task 4: Migrate Input → shadcn Input + Label + Field wrapper

**Files:**
- Create: `components/ui/input.tsx`, `components/ui/label.tsx`, `components/ui/field.tsx`
- Delete: `components/ui/Input.tsx`
- Modify: every file importing `Input` — `app/auth/login/page.tsx`, `app/auth/register/page.tsx`, `app/HomeSearchForm.tsx`, `app/search/SearchFilters.tsx`, `app/dashboard/settings/SettingsForm.tsx`, `components/booking/BookingForm.tsx`

- [ ] **Step 1: Remove the old Input**

```bash
git rm components/ui/Input.tsx
```

- [ ] **Step 2: Create `components/ui/input.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
```

- [ ] **Step 3: Create `components/ui/label.tsx`**

```tsx
'use client'
import * as React from 'react'
import * as LabelPrimitive from '@radix-ui/react-label'
import { cn } from '@/lib/utils'

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70', className)}
    {...props}
  />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }
```

- [ ] **Step 4: Create `components/ui/field.tsx` (preserves the old Input API)**

```tsx
import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FieldProps extends React.ComponentProps<'input'> {
  label?: string
  error?: string
}

const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, id, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={id}>{label}</Label>}
        <Input
          id={id}
          ref={ref}
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)
Field.displayName = 'Field'

export { Field }
```

- [ ] **Step 5: Swap call sites from `Input` to `Field`**

In each of the 6 files: change the import
```tsx
import { Input } from '@/components/ui/Input'
```
to
```tsx
import { Field } from '@/components/ui/field'
```
and rename every `<Input ... />` JSX tag to `<Field ... />` (props are identical: `label`, `error`, `className`, and all native input props pass through).
Verify: `grep -rn "components/ui/Input'\|<Input" app components` → expect no results.

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: migrate Input to shadcn Input/Label via Field wrapper"
```

---

## Task 5: Migrate Card

**Files:**
- Create: `components/ui/card.tsx`
- Delete: `components/ui/Card.tsx`
- Modify (import path only): `app/booking/[providerId]/page.tsx`, `app/booking/confirmation/page.tsx`, `app/p/[slug]/page.tsx`, `app/not-found.tsx`, `app/dashboard/settings/SettingsForm.tsx`, `components/provider/CompletedJobCard.tsx`

- [ ] **Step 1: Remove the old Card**

```bash
git rm components/ui/Card.tsx
```

- [ ] **Step 2: Create `components/ui/card.tsx`**

```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)} {...props} />
  )
)
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-2xl font-semibold leading-none tracking-tight', className)} {...props} />
  )
)
CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
)
CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
)
CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
)
CardFooter.displayName = 'CardFooter'

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
```

Note: existing `<Card className="p-6">` usages keep working — shadcn `Card` is a styled `div` that merges `className`. Visual change is `rounded-xl`→`rounded-lg` (intended refresh) and explicit `bg-card`/`text-card-foreground` tokens.

- [ ] **Step 3: Update Card import paths**

Change `from '@/components/ui/Card'` → `from '@/components/ui/card'` in the 6 files.
Verify: `grep -rn "components/ui/Card'" app components` → expect no results.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: migrate Card to shadcn/ui"
```

---

## Task 6: Migrate Badge

**Files:**
- Create: `components/ui/badge.tsx`
- Delete: `components/ui/Badge.tsx`
- Modify: `components/dashboard/BookingRow.tsx` (import path + render children)

- [ ] **Step 1: Remove the old Badge**

```bash
git rm components/ui/Badge.tsx
```

- [ ] **Step 2: Create `components/ui/badge.tsx`**

```tsx
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        pending: 'border-transparent bg-amber-100 text-amber-800 capitalize dark:bg-amber-950 dark:text-amber-300',
        confirmed: 'border-transparent bg-primary-light text-primary capitalize',
        declined: 'border-transparent bg-red-100 text-red-700 capitalize dark:bg-red-950 dark:text-red-300',
        cancelled: 'border-transparent bg-stone-100 text-stone-600 capitalize dark:bg-stone-800 dark:text-stone-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export type BadgeVariant =
  | 'default' | 'secondary' | 'destructive' | 'outline'
  | 'pending' | 'confirmed' | 'declined' | 'cancelled'

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

- [ ] **Step 3: Update `components/dashboard/BookingRow.tsx`**

Change the import:
```tsx
import { Badge, BadgeVariant } from '@/components/ui/Badge'
```
to:
```tsx
import { Badge, BadgeVariant } from '@/components/ui/badge'
```
And change the render (the new Badge shows children, not the variant name):
```tsx
      <Badge variant={status.toLowerCase() as BadgeVariant} />
```
to:
```tsx
      <Badge variant={status.toLowerCase() as BadgeVariant}>{status.toLowerCase()}</Badge>
```
Verify: `grep -rn "components/ui/Badge'" app components` → expect no results.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: migrate Badge to shadcn/ui with booking-status variants"
```

---

## Task 7: Dark mode (provider + toggle)

**Files:**
- Modify: `app/providers.tsx`, `app/layout.tsx`, `components/ui/Navbar.tsx`
- Create: `components/ui/theme-toggle.tsx`

- [ ] **Step 1: Wrap the app with `next-themes` in `app/providers.tsx`**

Replace the file contents with:
```tsx
'use client'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}
```

- [ ] **Step 2: Add `suppressHydrationWarning` to `<html>` in `app/layout.tsx`**

Change:
```tsx
    <html lang="en">
```
to:
```tsx
    <html lang="en" suppressHydrationWarning>
```

- [ ] **Step 3: Create `components/ui/theme-toggle.tsx`**

```tsx
'use client'
import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    return <Button variant="ghost" size="icon" aria-label="Toggle theme" className="h-9 w-9" />
  }

  const isDark = resolvedTheme === 'dark'
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className="h-9 w-9"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  )
}
```

- [ ] **Step 4: Add the toggle to `components/ui/Navbar.tsx`**

Add the import near the top:
```tsx
import { ThemeToggle } from '@/components/ui/theme-toggle'
```
Then place `<ThemeToggle />` as the first child inside the right-hand container `<div className="flex items-center gap-2">` (so it shows in both signed-in and signed-out states):
```tsx
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {session ? (
```

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add dark mode (next-themes) + navbar theme toggle"
```

---

## Task 8: Verify (tests, build, both-mode click-through)

**Files:** none (verification only)

- [ ] **Step 1: Unit tests**

Run: `npx jest`
Expected: all suites pass (73 tests; they cover logic, not UI primitives, so should be unaffected). If any UI-snapshot-style test fails, inspect and update it.

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: `✓ Compiled successfully`, lint + types clean.

- [ ] **Step 3: Start the app and click through both themes**

Run (background): `npm run dev -- -p 3007`
Then drive with a Playwright script (chromium installed at the global path used earlier) that, in BOTH light and dark (`localStorage.theme`), visits `/`, `/search`, a `/p/[slug]`, `/auth/login`, `/auth/register`, `/booking/confirmation?...`, `/privacy`, `/terms`, toggles the theme via the navbar button, and screenshots each. Confirm: no console errors, the green primary on buttons/links, readable text in dark mode, and Badge status colors legible in both modes.
Expected: every screen renders correctly in both themes; theme toggle flips `class="dark"` on `<html>`.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: dark-mode polish from both-theme click-through"
```
(Skip if no fixes were needed.)

---

## Task 9: Ship — preview verify, then production cutover

**Files:** none (release)

- [ ] **Step 1: Push the branch (triggers a Vercel preview deploy)**

```bash
git push -u origin feature/shadcn-ui
```
Expected: branch pushed; a **Preview** deployment appears in `npx vercel ls schedo` within ~1 min and reaches `● Ready`.

- [ ] **Step 2: Verify the preview deployment**

Get the preview URL (`npx vercel ls schedo`), then run the Task 8 click-through against that URL in both themes. Confirm the Google sign-in button still renders and routes (client `…rgdb84…`).
Expected: preview is visually correct in both modes; no regressions.

- [ ] **Step 3: Open a PR to master (production cutover)**

Pushing to `master` directly is blocked by branch protection; open a PR instead:
`https://github.com/chriswweibo/Schedo/compare/master...feature/shadcn-ui?expand=1`
Title: `Migrate UI to shadcn/ui (refresh + green brand + dark mode)`.
Merge it once the preview check looks good.

- [ ] **Step 4: Verify production after the merge auto-deploys**

After the merge, GitHub→Vercel auto-deploys `master` to `schedo.me`. Confirm:
```bash
curl -s --resolve schedo.me:443:76.76.21.21 -o /dev/null -w "%{http_code}\n" https://schedo.me
```
Expected: `200`. Then load `https://schedo.me`, toggle dark mode, and spot-check the booking flow. The migration is complete.

---

## Self-Review Notes

- **Spec coverage:** setup/deps (Task 1) → spec §A; theming with green primary + dark vars + preserved `primary-light` (Task 2) → §B; Button/Input/Card/Badge migration incl. `Field` wrapper, `Card` kept, Badge status variants, lowercase-filename rename via `git rm`+create (Tasks 3–6) → §C; dark mode provider + navbar toggle + `suppressHydrationWarning` (Task 7) → §D; call-site updates across all importing files (Tasks 3–6, file lists) → §E; tests + build + both-mode Playwright + branch→preview→PR→production (Tasks 8–9) → §F and the rollout decision. The `Logo` is intentionally untouched.
- **Deviation:** uses shadcn **stone** base instead of `neutral` (warmer, closer to current) — flagged at the top.
- **Type/name consistency:** `cn` (Task 2) used by all primitives; `Button`/`buttonVariants`, `Input`, `Label`, `Field`, `Card`+subcomponents, `Badge`/`BadgeVariant` named exports match their import sites; variant rename (`primary→default`, `secondary→outline`) applied consistently in Task 3; `BadgeVariant` re-exported so `BookingRow` keeps compiling.
- **Cross-OS:** every old PascalCase primitive is removed with `git rm` before the lowercase file is created, and all imports are switched to lowercase — no case-only rename, so Vercel's Linux build won't break.
- **Build-green-per-task:** each migration task deletes the old file, adds the new one, fixes all its call sites, and builds before committing — no task leaves the tree non-building.
```
