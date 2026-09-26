import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { cloneDeep, isNumber } from "lodash";
import {
  ERROR_MESSAGE,
  INVALID_MIN_QTY,
  INVALID_ORDER_MULTIPLE,
  MAX_MIN_VALIDATION,
  MIN_MAX_VALIDATION,
  UPDATED_MESSAGE,
} from "modules/oms/constants-oms/stringConstants";
import CellRenderers from "core/Utils/agGrid/cellRenderer";

export const validateUserInputThreshold = (
  data,
  OMS_VENDOR_CONSTRAINTS_CONSTANTS
) => {
  const SETALL_FORMDATA_FIELDS =
    OMS_VENDOR_CONSTRAINTS_CONSTANTS?.setall_formdata_fields || [];
  const THRESHOLD_MIN_VALUE =
    SETALL_FORMDATA_FIELDS?.filter((data) => data.accessor === "moq_tolerance")
      ?.min_value || 0;
  const THRESHOLD_MAX_VALUE =
    SETALL_FORMDATA_FIELDS?.filter((data) => data.accessor === "moq_tolerance")
      ?.max_value || 100;

  let validatedUserInputThreshold = 0;
  if (data.moq_tolerance < THRESHOLD_MIN_VALUE) {
    validatedUserInputThreshold = THRESHOLD_MIN_VALUE;
  }
  if (data.moq_tolerance > THRESHOLD_MAX_VALUE) {
    validatedUserInputThreshold = THRESHOLD_MAX_VALUE;
  }
  if (Math.round(data.moq_tolerance) !== data.moq_tolerance) {
    validatedUserInputThreshold = Math.round(data.moq_tolerance);
  }
  return validatedUserInputThreshold;
};

export const createPayloadItem = (
  data,
  RULES_CONSTRAINTS_ROW_ID,
  SETALL_MAPPING
) => {
  let payloadObject = {};
  payloadObject[RULES_CONSTRAINTS_ROW_ID] = data?.[RULES_CONSTRAINTS_ROW_ID];
  for (let rowKey in data) {
    if (
      data.hasOwnProperty(rowKey) &&
      Object.keys(SETALL_MAPPING).includes(rowKey)
    ) {
      payloadObject[rowKey] = data[rowKey];
    }
  }
  return payloadObject;
};

