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
