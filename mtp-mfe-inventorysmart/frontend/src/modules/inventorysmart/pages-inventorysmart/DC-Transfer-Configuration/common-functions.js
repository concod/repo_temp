import {
  DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN,
  DC_TRANSFER_CONFIGURATION_RULE_NAME_OPTIONS_FIELD,
  DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD,
  DC_TRANSFER_CONFIGURATION_UNIQUE_ROW_ID,
  DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES,
  NUMERIC_INLINE_FIELDS,
} from "./constants";

export const getColumnField = (column) =>
  column?.colId ||
  column?.colDef?.field ||
  column?.colDef?.accessor ||
  column?.field;

const isNonNegativeIntegerValue = (value) =>
  /^\d+$/.test(String(value ?? "").trim());

const parseNonNegativeInteger = (value) =>
  parseInt(String(value).trim(), 10);

const isRuleInlineColumn = (columnField) =>
  columnField === DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN ||
  columnField === DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD;

export const mapRulesToDropdownOptions = (rules = []) =>
  rules.map((rule) => {
    const ruleId = rule?.id ?? rule?.rule_id;
    const normalizedRuleId =
      ruleId === undefined || ruleId === null ? ruleId : String(ruleId);

    return {
      label: rule.rule_name,
      id: normalizedRuleId,
      value: normalizedRuleId,
    };
  });

const getRuleNameFromRow = (row) => {
  const ruleNameValue = row?.[DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN];
  if (ruleNameValue && typeof ruleNameValue === "object") {
    return ruleNameValue?.label ?? "";
  }
  return ruleNameValue ?? "";
};

export const findMatchedRuleOption = (row, ruleOptions = []) => {
  if (!row || !ruleOptions?.length) {
    return null;
  }

  const ruleId =
    row?.[DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD] ?? row?.rule_id;
  if (ruleId !== undefined && ruleId !== null && String(ruleId).trim() !== "") {
    const matchedById = ruleOptions.find(
      (option) => String(option.value) === String(ruleId)
    );
    if (matchedById) {
      return matchedById;
    }
  }

  const ruleName = String(getRuleNameFromRow(row)).trim();
  if (ruleName) {
    const normalizedRuleName = ruleName.toLowerCase();
    const matchedByName = ruleOptions.find(
      (option) =>
        String(option.label ?? "").trim().toLowerCase() === normalizedRuleName
    );
    if (matchedByName) {
      return matchedByName;
    }

    const matchedByNameAsId = ruleOptions.find(
      (option) => String(option.value) === ruleName
    );
    if (matchedByNameAsId) {
      return matchedByNameAsId;
    }
  }

  const rawRuleName = String(row?.rule_name ?? "").trim();
  if (rawRuleName && rawRuleName !== ruleName) {
    const normalizedRawRuleName = rawRuleName.toLowerCase();
    const matchedByRawRuleName = ruleOptions.find(
      (option) =>
        String(option.label ?? "").trim().toLowerCase() === normalizedRawRuleName
    );
    if (matchedByRawRuleName) {
      return matchedByRawRuleName;
    }
  }

  return null;
};

export const findRuleById = (ruleId, rules = []) => {
  if (ruleId === undefined || ruleId === null || String(ruleId).trim() === "") {
    return null;
  }

  return rules.find(
    (rule) => String(rule?.id ?? rule?.rule_id) === String(ruleId)
  );
};

const isRuleNameColumn = (column) =>
  column?.column_name === DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN ||
  column?.field === DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN;

export const configureRuleNameColumnDef = (cols, ruleOptions) => {
  const visit = (column) => {
    if (column?.sub_headers?.length) {
      column.sub_headers.forEach(visit);
    }

    if (!isRuleNameColumn(column)) {
      return;
    }

    column.type = "dynamic-list";
    column.is_editable = true;
    column.extra = {
      ...column.extra,
      width: 184,
      options: ruleOptions,
      options_column: DC_TRANSFER_CONFIGURATION_RULE_NAME_OPTIONS_FIELD,
      dropdownSearchable: true,
      onChangeCustomFunction: true,
    };
  };

  cols?.forEach(visit);
  return cols;
};

