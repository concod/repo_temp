export const VIEW_BY_STORE = "byStore";
export const VIEW_BY_SIZE = "bySize";

export const EDIT_BY_STORE = "store";
export const EDIT_BY_SIZE = "size";

export const PACK_COUNT_SIZE = "Pack Count";
export const PACK_COUNT_ROW_BACKGROUND =
  "var(--OtherColor-Purple-100, #F4F1F9)";

/** Same visual treatment as create-store-transfer Grand Total (`getRowStyleForGrandTotal`). */
export const PACK_COUNT_ROW_STYLE = {
  backgroundColor: PACK_COUNT_ROW_BACKGROUND,
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: "21px",
  color: "#0D152C",
};

const normalizeSizeLabel = (value) =>
  String(value ?? "").trim().toLowerCase();

export const getPackCountRowStyle = (params) => {
  if (normalizeSizeLabel(params?.data?.size) === normalizeSizeLabel(PACK_COUNT_SIZE)) {
    return PACK_COUNT_ROW_STYLE;
  }
  return undefined;
};

/** Collapsed DC Inventory Overview shows this many cards before expand. */
export const DC_KPI_COLLAPSED_COUNT = 2;

/** Set-all size tab shows this many sizes before "View All". */
export const SET_ALL_SIZE_COLLAPSED_COUNT = 4;

export const KPI_BORDER_COLORS = {
  opening_inventory: "#8c906a",
  allocated_quantity: "#1789a5",
  available_quantity: "#7552ad",
};

export const KPI_FIELDS = [
  { key: "opening_inventory", labelKey: "inventorysmart.finalize.recommendation.openingInventory" },
  { key: "allocated_quantity", labelKey: "inventorysmart.finalize.recommendation.allocatedQuantity" },
  { key: "available_quantity", labelKey: "inventorysmart.finalize.recommendation.availableQuantity" },
];
