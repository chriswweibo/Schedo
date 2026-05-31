# Slot Selection UX — Two-Tap Range Design

**Date:** 2026-05-31  
**Status:** Approved

## Problem

`ProviderCalendar` lets customers toggle any individual hourly slot on or off using a `Set<string>`. There is no contiguity enforcement — a customer can select 10:00 and 14:00, leaving a 4-hour gap, and the booking link silently spans the full range (10:00–15:00). This creates bookings larger than intended with no warning.

## Goal

Replace the free-toggle multi-select with a **two-tap contiguous range selector** that:
- Enforces contiguous selection only
- Cannot span booked or blocked slots
- Shows a hover preview so the user knows what they are about to confirm
- Resets cleanly so the user can start over

## Interaction Model

Four states:

### 1. Idle
All available slots shown in solid blue. Booked slots shown crossed-out (amber). Blocked and outside slots shown greyed. No selection active. Click any available slot to anchor.

### 2. Anchored
The clicked slot is the **anchor** — highlighted with a focus ring. All other available slots on the same side of any blocker shift to lighter blue (clickable). Clicking the anchor again returns to Idle.

### 3. Hovering (preview)
While in Anchored state, hovering over any available slot shows a ghost-purple preview of the range between anchor and cursor. The preview cannot cross a booked or blocked slot — slots past a blocker show no preview effect and are not targetable.

### 4. Selected
Second click on a different available slot (reachable from anchor) **locks the range**. Both anchor and end are full indigo. The "Book" button appears below the grid showing `startTime–endTime · Nh`. Clicking anywhere in the grid resets to Idle.

## Boundary Rule

A range **may never cross a booked or blocked slot**. If the anchor is 10:00 and 12:00 is booked, the hover preview stops at 11:00 and clicking 13:00 or later has no effect. To book a slot on the other side of a blocker, the user must reset and anchor again.

## State Machine

```
IDLE
  └─ click available slot → ANCHORED (anchorKey = slot)

ANCHORED
  ├─ click anchor slot → IDLE
  ├─ hover slot (reachable) → show preview (anchorKey, hoverKey)
  └─ click slot (reachable, different from anchor) → SELECTED (startKey, endKey)

SELECTED
  └─ click anywhere in grid → IDLE
```

"Reachable" means: all slots between anchor and target (inclusive) have `status === 'available'`.

## Component Changes

**`components/provider/ProviderCalendar.tsx`** — only file changed.

Replace:
```ts
const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
```

With:
```ts
type SelectionState =
  | { phase: 'idle' }
  | { phase: 'anchored'; anchorKey: string }
  | { phase: 'selected'; startKey: string; endKey: string }

const [selection, setSelection] = useState<SelectionState>({ phase: 'idle' })
const [hoverKey, setHoverKey] = useState<string | null>(null)
```

**Helpers (pure functions, defined in the component file):**

- `getRange(slots, fromKey, toKey)` — returns the subarray of slots between two keys (order-independent). Returns `null` if any slot in the span is not `available`.
- `isReachable(slots, anchorKey, targetKey)` — returns `true` if `getRange` would succeed.

**Slot button logic:**
- Compute `inPreview: boolean` — slot is within range(anchorKey, hoverKey) when phase is anchored
- Compute `inSelection: boolean` — slot is within range(startKey, endKey) when phase is selected
- Style matrix:

| state | style |
|---|---|
| `outside` | stone-100, disabled |
| `booked` | amber-100, strikethrough, disabled |
| `blocked` | stone-200, disabled |
| `available` + idle | blue-50, hover:blue-100 |
| `available` + is anchor | indigo-600 + focus ring |
| `available` + in preview | indigo-400, slightly transparent |
| `available` + in selection (non-anchor) | indigo-600 |
| `available` + anchored but not reachable | blue-50, normal (no special cursor) |

**Book button (replaces old selectedKeys logic):**
```tsx
{selection.phase === 'selected' && (() => {
  const range = getRange(slots, selection.startKey, selection.endKey)!
  const startTime = range[0].startTime
  const endTime = range[range.length - 1].endTime
  return (
    <Link href={`/booking/${providerId}?date=...&start=${startTime}&end=${endTime}`}>
      Book {startTime}–{endTime} · {range.length}h
    </Link>
  )
})()}
```

**Reset on date change:** `useEffect` that resets `selection` to `{ phase: 'idle' }` whenever `selectedDate` changes (already implicit since slots reload, but make it explicit).

## What Does Not Change

- `getAllSlots` API and return shape — unchanged
- `/api/availability/[providerId]` route — unchanged
- `/api/bookings` route — unchanged
- `BookingForm` component — unchanged
- All existing tests — unchanged

## Testing

Add unit tests for the two pure helpers:

- `getRange` — returns correct subarray; returns `null` when a non-available slot is in the span
- `isReachable` — true for clear spans, false when blocked

No E2E tests required — the logic is fully unit-testable as pure functions.