export const enrichRowWithRuleDropdownOptions = (
  row,
  ruleOptions,
  rules = [],
  includeDcCount = false
) => {
  const matchedOption = findMatchedRuleOption(row, ruleOptions);
  const resolvedRuleId =
    matchedOption?.value ??
    row?.[DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD] ??
    row?.rule_id;
  const normalizedRuleId =
    resolvedRuleId === undefined || resolvedRuleId === null
      ? resolvedRuleId
      : String(resolvedRuleId);
  const matchedRule = findRuleById(normalizedRuleId, rules);

  const resolvedRuleNameValue = matchedOption
    ? { label: matchedOption.label, value: matchedOption.value }
    : matchedRule?.rule_name
      ? {
          label: matchedRule.rule_name,
          value: normalizedRuleId,
        }
    : getRuleNameFromRow(row)
      ? {
          label: getRuleNameFromRow(row),
          value:
            normalizedRuleId ??
            getRuleNameFromRow(row),
        }
      : null;

  return {
    ...row,
    [DC_TRANSFER_CONFIGURATION_RULE_NAME_OPTIONS_FIELD]: ruleOptions,
    [DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD]: normalizedRuleId,
    rule_id: normalizedRuleId,
    [DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN]: resolvedRuleNameValue,
    ...(matchedRule?.fulfillment_type
      ? { fulfillment_type: matchedRule.fulfillment_type }
      : {}),
    ...(includeDcCount && matchedRule?.total_dc != null
      ? {
          total_dc: matchedRule.total_dc,
          [DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.TOTAL_DC]:
            matchedRule.total_dc,
        }
      : {}),
  };
};

const extractDropdownValue = (value) => {
  if (Array.isArray(value) && value?.[0]?.value !== undefined) {
    return value[0].value;
  }
  if (value?.value !== undefined) {
    return value.value;
  }
  return value;
};

export const getConfigurationSelectAllContext = (
  tableApi,
  selectedRowData = [],
  uniqueRowId = DC_TRANSFER_CONFIGURATION_UNIQUE_ROW_ID
) => {
  const checkConfiguration = tableApi?.checkConfiguration;
  const isAllRecordsSelected = Boolean(
    tableApi?.isSelectAllRecords ||
      checkConfiguration?.[checkConfiguration.length - 1]?.checkAll
  );

  if (isAllRecordsSelected) {
    const deselectedNodes =
      tableApi?.getRenderedNodes?.()?.filter((node) => !node?.selected) || [];
    const excludedRows = deselectedNodes
      .map((node) => node?.data?.[uniqueRowId])
      .filter((id) => id !== undefined && id !== null);

    return {
      isAllRecordsSelected: true,
      row_update: [],
      excluded_rows: excludedRows,
    };
  }

  return {
    isAllRecordsSelected: false,
    row_update: selectedRowData
      .map((row) => row?.[uniqueRowId])
      .filter((id) => id !== undefined && id !== null),
    excluded_rows: [],
  };
};

export const buildSetAllUpdateAttributes = (
  formData,
  rules = [],
  includeDcCount = false
) => {
  const attributes = [];
  const ruleId = extractDropdownValue(formData?.rule_id);

  if (ruleId !== undefined && ruleId !== null && ruleId !== "") {
    const selectedRule = rules.find(
      (rule) => String(rule?.id ?? rule?.rule_id) === String(ruleId)
    );
    attributes.push({
      attribute_name: DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.RULE_ID,
      attribute_value: selectedRule ? selectedRule.id : ruleId,
    });
    if (selectedRule?.fulfillment_type) {
      attributes.push({
        attribute_name:
          DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.FULFILLMENT_TYPE,
        attribute_value: selectedRule.fulfillment_type,
      });
    }
    if (includeDcCount && selectedRule?.total_dc != null) {
      attributes.push({
        attribute_name: DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.TOTAL_DC,
        attribute_value: selectedRule.total_dc,
      });
    }
  }

  const inventoryThreshold = formData?.source_dc_inventory_threshold;
  if (inventoryThreshold !== undefined && inventoryThreshold !== "") {
    attributes.push({
      attribute_name:
        DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.SOURCE_DC_INVENTORY_THRESHOLD,
      attribute_value: Number(inventoryThreshold),
    });
  }

  const poWindow = formData?.destination_dc_po_window;
  if (poWindow !== undefined && poWindow !== "") {
    attributes.push({
      attribute_name:
        DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.DESTINATION_DC_PO_WINDOW,
      attribute_value: Number(poWindow),
    });
  }

  return attributes;
};

