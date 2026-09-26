# Transfer Units Edit Logic

## Overview

This document describes the flow for editing `transfer_units` and how `remaining_source_oh` is managed across all scenarios.

---

## Core Concept

```
maxCap = current_transfer_units + remaining_source_oh
```

- When a user edits `transfer_units`, the new value is capped at `maxCap`.
- After any edit: `remaining_source_oh = maxCap - new_transfer_units`
- `remaining_source_oh` is **shared** across all rows with the same `source_store_code + size`.
- Parent row's `remaining_source_oh` = sum of all its children's `remaining_source_oh`.
- Grand total's `remaining_source_oh` = sum of all parent rows' `remaining_source_oh`.

---

## Files

| File                    | Role                                                                            |
| ----------------------- | ------------------------------------------------------------------------------- |
| `transferUnitsUtils.js` | Single source of truth for all transfer unit logic                              |
| `useStoreEditFlow.js`   | Hook managing edit flow in the main table (cell edit, SetAll, SetSelectedSizes) |
| `AddTransferPanel.jsx`  | "Add Transfer" panel with its own table and SetAll                              |

---

## Key Functions (transferUnitsUtils.js)

### `updateChildColumnValue(node, newValue, options)`

- Updates a single child node's `transfer_units`, capped by `maxCap`.
- Sets `remaining_source_oh = maxCap - cappedNewValue` on the node.
- Returns `{ delta, wasCapped, newRemainingOh }`.

### `resolveSourceStoreCode(node, otherData)`

- Single helper to resolve `source_store_code` from: `node.parent.data` → `node.data` → `otherData`.

### `syncRemainingSourceOh({ api, propagationMap, capField, setGrandTotalRow, totalDelta, colField })`

- **THE single source of truth for propagation.**
- `propagationMap`: `Map<"sourceStoreCode_size", newRemainingOhValue>`
- Pass 1: Updates `remaining_source_oh` on ALL child rows matching each key in `propagationMap`, collects their parents.
- Re-aggregates each affected parent's `remaining_source_oh` from its children.
- Refreshes affected cells.
- Pass 2: Computes grand total `remaining_source_oh` by summing all parent rows (`path.length === 1`).
- Updates `setGrandTotalRow` with both `transfer_units` delta and aggregated average `remaining_source_oh`.

### `bulkUpdateChildColumnValues({ api, getNewValue, setGrandTotalRow, nodes, otherData })`

- Iterates selected child nodes, calls `updateChildColumnValue` on each.
- Applies delta to parent nodes.
- Builds `propagationMap` (last-write-wins per key).
- Calls `syncRemainingSourceOh` once at the end.

### `bulkZeroParentColumnValues({ api, setGrandTotalRow, nodes, otherData })`

- Iterates selected parent nodes, zeroes all children's `transfer_units`.
- **Accumulates** `remaining_source_oh` using `propagationMap` as the running total.
  - If `propagationMap` already has a value for `srcCode_size`, uses THAT as the base (not the stale child value).
  - This handles the case where multiple parents share the same `source_store_code + size`.
- Re-aggregates each parent's `remaining_source_oh` from its children.
- Calls `syncRemainingSourceOh` once at the end.

### `refreshColumnCells(api, nodes, columns)`

- Accepts a single column string OR an array of columns.
- Handles both `Array` and `Set` for nodes.

### `applyDeltaToParent(parentNode, delta, options)`

- Adds delta to parent's `transfer_units` in-memory (no grid event).

---

## Scenarios

### 1. Single Cell Edit (`onCellValueChanged` in `useStoreEditFlow.js`)

```
User types new value
  → updateChildColumnValue(node, newValue, { oldValue })
  → applyDeltaToParent(parentNode, delta)
  → refreshColumnCells(api, [parentNode], [colField, capField])
  → syncRemainingSourceOh({ propagationMap: { "srcCode_size": newRemainingOh }, setGrandTotalRow, totalDelta: delta })
```

### 2. Set All - Enter Units (`handleSetAllApply` in `useStoreEditFlow.js`)

```
User enters units and clicks Apply
  → bulkUpdateChildColumnValues({ api, getNewValue: () => enterUnits, setGrandTotalRow, otherData })
    → For each selected child: updateChildColumnValue + applyDeltaToParent
    → Build propagationMap (srcCode_size → newRemainingOh)
    → refreshColumnCells on parent nodes
    → syncRemainingSourceOh (propagate + grand total)
```

### 3. Set All - Match Source Inventory (`handleSetAllApply` in `useStoreEditFlow.js`)

```
Same as Enter Units, but:
  → getNewValue: (data) => data.transfer_units + data.remaining_source_oh  (i.e., maxCap)
```

### 4. Set Selected Sizes - Zero (`handleSetSelectedSizesApply` in `useStoreEditFlow.js`)

```
User selects multiple parents and clicks "Set to Zero"
  → bulkZeroParentColumnValues({ api, setGrandTotalRow, otherData })
    → For each parent's children:
        - Read childOldValue (transfer_units being zeroed)
        - Compute restored = propagationMap[key] (if exists, accumulated) OR childNode.remaining_source_oh + childOldValue
        - Set transfer_units = 0, remaining_source_oh = restored
        - Update propagationMap[key] = restored
    → Re-aggregate parent remaining_source_oh from children
    → refreshColumnCells on parent nodes
    → syncRemainingSourceOh (propagate to ALL matching rows + grand total)
```

### 5. Add Transfer Panel - Set All (`handleSetAllApply` in `AddTransferPanel.jsx`)

```
User enters units in the Add Transfer panel
  → bulkUpdateChildColumnValues({ api, getNewValue: () => units })
    → Same flow as #2, but no setGrandTotalRow (flat table, no grand total)
```

---

## Important Edge Cases

### Multiple parents with same `source_store_code + size` (Zero scenario)

- When zeroing, if Parent A and Parent B both have children with `srcCode=185, size=10`:
  - Parent A's child has `transfer_units=10, remaining_source_oh=0` → restored = 10
  - Parent B's child has `transfer_units=0, remaining_source_oh=0` (stale, not yet propagated)
  - **Fix**: Use `propagationMap` as accumulator. Parent B reads `propagationMap['185_10'] = 10`, adds its own `childOldValue=0` → restored stays at 10.
- Without this fix, Parent B would overwrite with `0 + 0 = 0`, losing Parent A's restoration.

### Negative `remaining_source_oh`

- If `remaining_source_oh < 0`, `updateChildColumnValue` uses `capValue = 2` as fallback.

### Grand total calculation

- Always computed by **aggregating all parent rows** (`path.length === 1`), never by delta on `remaining_source_oh`.

---

## Data Structure

```
Grand Total Row (state, not in grid)
├── Parent Row (path.length === 1, has source_store_code, destination_store_code)
│   ├── Child Row (has sizes, transfer_units, remaining_source_oh)
│   ├── Child Row
│   └── ...
├── Parent Row
│   ├── Child Row
│   └── ...
└── ...
```

- `remaining_source_oh` is shared across all children with matching `source_store_code + size`.
- Parent `remaining_source_oh` = sum of its children.
- Grand total `remaining_source_oh` = sum of all parents.