export const onOMSGridFieldsChange = (
  _e,
  data,
  column,
  isChanged,
  agGridInstance,
  OMS_VENDOR_CONSTRAINTS_CONSTANTS,
  rulesConstraintsEditPayload,
  displaySnackMessages
) => {
  const RULES_CONSTRAINTS_ROW_ID =
    OMS_VENDOR_CONSTRAINTS_CONSTANTS?.unique_key || "rule_code";

  const MINIMUM_QTY_MIN_VALUE =
    OMS_VENDOR_CONSTRAINTS_CONSTANTS?.setall_formdata_fields?.filter(
      (data) => data.accessor === "min_replenishment_quantity"
    )?.min_value || 0;

  const ORDER_MULTIPLE_MIN_VALUE =
    OMS_VENDOR_CONSTRAINTS_CONSTANTS?.setall_formdata_fields?.filter(
      (data) => data.accessor === "order_multiple"
    )?.min_value || 1;

  const SETALL_MAPPING = OMS_VENDOR_CONSTRAINTS_CONSTANTS?.setall_mapping || {};
  if (column.colId === "level_of_application") {
    let isEditedBefore = false;
    rulesConstraintsEditPayload.current = rulesConstraintsEditPayload.current.map(
      (code) => {
        if (code[RULES_CONSTRAINTS_ROW_ID] === data[RULES_CONSTRAINTS_ROW_ID]) {
          const updatedNode = { ...code };
          let validatedLevel = data?.level_of_application;
          if (validatedLevel) {
            agGridInstance.current.api.forEachNode((node) => {
              if (
                node.data[RULES_CONSTRAINTS_ROW_ID] ===
                data?.[RULES_CONSTRAINTS_ROW_ID]
              ) {
                if (node.data.level_of_application !== validatedLevel) {
                  node.data.level_of_application = validatedLevel;
                }
              }
              agGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: [column.colId],
              });
            });
          }

          updatedNode.level_of_application = data.level_of_application;
          isEditedBefore = true;
          return updatedNode;
        }
        return code;
      }
    );
    if (!isEditedBefore) {
      let validatedLevel = data?.level_of_application;

      if (validatedLevel) {
        agGridInstance.current.api.forEachNode((node) => {
          if (
            node.data[RULES_CONSTRAINTS_ROW_ID] ===
            data?.[RULES_CONSTRAINTS_ROW_ID]
          ) {
            node.data.level_of_application = validatedLevel;
          }
          agGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            rowNodes: [node],
            columns: [column.colId],
          });
        });
      }
      if (isChanged) {
        rulesConstraintsEditPayload.current.push(
          createPayloadItem(data, RULES_CONSTRAINTS_ROW_ID, SETALL_MAPPING)
        );
      }
    }
  } else if (column.colId === "moq_tolerance") {
    let isEditedBefore = false;
    rulesConstraintsEditPayload.current = rulesConstraintsEditPayload.current.map(
      (code) => {
        if (code[RULES_CONSTRAINTS_ROW_ID] === data[RULES_CONSTRAINTS_ROW_ID]) {
          const updatedNode = { ...code };
          let validatedServiceLevel = validateUserInputThreshold(
            data,
            OMS_VENDOR_CONSTRAINTS_CONSTANTS
          );
          if (validatedServiceLevel) {
            agGridInstance.current.api.forEachNode((node) => {
              if (
                node.data[RULES_CONSTRAINTS_ROW_ID] ===
                data?.[RULES_CONSTRAINTS_ROW_ID]
              ) {
                if (node.data.moq_tolerance !== validatedServiceLevel) {
                  node.data.moq_tolerance = validatedServiceLevel;
                }
              }
              agGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: [column.colId],
              });
            });
          }

          updatedNode.moq_tolerance = data.moq_tolerance;
          isEditedBefore = true;
          return updatedNode;
        }
        return code;
      }
    );
    if (!isEditedBefore) {
      let validatedServiceLevel = validateUserInputThreshold(
        data,
        OMS_VENDOR_CONSTRAINTS_CONSTANTS
      );

      if (validatedServiceLevel) {
        agGridInstance.current.api.forEachNode((node) => {
          if (
            node.data[RULES_CONSTRAINTS_ROW_ID] ===
            data?.[RULES_CONSTRAINTS_ROW_ID]
          ) {
            node.data.moq_tolerance = validatedServiceLevel;
          }
          agGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            rowNodes: [node],
            columns: [column.colId],
          });
        });
      }
      if (isChanged) {
        rulesConstraintsEditPayload.current.push(
          createPayloadItem(data, RULES_CONSTRAINTS_ROW_ID, SETALL_MAPPING)
        );
      }
    }
  } else if (column.colId === "order_multiple") {
    let isEditedBefore = false;
    rulesConstraintsEditPayload.current = rulesConstraintsEditPayload.current.map(
      (code) => {
        if (code[RULES_CONSTRAINTS_ROW_ID] === data[RULES_CONSTRAINTS_ROW_ID]) {
          const updatedNode = { ...code };
          let validatedOrderMultiple = data.order_multiple;
          if (!validatedOrderMultiple) {
            validatedOrderMultiple = ORDER_MULTIPLE_MIN_VALUE;
            displaySnackMessages(INVALID_ORDER_MULTIPLE, "info");
          }
          agGridInstance.current.api.forEachNode((node) => {
            if (
              node.data[RULES_CONSTRAINTS_ROW_ID] ===
              data?.[RULES_CONSTRAINTS_ROW_ID]
            ) {
              if (node.data.order_multiple !== validatedOrderMultiple) {
                node.data.order_multiple = validatedOrderMultiple;
              }
            }
            agGridInstance.current.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [node],
              columns: [column.colId],
            });
          });

          updatedNode.order_multiple = validatedOrderMultiple;
          isEditedBefore = true;
          return updatedNode;
        }
        return code;
      }
    );
    if (!isEditedBefore) {
      let validatedOrderMultiple = data.order_multiple;
      if (!validatedOrderMultiple) {
        validatedOrderMultiple = ORDER_MULTIPLE_MIN_VALUE;
        displaySnackMessages(INVALID_ORDER_MULTIPLE, "info");
      }

      agGridInstance.current.api.forEachNode((node) => {
        if (
          node.data[RULES_CONSTRAINTS_ROW_ID] ===
          data?.[RULES_CONSTRAINTS_ROW_ID]
        ) {
          node.data.order_multiple = validatedOrderMultiple;
        }
        agGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
          rowNodes: [node],
          columns: [column.colId],
        });
      });

      if (isChanged) {
        rulesConstraintsEditPayload.current.push(
          createPayloadItem(data, RULES_CONSTRAINTS_ROW_ID, SETALL_MAPPING)
        );
      }
    }
  } else {
    let isInputValueValid = true;
    let validatedInputValue;
    if (
      column.colId === "min_replenishment_quantity" ||
      column.colId === "max_replenishment_quantity"
    ) {
      if (
        data?.max_replenishment_quantity === null ||
        data?.max_replenishment_quantity === undefined
      ) {
        if (column.colId === "min_replenishment_quantity") {
          isInputValueValid = true;
        }
      } else {
        if (
          data?.max_replenishment_quantity <=
            data?.min_replenishment_quantity ||
          data?.min_replenishment_quantity < MINIMUM_QTY_MIN_VALUE
        ) {
          isInputValueValid = false;
          agGridInstance.current.api.forEachNode((node) => {
            if (
              node.data[RULES_CONSTRAINTS_ROW_ID] ===
              data?.[RULES_CONSTRAINTS_ROW_ID]
            ) {
              if (column.colId === "max_replenishment_quantity") {
                node.data.max_replenishment_quantity =
                  data?.min_replenishment_quantity;
                validatedInputValue = data?.min_replenishment_quantity;
                displaySnackMessages(MAX_MIN_VALIDATION, "info");
              } else {
                if (data?.min_replenishment_quantity < MINIMUM_QTY_MIN_VALUE) {
                  displaySnackMessages(INVALID_MIN_QTY, "info");
                } else {
                  displaySnackMessages(MIN_MAX_VALIDATION, "info");
                }
                node.data.min_replenishment_quantity =
                  data?.max_replenishment_quantity;
                validatedInputValue = data?.max_replenishment_quantity;
              }
            }
          });

          agGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            columns: [column.colId],
          });
        }
      }
    }
    let isEditedBefore = false;
    rulesConstraintsEditPayload.current = rulesConstraintsEditPayload.current.map(
      (node) => {
        if (node[RULES_CONSTRAINTS_ROW_ID] === data[RULES_CONSTRAINTS_ROW_ID]) {
          const updatedNode = { ...node };
          if (isInputValueValid) {
            updatedNode[column.colId] = data?.[column.colId];
          } else {
            updatedNode[column.colId] = validatedInputValue;
          }
          isEditedBefore = true;
          return updatedNode;
        }
        return node;
      }
    );
    if (!isEditedBefore && (isChanged || column.colDef.type === "list")) {
      rulesConstraintsEditPayload.current.push(
        createPayloadItem(data, RULES_CONSTRAINTS_ROW_ID, SETALL_MAPPING)
      );
    }
  }

  if (data.is_rule_size_related) {
    rulesConstraintsEditPayload.current = rulesConstraintsEditPayload.current.map(
      (code) => {
        if (code[RULES_CONSTRAINTS_ROW_ID] === data[RULES_CONSTRAINTS_ROW_ID]) {
          const updatedNode = { ...code };
          updatedNode.level_of_application = "applicable_all";
          return updatedNode;
        }
        return code;
      }
    );
  }
};

