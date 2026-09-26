export const customSetAllField = (fieldId, fieldType, fieldName) => {
  return {
    accessor: fieldId,
    cellStyle: { padding: "0" },
    column_name: fieldId,
    editable: true,
    field: fieldId,
    field_type: fieldType,
    headerName: fieldName,
    id: fieldId,
    is_editable: true,
    is_required: true,
    label: fieldName,
    required: true,
    tooltipField: fieldName,
    type: fieldType,
  };
};

export const autoPopulateMandatoryProduct = {
  l2_name: ["l0_name", "l1_name"],
  l1_name: ["l0_name"],
};

export const savedFiltersSortOptions = [
  {
    label: "A - Z",
    value: "name@asc",
  },
  {
    label: "Z - A",
    value: "name@desc",
  },
  {
    label: "New to Old",
    value: "updated_at@desc",
  },
  {
    label: "Old to New",
    value: "updated_at@asc",
  },
];

export const EXPECTED_FILTER_DIMENSIONS = {
  custom: { order: 1, label: "custom" },
  product: { order: 2, label: "product" },
  store: { order: 3, label: "store" },
  sales: { order: 4, label: "sales" },
  dc: { order: 5, label: "dc" },
  product_store: { order: 6, label: "product_store" },
  new_sku: { order: 7, label: "new_sku" },
  old_sku: { order: 8, label: "old_sku" },
};

//Sorting Order
export const DESC_ORDER = "desc";
export const ASC_ORDER = "asc";

// Applications where empty state wrapper component is to be displayed
export const EMPTY_STATE_PRODUCTS = ["inventory-smart", "ada", "source-smart", "demand-smart", "size-smart"]