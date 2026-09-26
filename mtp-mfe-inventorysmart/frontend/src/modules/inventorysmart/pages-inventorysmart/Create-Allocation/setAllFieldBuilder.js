// A field is included in Set All only if its column config opts in via
// extra.includeInSetAll. Everything else is excluded by default.
export const isSetAllFieldIncluded = (column) =>
  column?.extra?.includeInSetAll === true;

// Flatten the (possibly nested) table config and keep only fields that are
// editable, visible and not deleted.
const flattenEditableColumns = (columns = []) => {
  const result = [];
  const walk = (cols) => {
    cols.forEach((col) => {
      if (col?.sub_headers?.length) {
        walk(col.sub_headers);
      } else if (col?.is_editable && !col?.is_hidden && !col?.is_deleted) {
        result.push(col);
      }
    });
  };
  walk(columns);
  return result;
};

// Map a table config column to the field shape expected by the Set All Form.
const transformColumnToSetAllField = (column) => {
  const field = {
    label: column.label,
    accessor: column.column_name,
    is_disabled: false,
    isSearchable: column.is_searchable ?? false,
  };
  switch (column.type) {
    case "list":
    case "dynamic-list":
      field.field_type = "list";
      field.isMulti = column.extra?.is_multi ?? false;
      field.options = column.options ?? column.extra?.options ?? [];
      break;
    case "percentage":
      field.field_type = "IntegerField";
      field.value_type = "percentage";
      if (column.extra?.min != null) field.min = column.extra.min;
      if (column.extra?.max != null) field.max = column.extra.max;
      break;
    case "int":
    case "float":
    default:
      field.field_type = "IntegerField";
      field.value_type = "number";
      if (column.extra?.min != null) field.min = column.extra.min;
      if (column.extra?.max != null) field.max = column.extra.max;
      break;
  }
  return field;
};

// Build the Set All fields dynamically from the table config.
// - Inclusion is opt-in via config (is_editable + extra.includeInSetAll).
// - Runtime options, prop gates and cross-field disabling come from ctx.
export const buildSetAllFieldsFromConfig = (columns = [], ctx = {}) => {
  const { isPO, runtimeOptions = {}, formData = {} } = ctx;

  const propGates = {
    dcs: () => !isPO,
  };

  const dynamicProps = {
    user_def_inv_perc: () => ({ isDisabled: formData.demand_type !== "Fixed" }),
    aps: () => ({ isDisabled: formData.demand_type !== "APS" }),
  };

  return flattenEditableColumns(columns)
    .filter((col) => isSetAllFieldIncluded(col))
    .filter((col) =>
      propGates[col.column_name] ? propGates[col.column_name]() : true
    )
    .sort((a, b) => (a.order_of_display ?? 0) - (b.order_of_display ?? 0))
    .map((col) => {
      const field = transformColumnToSetAllField(col);
      // Runtime-sourced options (keyed by column_name) override the config
      // options resolved in transformColumnToSetAllField.
      if (runtimeOptions[col.column_name] !== undefined) {
        field.options = runtimeOptions[col.column_name];
      }
      if (dynamicProps[col.column_name]) {
        Object.assign(field, dynamicProps[col.column_name]());
      }
      return field;
    });
};
