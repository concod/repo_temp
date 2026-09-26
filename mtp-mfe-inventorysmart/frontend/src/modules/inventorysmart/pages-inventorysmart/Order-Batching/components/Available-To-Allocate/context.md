# ATA (Available To Allocate) Exceedance Check — Feature Documentation

> **Keep this doc updated.** If you modify the ATA flow, update the relevant sections here so future developers get accurate context.

## Overview

The ATA Exceedance Check is a Primark/TAM-gated pre-finalization flow in Order Batching. When a user clicks "Save & finalize for order generation", the system checks whether allocated quantities exceed ATA limits. If violations exist, a BottomSheet modal opens for review, auto-adjustment, and plan finalization.

**ATA Formula:** `ATA = packs_available_qty − other_alloc_qty − reserve_qty`; `Excess = Allocated − ATA (when > 0)`

**Check Grain:** `(article, pack_type_id, dc_code)`

---

## Feature Gate

Gated by `order_batching_config.ata_exceedance_check_enabled` from the TAM config. Set in `routes.js` via `props.setOrderBatchingConfig()`, read from Redux in `ViewCurrentAllocationsTables.jsx`. When `false`, the finalize button proceeds with the existing popup flow — no ATA check runs.

---

## Architecture & Flow

```
User clicks "Save & finalize for order generation"
        │
        ▼
ataExceedanceCheckEnabled?
   ┌────┴────┐
   No        Yes
   │         │
   ▼         ▼
Normal    POST /session/ata-exceedance-check
finalize      │
popup    ┌────┴────┐
      has_violations?
       false      true
         │         │
         ▼         ▼
      Normal    ATA BottomSheet (two tabs)
      finalize       │
      popup     ┌────┴────┐
           Tab 1:      Tab 2:
         Violations   Allocation Plans
           │              │
      Auto-Adjust    Finalize Plans
      (ata-auto-     (save-summary with
       adjust API)    finalize_mode)
```

**On ATA check API error:** Falls back to normal finalize flow with a warning toast.

---

## File Structure

```
Available-To-Allocate/
├── index.js                     # Main component (BottomSheet + Tabs orchestration)
├── ViolationsTable.jsx          # Tab 1: violations table with auto-adjust
├── AllocationPlansTable.jsx     # Tab 2: plans table with finalize menu
├── AllocationCodesBadges.jsx    # Cell renderer: allocation code badges
├── AllocationCodesPanel.jsx     # Right-side panel: all allocation codes
├── ata-constants.js             # Column configs + string constants
├── ata-styles.js                # Centralized makeStyles definitions
├── ata-styles.css               # CSS overrides for impact-ui-v3 (must remain)
├── ata-mock-data.js             # Mock data (dev only, not imported in production)
└── ATA-FEATURE-DOCUMENTATION.md # This file

External files modified:
├── ViewCurrentAllocationsTables.jsx  # Parent: ATA state, handlers, rendering
├── ata-services.js                   # API service functions (redux-thunk pattern)
├── apiConstants.js                   # Endpoint URL constants
└── colours.js                        # Added: cararra, avocado, mandy
```

---

## API Contracts

**Base path:** `/api/v2/inventory-smart/order_batching`

Full request/response schemas are in `ob_ata_exceedance_gate_92d618cd.plan.md`. Key summary:

### Endpoints

| Endpoint | Purpose | Key Payload Fields |
|---|---|---|
| `POST /session/ata-exceedance-check` | Gate check | `session_id`, `cache_key`, `created_at`, `filters`, `meta` |
| `POST /session/ata-auto-adjust` | Reduce excess | Above + `adjust_all`, `violation_keys`, `allocation_codes_filter` |
| `POST /session/save-summary` | Finalize | Above + `finalize: true`, `finalize_mode`, `override_allocation_codes` |

### Auto-Adjust Payload Rules

