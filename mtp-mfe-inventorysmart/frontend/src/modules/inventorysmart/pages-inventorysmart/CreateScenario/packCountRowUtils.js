const PACK_COUNT_SIZE_LABEL = "pack count";

/** Same visual treatment as create-store-transfer Grand Total (`getRowStyleForGrandTotal`). */
export const PACK_COUNT_ROW_STYLE = {
  backgroundColor: "#F4F1F9",
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: "21px",
  color: "#0D152C",
};

export const isPackCountRow = (row) => {
  if (!row) return false;
  const sizeLabel = String(row.size ?? row.size_name ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");
  return sizeLabel === PACK_COUNT_SIZE_LABEL;
};

export const getPackCountRowStyle = (params) =>
  isPackCountRow(params?.data) ? PACK_COUNT_ROW_STYLE : undefined;