export const getInlineComparableValue = (columnField, value) => {
  if (isRuleInlineColumn(columnField)) {
    return String(extractDropdownValue(value) ?? "");
  }
  return String(value ?? "");
};

export const getInlineUpdateAttributes = (
  columnField,
  value,
  rules = [],
  includeDcCount = false
) => {
  if (!columnField) {
    return null;
  }

  if (isRuleInlineColumn(columnField)) {
    const ruleId = extractDropdownValue(value);
    if (ruleId === undefined || ruleId === null || ruleId === "") {
      return null;
    }

    const selectedRule = rules.find(
      (rule) => String(rule?.id ?? rule?.rule_id) === String(ruleId)
    );
    const attributes = [
      {
        attribute_name: DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.RULE_ID,
        attribute_value: selectedRule ? selectedRule.id : ruleId,
      },
    ];

    if (selectedRule?.fulfillment_type) {
      attributes.push({
        attribute_name:
          DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.FULFILLMENT_TYPE,
        attribute_value: selectedRule.fulfillment_type,
      });
    }
    if (includeDcCount && selectedRule?.total_dc != null) {
      attributes.push({
        attribute_name: DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.TOTAL_DC,
        attribute_value: selectedRule.total_dc,
      });
    }

    return attributes;
  }

  if (NUMERIC_INLINE_FIELDS.has(columnField)) {
    if (!isNonNegativeIntegerValue(value)) {
      return null;
    }

    return [
      {
        attribute_name: columnField,
        attribute_value: parseNonNegativeInteger(value),
      },
    ];
  }

  return null;
};

export const buildInlineSetAllPayload = ({
  tableName,
  rowId,
  columnField,
  value,
  rules = [],
  includeDcCount = false,
}) => {
  const updateAttributes = getInlineUpdateAttributes(
    columnField,
    value,
    rules,
    includeDcCount
  );
  if (!updateAttributes?.length || rowId === undefined || rowId === null) {
    return null;
  }

  return {
    table_name: tableName,
    is_all_records_selected: false,
    row_update: [rowId],
    excluded_rows: [],
    update_attributes: updateAttributes,
  };
};

export const syncInlineRuleRowData = (
  data,
  columnField,
  value,
  rules = [],
  includeDcCount = false
) => {
  if (!data || !isRuleInlineColumn(columnField)) {
    return;
  }

  const ruleId = extractDropdownValue(value);
  const selectedRule = rules.find(
    (rule) => String(rule?.id ?? rule?.rule_id) === String(ruleId)
  );

  if (!selectedRule) {
    return;
  }

  data[DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD] = String(selectedRule.id ?? selectedRule.rule_id);
  data.rule_id = data[DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD];
  data[DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN] = {
    label: selectedRule.rule_name,
    value: data[DC_TRANSFER_CONFIGURATION_RULE_ID_FIELD],
  };
  if (selectedRule.fulfillment_type) {
    data.fulfillment_type = selectedRule.fulfillment_type;
  }
  if (includeDcCount && selectedRule.total_dc != null) {
    data.total_dc = selectedRule.total_dc;
    data[DC_TRANSFER_CONFIGURATION_SET_ALL_ATTRIBUTES.TOTAL_DC] =
      selectedRule.total_dc;
  }
};

export const applyRuleSelectionToCell = (
  cellNode,
  data,
  columnField,
  selectedOption,
  rules = [],
  includeDcCount = false
) => {
  syncInlineRuleRowData(
    data,
    columnField,
    selectedOption,
    rules,
    includeDcCount
  );
  if (cellNode?.setDataValue) {
    cellNode.setDataValue(
      columnField,
      data[DC_TRANSFER_CONFIGURATION_RULE_NAME_COLUMN]
    );
  }
};
