export const createPayloadForRuleResolution = (dependencyData, values) => {
  return dependencyData.map((item) => ({
    attribute_name: item.column_name,
    check_configuration: [{checkedRows: values[item.column_name]}],
    dimension: item.dimension,
    display_order: item.display_order,
    display_type: item.display_type,
    extra: item.extra,
    filter_id: item.column_name,
    filter_name: item.label,
    filter_type: item.filter_type,
    is_mandatory: item.is_mandatory,
    operator: item.operator || "in",
    values: values[item.column_name]
  }));
}