export const onOMSGridFieldsValidation = (
  savedEditedRcls,
  RULES_CONSTRAINTS_ROW_ID,
  tableConfigurationMetaData,
  SETALL_FORMDATA_FIELDS
) => {
  try {
    if (savedEditedRcls?.length !== 0) {
      let isInputFieldValid = true;
      let rulesUpdated = [];

      let numberTyeColumns = [];
      SETALL_FORMDATA_FIELDS.map((field) => {
        if (
          field.value_type === "number" ||
          field.value_type === "percentage"
        ) {
          numberTyeColumns.push(field.accessor);
        }
      });

      const constraints = savedEditedRcls?.map((rule) => {
        let row_update = {};
        row_update[RULES_CONSTRAINTS_ROW_ID] = rule?.[RULES_CONSTRAINTS_ROW_ID];
        rulesUpdated.push();
        let constraint = Object.keys(rule)
          .filter((key) => key !== RULES_CONSTRAINTS_ROW_ID)
          .map((key) => {
            const fieldConfig = SETALL_FORMDATA_FIELDS.find(
              (field) => field.accessor === key
            );
            if (
              fieldConfig?.is_mandatory &&
              (rule[key] === null ||
              rule[key] === undefined ||
                rule[key] === "")
            ) {
              isInputFieldValid = false;
            }
            if (numberTyeColumns.includes(key)) {
              if (!isNumber(rule[key])) {
                isInputFieldValid = false;
              } else {
                return {
                  attribute_name: key,
                  attribute_value: Math.round(rule[key]),
                };
              }
            }
            return {
              attribute_name: key,
              attribute_value: rule[key],
            };
          });
        let payload = {
          constraint: [constraint],
          row_update: [row_update],
          table_name: localStorage.getItem("rclCreatedTableName"),
          meta: {
            ...tableConfigurationMetaData.meta,
            limit: {
              limit: 10,
              page: 1,
            },
          },
        };
        rulesUpdated.push(payload);
      });

      return {
        isInputFieldValid,
        rulesUpdated,
      };
    }
  } catch (err) {
    console.log("Error in creating payload for setall", err);
  }
};