- **Select all:** `adjust_all: true`, `violation_keys: []`
- **Partial selection:** `adjust_all: false`, `violation_keys` contains eligible row keys only
- **Response** replaces the full data set (violations + plans). Resolved rows have `excess_qty: 0`, `new_allocated_qty` set, `resolved: true`. Tab 2 returns only still-breached plans.

### Finalize Modes

| FE Action | `finalize_mode` | `override_allocation_codes` |
|---|---|---|
| Finalize All Plans | `all_override` | All plan codes |
| Finalize Resolved Plans | `resolved_only` | `[]` |
| Finalize Resolved & Selected Plans | `resolved_and_selected` | Checked Tab 2 codes |

**Clean path** (no violations): Omit `finalize_mode`/`override_allocation_codes` — existing save-summary behavior applies.

### Service & Constants

- Services: `frontend/src/modules/inventorysmart/services-inventorysmart/Order-Batching/ata-services.js`
- Constants: `ATA_EXCEEDANCE_CHECK` and `ATA_AUTO_ADJUST` in `apiConstants.js`

---

## Component Behaviors

### `index.js` (AvailableToAllocate)

- Orchestrates BottomSheet with two tabs. Manages `localAtaData` state (refreshed after auto-adjust).
- Appends `review_action: "Review recommendation >"` to plan rows (BE does not return it).
- Adds `violation_row_id` to each violation for ag-grid unique row ID.
- Clicking "+X" badge hides BottomSheet and opens `AllocationCodesPanel`; closing the panel re-shows the BottomSheet.

### `ViolationsTable.jsx` (Tab 1)

- **Adjust Allocation** appears when rows are selected. Disabled if all selected rows already have `new_allocated_qty`.
- **Adjust mode:** Sets `new_allocated_qty = ata` for eligible rows. Locks selection (reverts changes with a warning toast). Buttons become Cancel/Save.
- **Cancel:** Only resets rows newly adjusted in the current session (`newlyAdjustedIdsRef`). Previously saved values are preserved.
- **Save:** Calls `onAutoAdjust`. On success: clears adjust mode, deselects all rows, parent refreshes data from response.
- Custom `cellRenderer` on `allocation_codes` (badges) and `new_allocated_qty` (shows `-` for null).

### `AllocationPlansTable.jsx` (Tab 2)

