/**
 * Shared constants for the new-flow allocation edit / Set All logic.
 *
 * The only real difference between grains is the column-group prefix used in
 * the API column tree. Product details uses the `hle_*` prefixes; the store /
 * size grains use `allocated_quantity` / `remaining_dc_ata`. Centralising the
 * strings here keeps the per-view builders readable and prevents typos in the
 * `replace()` calls that derive one column key from another.
 */

// ── Product-details column groups ──
export const PRODUCT_ALLOC_QTY_GROUP = "hle_allocated_pack_qty";
export const PRODUCT_NET_AVAILABLE_GROUP = "hle_net_available_qty";
export const PRODUCT_MAX_ALLOC_PCT_GROUP = "max_alloc_pct";

// ── Store / size column groups ──
// The store and size grains group their allocation columns under
// `allocated_quantity`, with the matching availability under `remaining_dc_ata`.
export const ALLOC_QTY_GROUP = "allocated_quantity";
export const REMAINING_DC_ATA_GROUP = "remaining_dc_ata";

// Store-details top-level group (3-level tree: group → DC → eaches/packs/…).
// Leaf keys are `allocated_quantity_{DC}__eaches`; remaining uses a double
// underscore after the prefix (`remaining_dc_ata__{DC}__eaches`).
export const STORE_ALLOC_QTY_GROUP = "allocated_quantity_packs_eaches";
export const STORE_ALLOC_LEAF_PREFIX = "allocated_quantity_";
export const STORE_NET_AVAILABLE_GROUP = "remaining_dc_ata__";
export const STORE_MAX_ALLOC_PCT_GROUP = "max_alloc_pct__";

// ── Editable leaf suffixes ──
// Only eaches / packs may become editable on product details.
// pack_units and total stay read-only permanently.
export const EDITABLE_SUFFIXES = ["__eaches", "__packs"];
export const PACKS_SUFFIX = "__packs";

// Known pack-level suffixes on the store / size grains. Anything under
// `allocated_quantity` that does NOT end with one of these is a pack-type-id
// column (e.g. allocated_quantity__East DC__PK-3054466).
export const KNOWN_PACK_SUFFIXES = ["__eaches", "__packs", "__pack_units", "__total"];
export const TOTAL_SUFFIX = "__total";

// ── Pack types sent in the apply payload ──
export const PACK_TYPE_EACHES = "eaches";
export const PACK_TYPE_PACKS = "packs";

// ── Column labels shown in the grid / Set All fields ──
export const PACK_TYPE_LABELS = {
  [PACK_TYPE_EACHES]: "Eaches (Units)",
  [PACK_TYPE_PACKS]: "Pack Count",
};

// ── Apply view identifiers (the `view` field on the apply envelope) ──
export const EDIT_VIEW_PRODUCT_DETAILS = "product_details";
export const EDIT_VIEW_STORE_DETAILS = "store_details";
export const EDIT_VIEW_STORE_PRODUCT = "store_product";
export const EDIT_VIEW_STORE_PRODUCT_SIZE = "store_product_size";
export const EDIT_VIEW_PRODUCT_STORE = "product_store";
export const EDIT_VIEW_PRODUCT_STORE_SIZE = "product_store_size";
export const EDIT_VIEW_PRODUCT_SIZE = "product_size";
export const EDIT_VIEW_PRODUCT_SIZE_STORE = "product_size_store";

// ── User-facing messages ──
export const CAPPED_WARNING_MSG =
  "Incremental units were capped for a few combinations due to available unit constraints.";