export const getOMSVendorConstraintsColumnConfig = (
  columns,
  onClickColumn,
  isUserHasViewOnlyAccess,
  isPackOrderingEnabled,
  packOrderIdOptions,
  PACK_ID_STYLE_KEY
) => {
  let updatedCols = cloneDeep(columns);
  updatedCols.forEach((col) => {
    col.onClick = (tableInfo) => {
      onClickColumn(tableInfo?.cellData?.data || {});
    };
  });
  const formattedCols = agGridColumnFormatter(
    updatedCols,
    null,
    null,
    null,
    null,
    null,
    null,
    true
  );
  const formattedColumns = getCellRenderer(
    formattedCols,
    isUserHasViewOnlyAccess,
    isPackOrderingEnabled,
    packOrderIdOptions,
    PACK_ID_STYLE_KEY
  );
  return formattedColumns;
};

const getCellRenderer = (
  columns,
  isUserHasViewOnlyAccess,
  isPackOrderingEnabled,
  packOrderIdOptions,
  PACK_ID_STYLE_KEY
) => {
  try {
    let updatedColumns = cloneDeep(columns);
    updatedColumns = updatedColumns.map((col) => {
      if (col.column_name === "pack_selection") {
        col.cellRenderer = (params) => {
          //Update the options for the pack selection dropdown
          const packOptions =
            packOrderIdOptions?.filter(
              (data) => data.style === params?.data?.[PACK_ID_STYLE_KEY]
            )?.[0]?.packs || [];

          let initialOptionsForCell = col.extra.options;

          if (packOptions.length > 0) {
            const updatedOptions = [...col.extra.options];
            updatedOptions[1] = {
              ...updatedOptions[1],
              children: [...packOptions],
            };
            initialOptionsForCell = cloneDeep(updatedOptions);
          }

          //Disable the cell if the user has view only access
          if (isUserHasViewOnlyAccess) {
            col.is_disabled = true;
            col.disabled = true;
          }
          //Disable the cell if the pack selection is on Style Level
          let disableEditSelection = false;
          if (!params?.data?.is_rule_style_level && isPackOrderingEnabled) {
            disableEditSelection = true;
          }

          return (
            <CellRenderers
              cellData={params}
              column={col}
              extraProps={null}
              options={initialOptionsForCell}
              isPropsOverrideColumnDef={true}
              isDisabled={disableEditSelection}
              value={[]}
            ></CellRenderers>
          );
        };
      }
      if (col.column_name === "pack_config_details") {
        col.cellRenderer = (params) => {
          //Disable the cell if the pack selection is on Style Level
          let disableEditSelection = false;
          if (!params?.data?.is_rule_style_level && isPackOrderingEnabled) {
            disableEditSelection = true;
          }
          return (
            <CellRenderers
              cellData={params}
              column={col}
              extraProps={null}
              isPropsOverrideColumnDef={true}
              isDisabled={disableEditSelection}
            ></CellRenderers>
          );
        };
      }
      return col;
    });
    return updatedColumns;
  } catch (error) {
    console.log("Error in getCellRenderer", error);
  }
};

