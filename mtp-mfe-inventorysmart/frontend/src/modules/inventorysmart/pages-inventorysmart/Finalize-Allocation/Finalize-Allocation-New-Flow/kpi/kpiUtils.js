export const hasNestedSubHeaders = (subHeaders) =>
  Boolean(subHeaders?.some((subHeader) => subHeader.sub_headers?.length > 0));

export const formatGroupLabel = (label) =>
  label?.includes("DC_") ? `DC ${label.split("_")[1]}` : label;

export const getValueFromTableData = (tableData, columnName) => {
  if (!columnName || !tableData) return "N/A";
  return tableData[columnName] !== undefined ? tableData[columnName] : "N/A";
};

export const formatValue = (value, type, extra = {}) => {
  if (value === "N/A" || value === undefined || value === null) return "N/A";
  if (isNaN(Number(value))) return value;
  const numValue = Number(value);
  if (type === "percentage") {
    const multiplier = extra?.multiplier === true ? 1 : 100;
    const newVal = (numValue * multiplier).toFixed(2);
    return Number(newVal) % 1 === 0 ? Math.round(newVal) + "%" : newVal + "%";
  }
  if (Number.isInteger(numValue) || numValue % 1 === 0) {
    const intValue = Math.round(numValue);
    return intValue >= 1000
      ? intValue.toLocaleString("en-US")
      : String(intValue);
  }
  const formatted = numValue.toFixed(2);
  const formattedNum = Number(formatted);
  return formattedNum >= 1000
    ? formattedNum.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : formatted;
};

export const extractSubHeaderData = (config, tableData) => {
  if (!config?.sub_headers?.length) return [];

  const data = tableData || {};

  if (hasNestedSubHeaders(config.sub_headers)) {
    return config.sub_headers.map((groupSubHeader) => {
      if (groupSubHeader.sub_headers?.length > 0) {
        const sizeDetails = groupSubHeader.sub_headers.map((leafSubHeader) => ({
          label: leafSubHeader.label,
          column_name: leafSubHeader.column_name,
          type: leafSubHeader.type,
          extra: leafSubHeader.extra,
          value: data[leafSubHeader.column_name] || 0,
        }));

        const totalQuantity = sizeDetails.reduce(
          (sum, item) => sum + Number(item.value),
          0
        );

        return {
          label: formatGroupLabel(groupSubHeader.label),
          column_name: groupSubHeader.column_name,
          type: groupSubHeader.type,
          extra: groupSubHeader.extra,
          value: totalQuantity,
          sizeDetails,
        };
      }

      return {
        label: formatGroupLabel(groupSubHeader.label),
        column_name: groupSubHeader.column_name,
        type: groupSubHeader.type,
        extra: groupSubHeader.extra,
        value: data[groupSubHeader.column_name] || 0,
      };
    });
  }

  return config.sub_headers.map((subHeader) => ({
    label: subHeader.label,
    column_name: subHeader.column_name,
    type: subHeader.type,
    extra: subHeader.extra,
    value: data[subHeader.column_name] || 0,
  }));
};