- **Finalize Plans** button always visible. Opens a `Menu` (impact-ui-v3) with three options.
- Confirmation dialogs use `Prompt` (impact-ui-v3). Plan lists scroll at ~150px max height.
- When no plans exist, confirmation messages adjust accordingly.
- **Review action:** Uses ag-grid `LinkRenderer` via `type: "link"` + `is_editable: true`. `onClick` set on column config (same pattern as main table's `onTableCellClick`).
- Wraps table in `<Loader>` during finalize API calls.

### `AllocationCodesBadges.jsx`

- Shows first 2 badges + "+X" overflow. Badges use content-sized flex (`flex: "0 1 auto"`, `maxWidth: "fit-content"`).
- Tooltip only appears when text is truncated (checked on mouse enter via `scrollWidth > clientWidth`).

### `AllocationCodesPanel.jsx`

- Right-side `Panel` (impact-ui-v3) showing all allocation codes as badges.

---

## Integration with ViewCurrentAllocationsTables.jsx

**States added:** `ataExceedanceCheckEnabled`, `showATAComponent`, `ataData`, `ataCheckLoading`

**Three handler functions:**

1. `handleATAExceedanceCheck()` — Finalize button handler. Gates on config flag. Calls exceedance-check API. Shows ATA modal on violations, falls back to normal finalize otherwise.
2. `handleAutoAdjust(violationKeys, adjustAll)` — Builds full payload with session context (`session_id`, `cache_key`, `created_at`, `filters`, `meta`). On success, triggers `setInventorysmartReloadOrderBatchingData(true)` to refresh the main Order Batching table (so the underlying allocation data reflects the auto-adjust changes), then resets it to `false` after 1 second. Returns response data.
3. `handleFinalizePlans(finalizeMode, overrideAllocationCodes)` — Extends save-summary payload. On success: closes modal, clears data, triggers `handlePostLockRelease`.

**Review recommendation** uses the existing `onTableCellClick` handler which navigates to `/inventory-smart/create-allocation?step=2&allocation_code=${plan_code}` with `{ state: { isRedirectedFrom: "orderBatching" } }`.

---

## Known Constraints & Gotchas

1. **`review_action` not from BE.** Appended client-side in `index.js`. If BE adds it later, the fallback (`|| "Review recommendation >"`) handles it gracefully.

2. **`pack_type_id` vs `pack_id_size`.** The plan document says `pack_id_size` but backend returns `pack_type_id`. All code uses `pack_type_id`.

3. **`ata-styles.css` must remain.** Contains `!important` overrides for impact-ui-v3 internal classes (BottomSheet height, modal body positioning, badge heights). Cannot be achieved via `makeStyles`.

4. **Cancel preserves saved values.** `newlyAdjustedIdsRef` tracks which rows were modified in the current adjust session only. Previously saved `new_allocated_qty` values survive cancel.

5. **`hideSelectAllRecords` is conditional.** Set to `true` when row count <= page size (6), `false` when rows exceed one page.

6. **Mock data file retained but unused.** `ata-mock-data.js` has no imports in production. Kept for development reference.

7. **Colors added to `colours.js`.** `cararra` (#F6F6F3), `avocado` (#8C906A), `mandy` (#EC4C5C) — named via https://chir.ag/projects/name-that-color/.

8. **Main table refresh after auto-adjust.** `handleAutoAdjust` calls `setInventorysmartReloadOrderBatchingData(true/false)` to force the parent's server-side ag-grid store to re-fetch. This follows the same pattern used by `applySetAll`, `updateOrderStatus`, and other edit flows in the file. Without this, the main Order Batching table would show stale allocation quantities until a manual refresh.

9. **Duplicate `orderBatchingConfig` in `mapStateToProps`.** There were two `orderBatchingConfig` keys — one from `inventorySmartCommonService` (correct, written by `index.js`) and one from `inventorySmartOrderBatchingSummaryService` (incorrect, always `{}`). The second overwrote the first due to JS last-write-wins on duplicate keys, causing `ata_exceedance_check_enabled` to always be `undefined`. Fixed by removing the duplicate. If someone adds `orderBatchingConfig` mappings in the future, ensure there is only one.

---

## Figma References

- **Tab 1 Auto-Adjust:**
  - https://www.figma.com/design/L457wzTY1xirsY7NoTYADl/InventorySmart-UI-v3?node-id=45974-343588&m=dev
  - https://www.figma.com/design/L457wzTY1xirsY7NoTYADl/InventorySmart-UI-v3?node-id=46039-352074&m=dev
  - https://www.figma.com/design/L457wzTY1xirsY7NoTYADl/InventorySmart-UI-v3?node-id=46531-313109&m=dev
  - https://www.figma.com/design/L457wzTY1xirsY7NoTYADl/InventorySmart-UI-v3?node-id=46526-311939&m=dev
- **Tab 2 Finalize menu:**
  - https://www.figma.com/design/L457wzTY1xirsY7NoTYADl/InventorySmart-UI-v3?node-id=46039-353805&m=dev

---

## Coding Conventions

Maintain these for any ATA changes:

1. **No** console logs, unused imports/variables/functions, inline `style={{}}`, hardcoded colors, or direct `px` values.
2. **Styles** in `ata-styles.js` via `makeStyles`. Colors from `core/Styles/colours`. Dimensions via `pxToRem()`.
3. **UI components** from `impact-ui-v3`. **Tables** via `AgGridComponent` + `agGridColumnFormatter`.
4. **Services** follow redux-thunk pattern: `(postBody) => () => axiosInstance(...)`.
5. **Column configs** follow the format in `core/commonComponents/graphFilters/metrics-data.js`.