export const formatTableDataForPackOrdering = (
  data,
  constraintsTableColumns,
  VIEW_PACK_CONFIG_DETAILS_KEY,
  PACK_ID_STYLE_KEY,
  packOrderIdOptions
) => {
  try {
    const dataResponse = cloneDeep(data);
    dataResponse.forEach((row) => {
      const packSelectionColumnOptions = constraintsTableColumns.filter(
        (col) => col.column_name === "pack_selection"
      )[0]?.extra?.options;

      //Set the pack config details and pack selection
      if (row?.[VIEW_PACK_CONFIG_DETAILS_KEY]) {
        row.pack_config_details = "View Pack Details";
        row.is_rule_style_level = true;
      } else {
        if (row?.pack_selection === null) {
          row.is_rule_style_level = false;
        }
      }

      //Set the default pack selection if it is null or not present
      if (
        row?.pack_selection === null ||
        !row.hasOwnProperty("pack_selection")
      ) {
        const packSelectionDefaultOption = packSelectionColumnOptions[0]?.value;
        row.pack_selection = packSelectionDefaultOption || "Manual";
      }

      //Set the pack selection label when pack ids are selected
      if (row?.pack_selection?.length && row.pack_selection !== "manual") {
        const selectedPackIds = row.pack_selection;

        const selectedStylePackIdMapping =
          packOrderIdOptions?.filter(
            (data) => data.style === row?.[PACK_ID_STYLE_KEY]
          )?.[0]?.packs || [];

        const selectedPackIdOptions =
          selectedStylePackIdMapping?.filter((item) =>
            selectedPackIds.includes(item.value)
          ) || [];
        row.pack_selection = [
          {
            ...packSelectionColumnOptions[1],
            children: selectedPackIdOptions,
          },
        ];
      }
    });
    return dataResponse;
  } catch (error) {
    console.log("Error in formatTableDataForPackOrdering", error);
  }
};

export const extractPackValues = (pack) => {
  if (pack.value === "manual") {
    return "manual";
  } else if (pack.value === "select_pack_ids") {
    return Array.isArray(pack.children)
      ? pack.children.map((child) => child.value)
      : [];
  } else {
    return [];
  }
};
