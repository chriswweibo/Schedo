# Slot Selection UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-toggle multi-select in `ProviderCalendar` with a two-tap contiguous range selector that prevents non-contiguous bookings and cannot span booked/blocked slots.

**Architecture:** Two pure helper functions (`getRange`, `isReachable`) live in `lib/slotRange.ts` and are unit-tested independently. `ProviderCalendar.tsx` replaces its `Set<string>` selection state with a three-phase state machine (`idle → anchored → selected`) and uses the helpers to compute a preview set and a confirmed selection set on each render via `useMemo`.

**Tech Stack:** React (useState, useMemo, useEffect), TypeScript, Tailwind CSS. No new dependencies.

---

## File Map

| Action | File | What changes |
|---|---|---|
| Create | `lib/slotRange.ts` | `getRange` and `isReachable` pure helpers |
| Create | `__tests__/lib/slotRange.test.ts` | Unit tests for both helpers |
| Modify | `components/provider/ProviderCalendar.tsx` | State machine, hover preview, book button |

---

## Task 1: Pure helpers — tests first

**Files:**
- Create: `lib/slotRange.ts`
- Create: `__tests__/lib/slotRange.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/slotRange.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { getRange, isReachable } from '@/lib/slotRange'

const SLOTS = [
  { startTime: '09:00', endTime: '10:00', status: 'available' as const },
  { startTime: '10:00', endTime: '11:00', status: 'available' as const },
  { startTime: '11:00', endTime: '12:00', status: 'booked' as const },
  { startTime: '12:00', endTime: '13:00', status: 'available' as const },
  { startTime: '13:00', endTime: '14:00', status: 'available' as const },
]

describe('getRange', () => {
  it('returns slots between two available keys (forward order)', () => {
    const result = getRange(SLOTS, '09:00', '10:00')
    expect(result).not.toBeNull()
    expect(result!).toHaveLength(2)
    expect(result![0].startTime).toBe('09:00')
    expect(result![1].startTime).toBe('10:00')
  })

  it('returns slots between two available keys (reverse order)', () => {
    const result = getRange(SLOTS, '10:00', '09:00')
    expect(result).not.toBeNull()
    expect(result!).toHaveLength(2)
    expect(result![0].startTime).toBe('09:00')
  })

  it('returns a single-element array when fromKey === toKey', () => {
    const result = getRange(SLOTS, '09:00', '09:00')
    expect(result).not.toBeNull()
    expect(result!).toHaveLength(1)
    expect(result![0].startTime).toBe('09:00')
  })

  it('returns null when span crosses a non-available slot', () => {
    expect(getRange(SLOTS, '09:00', '12:00')).toBeNull()
  })

  it('returns null when fromKey is unknown', () => {
    expect(getRange(SLOTS, '99:00', '10:00')).toBeNull()
  })

  it('returns null when toKey is unknown', () => {
    expect(getRange(SLOTS, '09:00', '99:00')).toBeNull()
  })
})

describe('isReachable', () => {
  it('returns true for a clear contiguous span', () => {
    expect(isReachable(SLOTS, '09:00', '10:00')).toBe(true)
  })

  it('returns true when fromKey === toKey', () => {
    expect(isReachable(SLOTS, '09:00', '09:00')).toBe(true)
  })

  it('returns false when a booked slot is in the span', () => {
    expect(isReachable(SLOTS, '09:00', '12:00')).toBe(false)
  })

  it('returns false for unknown key', () => {
    expect(isReachable(SLOTS, '09:00', '99:00')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```
npx jest __tests__/lib/slotRange.test.ts
```

Expected: all tests FAIL with "Cannot find module '@/lib/slotRange'".

- [ ] **Step 3: Implement the helpers**

Create `lib/slotRange.ts`:

```ts
import type { TimeSlot } from '@/lib/availability'

/**
 * Returns the contiguous subarray of slots from fromKey to toKey (inclusive),
 * ordered chronologically. Returns null if either key is not found, or if any
 * slot in the span has a status other than 'available'.
 */
export function getRange(
  slots: TimeSlot[],
  fromKey: string,
  toKey: string,
): TimeSlot[] | null {
  const fromIdx = slots.findIndex((s) => s.startTime === fromKey)
  const toIdx   = slots.findIndex((s) => s.startTime === toKey)
  if (fromIdx === -1 || toIdx === -1) return null

  const start = Math.min(fromIdx, toIdx)
  const end   = Math.max(fromIdx, toIdx)
  const span  = slots.slice(start, end + 1)

  if (span.some((s) => s.status !== 'available')) return null
  return span
}

/** Returns true if getRange would succeed for the given keys. */
export function isReachable(
  slots: TimeSlot[],
  anchorKey: string,
  targetKey: string,
): boolean {
  return getRange(slots, anchorKey, targetKey) !== null
}
```

- [ ] **Step 4: Run tests — all must pass**

```
npx jest __tests__/lib/slotRange.test.ts
```

Expected: 10 tests PASS.

- [ ] **Step 5: Run full suite — no regressions**

```
npm test
```

Expected: all 24 + 10 = 34 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/slotRange.ts __tests__/lib/slotRange.test.ts
git commit -m "feat: add getRange/isReachable helpers for contiguous slot selection"
```

---

## Task 2: Update ProviderCalendar — state machine + hover preview

**Files:**
- Modify: `components/provider/ProviderCalendar.tsx`

- [ ] **Step 1: Replace imports and add SelectionState type**

At the top of `components/provider/ProviderCalendar.tsx`, make these changes:

Change line 2 from:
```ts
import { useState, useEffect } from 'react'
```
To:
```ts
import { useState, useEffect, useMemo } from 'react'
```

After the existing imports (after line 6), add:
```ts
import { getRange } from '@/lib/slotRange'
```

