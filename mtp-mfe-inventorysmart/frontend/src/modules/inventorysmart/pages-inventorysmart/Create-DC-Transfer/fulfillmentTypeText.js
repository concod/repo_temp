import { FULFILLMENT_TYPE_TAG_MAP } from "../DC-Transfer-Configuration/constants";
import { isFulfillmentTypeColumnDef } from "../DC-Transfer-Configuration/fulfillmentTypeColumn";

export const formatFulfillmentTypeText = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  const normalizedKey = String(value).toLowerCase();
  return FULFILLMENT_TYPE_TAG_MAP[normalizedKey]?.label ?? String(value);
};

export const applyFulfillmentTypeTextColumn = (columns = []) =>
  columns.map((column) => {
    let nextColumn = { ...column };

    if (nextColumn.children?.length) {
      nextColumn.children = applyFulfillmentTypeTextColumn(nextColumn.children);
    }

    if (nextColumn.sub_headers?.length) {
      nextColumn.sub_headers = applyFulfillmentTypeTextColumn(
        nextColumn.sub_headers
      );
    }

    if (!isFulfillmentTypeColumnDef(nextColumn)) {
      return nextColumn;
    }

    return {
      ...nextColumn,
      is_editable: false,
      editable: false,
      type: "str",
      valueFormatter: (params) => formatFulfillmentTypeText(params?.value),
      cellRenderer: (params) => formatFulfillmentTypeText(params?.value),
    };
  });