After the `interface TimeSlot` line (currently line 14), add the `SelectionState` type:
```ts
type SelectionState =
  | { phase: 'idle' }
  | { phase: 'anchored'; anchorKey: string }
  | { phase: 'selected'; startKey: string; endKey: string }
```

- [ ] **Step 2: Replace selectedKeys state with selection + hoverKey**

Inside the component body, find:
```ts
const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
```

Replace it with:
```ts
const [selection, setSelection] = useState<SelectionState>({ phase: 'idle' })
const [hoverKey, setHoverKey] = useState<string | null>(null)
```

- [ ] **Step 3: Update handleDayClick to reset selection**

Find inside `handleDayClick`:
```ts
setSelectedDate(day)
setSelectedKeys(new Set())
setLoadingSlots(true)
```

Replace with:
```ts
setSelectedDate(day)
setSelection({ phase: 'idle' })
setHoverKey(null)
setLoadingSlots(true)
```

- [ ] **Step 4: Add previewSet and selectionSet memos**

After the `handleDayClick` function and before the `return (`, add:

```ts
const previewSet = useMemo<Set<string>>(() => {
  if (selection.phase !== 'anchored' || !hoverKey || hoverKey === selection.anchorKey) {
    return new Set()
  }
  const range = getRange(slots, selection.anchorKey, hoverKey)
  if (!range) return new Set()
  return new Set(range.map((s) => s.startTime))
}, [slots, selection, hoverKey])

const selectionSet = useMemo<Set<string>>(() => {
  if (selection.phase !== 'selected') return new Set()
  const range = getRange(slots, selection.startKey, selection.endKey)
  if (!range) return new Set()
  return new Set(range.map((s) => s.startTime))
}, [slots, selection])
```

- [ ] **Step 5: Replace the slot grid rendering**

Find and replace the entire `{slots.map((slot) => { ... })}` block (currently lines 146–179) with:

```tsx
{slots.map((slot) => {
  const key = slot.startTime
  const isAvailable = slot.status === 'available'
  const isAnchor    = selection.phase === 'anchored' && selection.anchorKey === key
  const inPreview   = previewSet.has(key)
  const inSelection = selectionSet.has(key)

  let cls = 'h-8 rounded-lg text-[11px] font-medium transition-all '
  if (slot.status === 'outside')      cls += 'bg-stone-100 text-stone-300 cursor-default'
  else if (slot.status === 'booked')  cls += 'bg-amber-100 text-amber-700 cursor-default line-through'
  else if (slot.status === 'blocked') cls += 'bg-stone-200 text-stone-400 cursor-default'
  else if (isAnchor)                  cls += 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 ring-offset-1'
  else if (inSelection)               cls += 'bg-indigo-600 text-white shadow-sm'
  else if (inPreview)                 cls += 'bg-indigo-400 text-white opacity-75'
  else                                cls += 'bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer'

  return (
    <button
      key={key}
      type="button"
      disabled={!isAvailable}
      aria-label={`${slot.startTime} – ${slot.status}`}
      onMouseEnter={() => { if (isAvailable) setHoverKey(key) }}
      onMouseLeave={() => setHoverKey(null)}
      onClick={() => {
        if (!isAvailable) return

        if (selection.phase === 'idle') {
          setSelection({ phase: 'anchored', anchorKey: key })
          return
        }

        if (selection.phase === 'anchored') {
          if (key === selection.anchorKey) {
            setSelection({ phase: 'idle' })
            return
          }
          const range = getRange(slots, selection.anchorKey, key)
          if (range) {
            setSelection({
              phase: 'selected',
              startKey: range[0].startTime,
              endKey: range[range.length - 1].startTime,
            })
          }
          return
        }

        // phase === 'selected' — any click resets
        setSelection({ phase: 'idle' })
        setHoverKey(null)
      }}
      className={cls}
    >
      {slot.startTime}
    </button>
  )
})}
```

- [ ] **Step 6: Replace the Book button**

Find and replace the old `selectedKeys.size > 0 && ...` block (currently lines 182–194) with:

```tsx
{selection.phase === 'selected' && (() => {
  const range = getRange(slots, selection.startKey, selection.endKey)
  if (!range || range.length === 0) return null
  const startTime = range[0].startTime
  const endTime   = range[range.length - 1].endTime
  return (
    <Link
      href={`/booking/${providerId}?date=${format(selectedDate!, 'yyyy-MM-dd')}&start=${startTime}&end=${endTime}`}
      className="mt-3 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
    >
      Book {startTime}–{endTime} · {range.length}h
    </Link>
  )
})()}
```

- [ ] **Step 7: Run full test suite — no regressions**

```
npm test
```

Expected: all 34 tests PASS. (The component has no unit tests; correctness is verified manually in the next step.)

- [ ] **Step 8: Manual smoke test**

The dev server is already running at http://localhost:3000.

1. Navigate to any provider profile page (e.g. `/p/<slug>`).
2. Click a future date that has available slots — the grid loads.
3. Click one available slot — it should highlight with an indigo ring (anchored state).
4. Hover a nearby available slot — a ghost-indigo preview range should appear.
5. Click the same slot again — selection should reset to idle.
6. Click a slot, then hover and click a different available slot — the full range highlights and the "Book X–Y · Nh" button appears.
7. Verify the book button href contains the correct `start` and `end` query params.
8. If a booked slot sits between two available slots, hover past it — preview should stop at the boundary. Clicking past it should do nothing.
9. Click anywhere in the grid while a range is selected — resets to idle.

- [ ] **Step 9: Commit**

```bash
git add components/provider/ProviderCalendar.tsx
git commit -m "feat: two-tap contiguous slot range selection with hover preview"
```
