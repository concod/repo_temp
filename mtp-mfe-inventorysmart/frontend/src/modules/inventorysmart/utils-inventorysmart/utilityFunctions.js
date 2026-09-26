import React from "react";
import { saveAs } from "file-saver";
import { cloneDeep, isEmpty, isNull, isUndefined } from "lodash";
import moment from "moment";
import {
  ERROR_MESSAGE,
  UPDATED_MESSAGE,
  tableConfigurationMetaData,
  MIN_DISTRIBUTION_MAP,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { displaySnackMessages } from "../pages-inventorysmart/inventorysmart-utility";
import { saveSetAllModalData } from "../services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { formatStringDate } from "core/Utils/functions/utils";
import {
  dynamicLabelKeysBasedOnTenant,
  dynamicLabelsBasedOnTenant,
} from "core/Utils/DynamicLabels";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { applyMinDistributionRowFields } from "modules/inventorysmart/pages-inventorysmart/Constraints/create-new-rule-flow/createNewRuleConstraintsUtils";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import EditActionButton from "modules/inventorysmart/components/ui-actions/EditActionButton";
import { Button } from "impact-ui-v3";
import {
  buildMinDistributionAttributeValue,
  hasNestedStyleSizeMinDistribution,
} from "modules/inventorysmart/pages-inventorysmart/Constraints/create-new-rule-flow/createNewRuleConstraintsUtils";

// Import KPI Icons for global icon mapping
import ISStyle from "assets/IS_icons/IS_styles_AP1.svg";
import ISStore from "assets/IS_icons/IS_stores_S01.svg";
import ISStorePerStyle from "assets/IS_icons/IS_store_per_styleS02.svg";
import ISSalesUnit from "assets/IS_icons/IS_sales_unitPC1.svg";
import ISLwMargin from "assets/IS_icons/IS_lw_marginPT1.svg";
import ISAllocatedQnty from "assets/IS_icons/IS_allocated_qntST3.svg";
import ISDcAvailable from "assets/IS_icons/IS_dc_availableWH4.svg";
import ISDcAllocatedQnt from "assets/IS_icons/IS_dc_allocated_qntWH1.svg";
import ISRefs from "assets/IS_icons/IS_JL1.svg";
import ISAP2 from "assets/IS_icons/IS_AP2.svg";
import ISPT2 from "assets/IS_icons/IS_PT2.svg";
import ISPT1 from "assets/IS_icons/IS_PT1.svg";
import ISStoreOhIt from "assets/IS_icons/IS_OH1.svg";
import ISLwSale from "assets/IS_icons/IS_PC2.svg";
import ISConForcastDemand from "assets/IS_icons/IS_DM1.svg";
import ISUnConForcast from "assets/IS_icons/IS_FC1.svg";
import ISAllocatedStorePerPC9 from "assets/IS_icons/IS_SO3.svg";
import ISVIRRemaining from "assets/IS_icons/IS_RV1.svg";
import ISIOB from "assets/IS_icons/IS_EX1.svg";
import ISAllocatedQntBySize from "assets/IS_icons/IS_ST1.svg";
import ISNetDcAvailable from "assets/IS_icons/IS_WH3.svg";
import ISStyleDepthPerStore from "assets/IS_icons/IS_ST2.svg";
import ISAvgUnitPerStore from "assets/IS_icons/IS_PR1.svg";
import ISStoreGradeAllocatedQty from "assets/IS_icons/IS_SG1.svg";
import ISStoreGradeAllocatedQuantity from "assets/IS_icons/IS_SG2.svg";
import ISTotalTransfers from "assets/IS_icons/IS_TT1.svg";
import ISTotalUnits from "assets/IS_icons/IS_TU1.svg";
import ISSourceStores from "assets/IS_icons/IS_SS1.svg";
import ISDestinationStores from "assets/IS_icons/IS_DS1.svg";
import ISTransferValue from "assets/IS_icons/IS_TV1.svg";
import ISLostRevenue from "assets/IS_icons/CS1.svg";
import ISLostUnits from "assets/IS_icons/PR2.svg";
import ISAllocations from "assets/IS_icons/IS_AC2.svg";
import ISAllocations1 from "assets/IS_icons/IS_AC1.svg";
// Import icon codes for label-based mapping (from spreadsheet)
import ISOH1 from "assets/IS_icons/IS_OH1.svg";
import ISOH2 from "assets/IS_icons/IS_OH2.svg";
import ISDS2 from "assets/IS_icons/DS2.svg";
import ISCL1 from "assets/IS_icons/CL1.svg";
import ISCL2 from "assets/IS_icons/CL2.svg";
import ISWS1 from "assets/IS_icons/IS_WS1.svg";
import ISWS2 from "assets/IS_icons/IS_WS2.svg";
import ISOI1 from "assets/IS_icons/IS_OI1.svg";
import ISSL1 from "assets/IS_icons/SL1.svg";
import ISSL2 from "assets/IS_icons/SL1.svg"; // Using SL1 as fallback if SL2 doesn't exist
import ISDR1 from "assets/IS_icons/DR1.svg";
import ISSO1 from "assets/IS_icons/SO1.svg";
import ISOR2 from "assets/IS_icons/OR2.svg";
import ISWH1 from "assets/IS_icons/IS_dc_allocated_qntWH1.svg";
import ISWH4 from "assets/IS_icons/IS_dc_availableWH4.svg";
import ISRP1 from "assets/IS_icons/IS_PT1.svg"; // Using PT1 as fallback if RP1 doesn't exist
import ISST3 from "assets/IS_icons/IS_allocated_qntST3.svg";
import ISIT1 from "assets/IS_icons/IS_OH1.svg"; // Using OH1 as fallback if IT1 doesn't exist
import ISWOS1 from "assets/IS_icons/IS_WS1.svg";
import ISWOS2 from "assets/IS_icons/IS_WS2.svg";
import ISWH2 from "assets/IS_icons/IS_WH2.svg";
import ISSK1 from "assets/IS_icons/IS_SK1.svg";
import ISSO2 from "assets/IS_icons/IS_store_per_styleS02.svg";

// Helper function to get key from MIN_DISTRIBUTION_MAP based on value
export const getMinDistributionKey = (value) => {
  return Object.keys(MIN_DISTRIBUTION_MAP).find(key => MIN_DISTRIBUTION_MAP[key] === value) || value;
};

export const getDisplayableValueBasedOnTenant = (
  p_data,
  p_defaultKey,
  p_mapping
) => {
  let l_mappingKey = p_mapping?.[p_defaultKey];
  if (l_mappingKey) {
    return p_data[l_mappingKey];
  }
  return p_data[p_defaultKey];
};

export const saveFile = (data, fileName) => {
  const EXCEL_TYPE =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";
  const blob = new Blob([data], { type: EXCEL_TYPE });
  saveAs(blob, fileName);
};

export const removeDuplicatesByProperty = (p_inputArray, p_property) => {
  const l_seenValues = new Set();
  return p_inputArray?.filter((item) => {
    if (!l_seenValues?.has(item?.[p_property])) {
      l_seenValues?.add(item?.[p_property]);
      return true;
    }
    return false;
  });
};

export const filterByProperties = (input1, input2) => {
  const { allocation_code = [], user_id = [] } = input2;
  return input1?.filter(
    (item) =>
      (allocation_code.length === 0 ||
        allocation_code.includes(item.allocation_code)) &&
      (user_id.length === 0 || user_id.includes(item.user_id))
  );
};

export const getExtraParamsFromColumns = (data) => {
  return data
    .filter((item) => item.extra && item.extra.isLevelPresent)
    .map((item) => item.extra);
};

export const getModuleVisibility = (permissions) => permissions.length;

export const getTabItemVisibility = (modulePermissions, tabPermissions) => {
  let displayFlag = false;

  for (const subModule of tabPermissions) {
    const userSubModulePermissions = modulePermissions?.[subModule] || [];
    if (getModuleVisibility(userSubModulePermissions)) {
      displayFlag = true;
      break;
    }
  }
  return displayFlag;
};

export const flattenJSON = (jsonArray) => {
  if (!Array.isArray(jsonArray)) {
    throw new Error("Input must be an array.");
  }
  let flattenedArray = [];
  jsonArray.forEach((item) => {
    let flattenedItem = { ...item, ...item.data[0] };
    delete flattenedItem.data;
    flattenedArray.push(flattenedItem);
  });

  return flattenedArray;
};

// Helper function to sort child rows by start_date in ascending order
export const sortChildRowsByStartDate = (childRows) => {
  if (!childRows || childRows.length === 0) return childRows;
  return [...childRows].sort((a, b) => {
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return moment(a.start_date).diff(moment(b.start_date));
  });
};

export const addUniqueKeyToSubrows = (data, childKey = "data") => {
  data.map((subRows) => {
    subRows[childKey]?.map((item, index) => {
      item.key = index + 1;
      item.uniqueParentKey = subRows?.key;
      item.id = index;
    });
    return subRows;
  });
  return data;
};

export const validateForNullValues = (
  subRowData,
  agGridInstance,
  displaySnackMessages,
  props
) => {
  let nullValueArray = [];
  let editableColumns = agGridInstance?.current?.api.columnModel
    .getAllGridColumns()
    ?.filter((col) => col?.colDef?.is_editable);
  if (Array.isArray(subRowData)) {
    editableColumns?.forEach((editableCol) => {
      subRowData?.forEach((data) => {
        if (data[editableCol?.colId] === "" || isNull(data[editableCol?.colId]))
          nullValueArray.push(editableCol?.colDef?.label);
      });
    });
    if (nullValueArray?.length > 0) {
      displaySnackMessages(
        `Please enter values for ${nullValueArray}`,
        "error",
        props
      );
    }
    return nullValueArray;
  }
};

export const checkRedundantDate = (
  rowsToCheck,
  inputDate,
  field,
  currentRow
) => {
  for (let i = 0; i < rowsToCheck.length - 1; i++) {
    const range1Start = rowsToCheck[i]?.start_date
      ? moment(rowsToCheck[i].start_date)
      : null;
    const range1End = rowsToCheck[i]?.end_date
      ? moment(rowsToCheck[i].end_date)
      : null;
    for (let j = i + 1; j < rowsToCheck.length; j++) {
      const range2Start = rowsToCheck[j]?.start_date
        ? moment(rowsToCheck[j].start_date)
        : null;
      const range2End = rowsToCheck[j].end_date
        ? moment(rowsToCheck[j].end_date)
        : null;
      if (range2Start && range2End) {
        // check only if both start and end dates are selected
        // Check if the ranges overlap
        if (
          (moment(range2Start).isAfter(moment(range1Start)) &&
            moment(range2Start).isBefore(moment(range1End))) ||
          moment(range2Start).isSame(moment(range1End)) ||
          (moment(range1Start).isAfter(moment(range2Start)) &&
            moment(range1Start).isBefore(moment(range2End))) ||
          moment(range1Start).isSame(moment(range2End))
        ) {
          return true;
        } else if (
          (moment(range2End).isAfter(moment(range1Start)) &&
            moment(range2End).isBefore(moment(range1End))) ||
          moment(range2End).isSame(moment(range1Start)) ||
          (moment(range1End).isAfter(moment(range2Start)) &&
            moment(range1End).isBefore(moment(range2End))) ||
          moment(range1End).isSame(moment(range2Start))
        ) {
          return true;
        }
      }
    }
  }
  return false; // No overlapping ranges found
};

export const childNewRowData = (params) => ({
  st: null,
  wos: null,
  user: null,
  end_date: "12-31-2050",
  max_stock: 1,
  min_stock: 0,
  category_minimum: null,
  category_maximum: null,
  update_at: null,
  created_at: null,
  created_by: null,
  start_date: null,
  updated_by: null,
  min_distribution: "Same minimum for all sizes",
  rcl_constraint_code: params.data.rcl_constraint_code,
  key: params?.data?.data?.length + 1,
  uniqueParentKey: params.data.key,
  newRowAdded: true,
});

/**
 * New child row seeded with the nested style/size distributions the new
 * constraints flow renders, so min_distribution shows its composed label.
 */
export const childNewRowDataWithMinDistribution = (params) =>
  applyMinDistributionRowFields({
    ...childNewRowData(params),
    style_distribution: {
      distribution_type: "same_min",
      x_units_per_article: {},
    },
    size_distribution: {
      distribution_type: "same_min",
      x_units_per_size: {},
    },
  });

export const getPropsWithFreshEditedData = (props, savedEditedDataRef) => ({
  ...props,
  savedEditedData: savedEditedDataRef?.current ?? props?.savedEditedData ?? [],
});

export const addDataToEditableState = (
  props,
  params,
  data,
  agGridInstance,
  filterDependencies,
  excludedRows = null
) => {
  let clonedRulesData = cloneDeep(props?.savedEditedData);
  let editableColumns = agGridInstance?.current?.api.columnModel
    .getAllGridColumns()
    ?.filter(
      (col) =>
        col?.colDef?.is_editable &&
        col?.colId !== "rule_name" &&
        col?.colId !== "exception_rule_name"
    );
  const resolveMinDistributionAttributeValue = (row) => {
    if (hasNestedStyleSizeMinDistribution(row)) {
      return buildMinDistributionAttributeValue(row);
    }
    return {
      distribution_type:
        row?.min_distribution === "Configure"
          ? "same_min"
          : getMinDistributionKey(row?.min_distribution),
      x_units_per_size: row?.x_units_per_size ?? {},
    };
  };

  let constraints = [];
  if (
    props?.constraintsConfigs?.showSingleMergedRows
  ) {
    editableColumns?.forEach((attri) => {
      if (attri?.colId !== "x_units_per_size") {
        constraints.push({
          attribute_name: attri?.colId,
          attribute_value:
            attri?.colDef?.type === "datetime"
              ? moment(data?.[attri?.colId]).format("YYYY-MM-DD")
              : attri?.colId === "min_distribution"
                ? resolveMinDistributionAttributeValue(data)
                : data?.[attri?.colId],
        });
      }
    });
  } else {
    let toLoopThroughConstraints = params?.node?.parent?.data?.data
      ? params?.node?.parent?.data?.data
      : params?.data?.data;
    constraints = toLoopThroughConstraints?.map((subRows) => {
      let constraintsWithSubrow = [];
      editableColumns?.map((attri) => {
        if (attri?.colId !== "x_units_per_size") {
          constraintsWithSubrow.push({
            attribute_name: attri?.colId,
            attribute_value:
              attri?.colDef?.type === "datetime"
                ? moment(subRows?.[attri?.colId]).format("YYYY-MM-DD")
                : attri?.colId === "min_distribution"
                  ? resolveMinDistributionAttributeValue(subRows)
                  : subRows?.[attri?.colId],
          });
        }
      });
      return constraintsWithSubrow;
    });
  }

  let payload = {
    constraint: props?.constraintsConfigs?.showSingleMergedRows
      ? [[...constraints]]
      : [...constraints],
    row_update: [
      {
        store_code:
          params?.data?.store_code || params?.node?.parent?.data?.store_code,
        rule_code:
          params?.data?.rule_code || params?.node?.parent?.data?.rule_code,
        psa_code:
          params?.data?.psa_code || params?.node?.parent?.data?.psa_code,
        key: props?.constraintsConfigs?.showSingleMergedRows
          ? data?.key
          : params?.data?.uniqueParentKey || params?.node?.data?.key,
      },
    ],
    filters: isEmpty(filterDependencies?.current?.filters)
      ? []
      : filterDependencies?.current?.filters,
    meta: {
      ...tableConfigurationMetaData.meta,
      limit: {
        limit: 10,
        page: 1,
      },
    },
  };
  if (!isNull(excludedRows)) {
    payload = {
      ...payload,
      excluded_rows: [],
      is_all_records_selected: false,
    };
  }

  let payloadIndex = clonedRulesData?.findIndex(
    (savedRule) =>
      savedRule?.row_update?.[0]?.key ===
      (props?.constraintsConfigs?.showSingleMergedRows
        ? data?.key
        : params?.node?.data?.uniqueParentKey)
  );
  if (payloadIndex > -1) {
    clonedRulesData[payloadIndex] = {
      ...clonedRulesData[payloadIndex],
      ...payload,
    };
  } else {
    clonedRulesData.push(payload);
  }
  props?.saveModifiedData([...clonedRulesData]);
};

export const addChildRow = (
  props,
  params,
  agGridInstance,
  filterDependencies,
  deSelections = null,
  { useNestedMinDistribution = false } = {}
) => {
  let tempValidation = validateForNullValues(
    params.data?.data,
    agGridInstance,
    displaySnackMessages,
    props
  );
  if (tempValidation?.length <= 0) {
    let newRowData = useNestedMinDistribution
      ? childNewRowDataWithMinDistribution(params)
      : childNewRowData(params);
    let newRowAdded = Object.assign(params.data, {
      data: [...params.data?.data, newRowData],
    });
    params.node.setExpanded(false);
    params.node.setData(newRowAdded);
    addDataToEditableState(
      props,
      params,
      newRowData,
      agGridInstance,
      filterDependencies,
      deSelections
    );
    params.node.setExpanded(true);
  }
};

export const onDeleteClick = (
  props,
  params,
  agGridInstance,
  filterDependencies,
  deSelections = null
) => {
  let parentNode = params.node.parent;
  let childNodes = params.node.parent.data.data.filter((item) => {
    return item.key !== params.data.key;
  });
  let deletedNode = params.node.parent.data.data
    .filter((item) => {
      return item.key === params.data.key;
    })
    .map((item) => {
      item.action = "delete";
      item.key = `${item.key}_delete`;
      return item;
    });
  childNodes = childNodes.map((item, index) => {
    item.key = index;
    return item;
  });

  parentNode.setExpanded(false);
  let updated_data = { ...params.node.parent.data };
  updated_data.data = childNodes;
  parentNode.setData(updated_data);
  addDataToEditableState(
    props,
    params,
    updated_data,
    agGridInstance,
    filterDependencies,
    deSelections
  );
  parentNode.setExpanded(true);
};
//change format from mm-dd-yyyy to yyyy-mm-dd
export const reverseDate = (date) => {
  const [mm, dd, yyyy] = date.split("-");

  return [yyyy, mm, dd].join("-");
};

export const getOrdinal = (n) => {
  const suffixes = ["st", "nd", "rd", "th"];
  const suffixIndex = (n - 1) % 10 < 3 ? (n - 1) % 10 : 3;
  const suffix = suffixes[suffixIndex];
  return `${n}${suffix}`;
};

export const dateValidationsCheck = (formData, newDate, dateField) => {
  let validationCheck = false;
  Object.keys(formData)?.map((item) => {
    if (newDate === formData[item][dateField]) return (validationCheck = true);
  });
  return validationCheck;
};

const validateAttributeValues = (key, tempListOfErrors) => {
  //check if the date is valid
  if (key.attribute_name?.includes("date")) {
    if (!moment(key?.attribute_value).isValid()) {
      //update only if the attribute name is not already in the array
      if (!tempListOfErrors?.inValidDate?.includes(key?.attribute_name)) {
        tempListOfErrors?.inValidDate?.push(key?.attribute_name);
      }
    }
  }
  //check if the input is null or undefined or empty value
  if (
    isUndefined(key?.attribute_value) ||
    isNull(key?.attribute_value) ||
    key.attribute_value === ""
  ) {
    if (key.attribute_name !== "x_units_per_size") {
      tempListOfErrors.nullValues?.push(key?.attribute_name);
    }
  }
};

export const validateConstraintFields = (data) => {
  /** @type {{ nullValues: string[], inValidDate: string[] }} */
  let tempListOfErrors = {
    nullValues: [],
    inValidDate: [],
  }; // object of arrays to store different validation check results. names of the validation failed fields are pushed in their corresponding arrays
  data.map((row) => {
    let constraintList = row.constraint;
    constraintList.map((subRow) => {
      if (Array.isArray(subRow)) {
        subRow?.forEach((key) => {
          validateAttributeValues(key, tempListOfErrors);
        });
      } else {
        validateAttributeValues(subRow, tempListOfErrors);
      }
    });
  });
  // Show tenant display labels (e.g. "Forward Cover" for wos) instead of raw column keys in messages
  tempListOfErrors.nullValues = tempListOfErrors.nullValues.map((name) =>
    dynamicLabelsBasedOnTenant(name, "inventorysmart")
  );
  tempListOfErrors.inValidDate = tempListOfErrors.inValidDate.map((name) =>
    dynamicLabelsBasedOnTenant(name, "inventorysmart")
  );
  return tempListOfErrors; //returns object of arrays of failed validation checks
};

export const updateBackedRules = async (props) => {
  if (props?.getSavedEditedRules?.length > 0) {
    const validationChecks = validateConstraintFields(
      cloneDeep(props.getSavedEditedRules)
    ); //check if all the entered inputs are valid
    if (validationChecks?.inValidDate?.length > 0) {
      displaySnackMessages(
        `Invalid Date found in ${validationChecks.inValidDate}`,
        "error",
        props
      );
      return;
    }
    if (validationChecks?.nullValues?.length > 0) {
      displaySnackMessages(
        `Null values found in ${validationChecks.nullValues}`,
        "error",
        props
      );
      return;
    } else {
      props?.setRulesTableLoader(true);
      props?.stateRulesDataOnServer(false);
      const promises = props?.getSavedEditedRules.map(
        async (editedRos) => await saveSetAllModalData(editedRos)
      );
      Promise.all(promises)
        .then((results) => {
          let tempResult = results.map((result, index) => {
            return result.data.status;
          });
          if (tempResult.includes(false)) {
            displaySnackMessages(ERROR_MESSAGE, "error", props);
          } else {
            props?.stateRulesDataOnServer(true);
            displaySnackMessages(UPDATED_MESSAGE, "success", props);
          }
          props?.setRulesTableLoader(false);
          props?.saveEditedRules([]);
        })
        .catch((error) => {
          props?.setRulesTableLoader(false);
          displaySnackMessages(ERROR_MESSAGE, "error", props);
          props?.saveEditedRules([]);
        });
    }
  }
};

export const canTakeActionOnModules = (
  subModuleName,
  action,
  inventorysmartModulesPermission,
  module
) => {
  return isActionAllowedOnSubModule(
    inventorysmartModulesPermission,
    module,
    subModuleName,
    action
  );
};

export const getCustomDateFilterObject = (filter_name, attribute_name, values) => {
  return {
    filter_name,
    filter_id: attribute_name,
    values: values.map(formatTenantDate),
    attribute_name,
    filter_type: "non-cascaded",
    dimension: "custom",
    operator: "in",
  };

};

export const getCustomFilterObject = (filter_name, attribute_name, values) => {
  return {
    filter_name,
    filter_id: attribute_name,
    values: values,
    attribute_name,
    filter_type: "non-cascaded",
    dimension: "custom",
    operator: "in",
  };
};

export const formatTenantDate = (date) => {
  const tenantDateFormat = localStorage.getItem("tenantDateFormat");
  if (!date) return null;
  return formatStringDate(date, false, true, tenantDateFormat).format(tenantDateFormat);
}


export const getStartDateAndEndDateStringFromFiscalWeekObject = (
  fiscalWeekInfo
) => {
  const dates = fiscalWeekInfo.values;

  const fiscal_start_date =
    dates?.fiscalInfoStartDate?.calendar_week_start_date;
  const fiscal_end_date = dates?.fiscalInfoEndDate?.fiscal_week_end_date;
  const startDate = moment(fiscal_start_date)
    .utc()
    .startOf("day")
    .format("YYYY-MM-DD");
  const endDate = moment(fiscal_end_date)
    .utc()
    .startOf("day")
    .format("YYYY-MM-DD");

  return { startDate, endDate };
};

export function displayFormattedDate(givenDate, dateFormat) {
  return moment(givenDate).format(dateFormat || "MM-DD-YYYY");
}

export function isActionDisabled(
  subModuleName,
  actionName,
  modulePermissions,
  module
) {
  const canPerformAction = canTakeActionOnModules(
    subModuleName,
    actionName,
    modulePermissions,
    module
  );
  return !canPerformAction;
}

export const getColumnDefinationForRules = async (
  tableName,
  disableEdit,
  disableDelete,
  editRule,
  deleteRule,
  is_scheduler_editable,
  enableReadOnly
) => {
  // is_scheduler_editable is added only for spnax case, cause all rules needs to be editable
  try {
    let coldef = await getColumnsAg(`table_name=${tableName}`, null)();
    return coldef.map((item) => {
      if (item?.column_name === "edit") {
        item.cellRenderer = (cellProps, _) => {
          const isDisabled =
            is_scheduler_editable
              ? disableEdit && !is_scheduler_editable
              : disableEdit || !cellProps?.node?.data?.is_deletable;
          return (
            <EditActionButton
              disabled={enableReadOnly ? false : isDisabled}
              onClick={() =>
                editRule(cellProps?.node?.data, enableReadOnly && isDisabled)
              }
            />
          );
        };
      }
      if (item?.column_name === "delete") {
        item.cellRenderer = (cellProps, _) => {
          const isDisabled =
            disableDelete || !cellProps?.node?.data?.is_deletable;
          return (
            <DeleteActionButton
              disabled={isDisabled}
              onClick={() => deleteRule(cellProps?.node?.data)}
            />
          );
        };
      }
      return item;
    });
  } catch (err) {
    console.error(`Error fetching column defination: for ${tableName}`, err);
  }
};

/**
 * Inventory override for edit/delete icon columns — Figma secondary buttons
 * with custom icons. Keeps core delete/edit handler and disable logic.
 */
export const applyInventoryEditDeleteCellRenderers = (
  columns,
  { onEdit, onDelete, isEditDisabled, isDeleteDisabled }
) => {
  if (!columns?.length) return columns;

  return columns.map((col) => {
    if (
      col.type === "delete_icon" ||
      (col.column_name || "").toLowerCase() === "delete"
    ) {
      col.cellRenderer = (params) => {
        const showKey = col.extra?.showDeleteIcon;
        if (showKey && !params?.data?.[showKey]) return null;
        const disabled =
          typeof isDeleteDisabled === "function"
            ? isDeleteDisabled(params)
            : false;
        return (
          <DeleteActionButton
            disabled={disabled}
            onClick={() => onDelete(params.data)}
          />
        );
      };
    }
    if (
      col.type === "edit_icon" ||
      (col.column_name || "").toLowerCase() === "edit"
    ) {
      col.cellRenderer = (params) => {
        const showKey = col.extra?.showEditIcon;
        if (showKey && !params?.data?.[showKey]) return null;
        const disabled =
          typeof isEditDisabled === "function" ? isEditDisabled(params) : false;
        return (
          <EditActionButton
            disabled={disabled}
            onClick={() => onEdit(params)}
          />
        );
      };
    }
    return col;
  });
};

/**
 * Replaces all spaces in a string with underscores and converts to lowercase
 * @param {string} str - The input string
 * @returns {string} Lowercase string with spaces replaced by underscores
 */
export const replaceSpacesWithUnderscores = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.toLowerCase().replace(/\s+/g, "_");
};

export const showEllipsis = (str, maxLength) => {
  if (!str || typeof str !== "string") return false;
  if (str.length <= maxLength) return false;
  return true;
};

export const formatFiscalCalenderEpoch = (date) => formatStringDate(date, true);

export function getNearestMultiple(currentValue, multipleOf, maxValue) {
  if (currentValue > maxValue) {
    currentValue = maxValue;
  }
  if (multipleOf === 0 || !multipleOf) {
    throw new Error("multipleOf cannot be zero");
  }
  if (currentValue % multipleOf === 0) {
    return currentValue;
  }

  const lower = Math.floor(currentValue / multipleOf) * multipleOf;
  const higher = Math.ceil(currentValue / multipleOf) * multipleOf;

  // Pick the closest one that is ≤ maxValue
  if (higher <= maxValue) {
    const distToLower = currentValue - lower;
    const distToHigher = higher - currentValue;
    return distToLower < distToHigher ? lower : higher;
  }
  // Only lower is within bounds
  return lower;
}


 // Parse date using tenant date format (fiscal widget uses this), then fall back to auto parsing
 export const parseToYMD = (value, dateFormat = null) => {
  if (!value) return "";
  const tenantDateFormat = dateFormat || localStorage.getItem("tenantDateFormat") || "DD-MM-YYYY";
  const mKnown = moment(value, tenantDateFormat, true);
  if (mKnown.isValid()) return mKnown.format("YYYY-MM-DD");
  const mAuto = moment(value);
  return mAuto.isValid() ? mAuto.format("YYYY-MM-DD") : "-";
};

export const getKPIIconComponent = (iconType, index = 0) => {
  const iconMap = {
    "style": <ISStyle key={`icon-${index}`} />,
    "store": <ISStore key={`icon-${index}`} />,
    "store_per_style": <ISStorePerStyle key={`icon-${index}`} />,
    "sales_unit": <ISSalesUnit key={`icon-${index}`} />,
    "lw_margin": <ISLwMargin key={`icon-${index}`} />,
    "allocated_qty_total": <ISAllocatedQnty key={`icon-${index}`} />,
    "dc_available": <ISDcAvailable key={`icon-${index}`} />,
    "dc_allocated_qty": <ISDcAllocatedQnt key={`icon-${index}`} />,
    "refs": <ISRefs key={`icon-${index}`} />,
    "store_oh_it": <ISStoreOhIt key={`icon-${index}`} />,
    "lw_4_sale": <ISLwSale key={`icon-${index}`} />,
    "constraied_forecasted_demand": <ISConForcastDemand key={`icon-${index}`} />,
    "unconstrained_forecast": <ISUnConForcast key={`icon-${index}`} />,
    "allocated_store_per_PC9": <ISAllocatedStorePerPC9 key={`icon-${index}`} />,
    "vir_remaining": <ISVIRRemaining key={`icon-${index}`} />,
    "iob": <ISIOB key={`icon-${index}`} />,
    "allocated_qnt_by_size": <ISAllocatedQntBySize key={`icon-${index}`} />,
    "net_dc_available": <ISNetDcAvailable key={`icon-${index}`} />,
    "style_depth_per_store": <ISStyleDepthPerStore key={`icon-${index}`} />,
    "avg_unit_per_store": <ISAvgUnitPerStore key={`icon-${index}`} />,
    "store_grade_allocated_qty": <ISStoreGradeAllocatedQty key={`icon-${index}`} />,
    "store_grade_allocated_quantity": <ISStoreGradeAllocatedQuantity key={`icon-${index}`} />,
    "store_grade_allocated_percentage": <ISPT2 key={`icon-${index}`} />,
    "depth_per_store": <ISAP2 key={`icon-${index}`} />,
    "total_transfers": <ISTotalTransfers key={`icon-${index}`} />,
    "total_units": <ISTotalUnits key={`icon-${index}`} />,
    "source_stores": <ISSourceStores key={`icon-${index}`} />,
    "destination_stores": <ISDestinationStores key={`icon-${index}`} />,
    "transfer_value": <ISTransferValue key={`icon-${index}`} />,
    "lost_revenue": <ISLostRevenue key={`icon-${index}`} />,
    "lost_units": <ISLostUnits key={`icon-${index}`} />,
    "allocations": <ISAllocations key={`icon-${index}`} />,
    "allocationsChart": <ISAllocations1 key={`icon-${index}`} />,
    "percentageSymbol": <ISPT1 key={`icon-${index}`} />,
    // Icon codes from spreadsheet mapping
    "OH1": <ISOH1 key={`icon-${index}`} />,
    "OH2": <ISOH2 key={`icon-${index}`} />,
    "DS2": <ISDS2 key={`icon-${index}`} />,
    "CL1": <ISCL1 key={`icon-${index}`} />,
    "CL2": <ISCL2 key={`icon-${index}`} />,
    "WS1": <ISWS1 key={`icon-${index}`} />,
    "WS2": <ISWS2 key={`icon-${index}`} />,
    "OI1": <ISOI1 key={`icon-${index}`} />,
    "PT1": <ISPT1 key={`icon-${index}`} />,
    "PT2": <ISPT2 key={`icon-${index}`} />,
    "ST1": <ISAllocatedQntBySize key={`icon-${index}`} />,
    "ST3": <ISST3 key={`icon-${index}`} />,
    "WH1": <ISWH1 key={`icon-${index}`} />,
    "WH2": <ISWH2 key={`icon-${index}`} />,
    "WH3": <ISNetDcAvailable key={`icon-${index}`} />,
    "WH4": <ISWH4 key={`icon-${index}`} />,
    "RV1": <ISVIRRemaining key={`icon-${index}`} />,
    "AC1": <ISAllocations1 key={`icon-${index}`} />,
    "AC2": <ISAllocations key={`icon-${index}`} />,
    "SL1": <ISSL1 key={`icon-${index}`} />,
    "SL2": <ISSL2 key={`icon-${index}`} />,
    "DR1": <ISDR1 key={`icon-${index}`} />,
    "SO1": <ISSO1 key={`icon-${index}`} />,
    "OR2": <ISOR2 key={`icon-${index}`} />,
    "RP1": <ISRP1 key={`icon-${index}`} />,
    "IT1": <ISIT1 key={`icon-${index}`} />,
    "WOS": <ISWOS1 key={`icon-${index}`} />,
    "WOS2": <ISWOS2 key={`icon-${index}`} />,
    "SK1": <ISSK1 key={`icon-${index}`} />,
    "SO2": <ISSO2 key={`icon-${index}`} />,
  };
  
  // Return the mapped icon or default to style icon
  if (iconType && iconMap[iconType]) {
    return iconMap[iconType];
  }
  return iconMap["style"];
};


export const getNearestDay = (dateTimeString) => {
  let m = moment.utc(dateTimeString);

if (m.hour() >= 12) {
  m = m.add(1, "day").startOf("day");
}
const tenantDateFormat = localStorage.getItem("tenantDateFormat") || "YYYY-MM-DD";
return m.format(tenantDateFormat); 
}

export const capitalizeFirstLetterOfEachWord = (text) => {
  if (!text) return text;
  return text.split(' ').map(word => {
    if (word.length === 0) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
};

export const formatModuleName = (name) => {
        return name.replace(/\s+/g, '_').toLowerCase();
    };

const appendColumnClassToken = (className = "", token) => {
  const classes = (className || "").split(/\s+/).filter(Boolean);
  if (!classes.includes(token)) {
    classes.push(token);
  }
  return classes.join(" ");
};

const isStoreCodeColumnDef = (column, storeCodeColumn) =>
  column?.column_name === "store_code" ||
  column?.column_name === storeCodeColumn ||
  column?.accessor === "store_code" ||
  column?.accessor === storeCodeColumn;

const getRightAlignedCellStyle = (existingCellStyle) => {
  const rightAlignCellStyle = { textAlign: "right" };

  if (typeof existingCellStyle === "function") {
    return (params) => ({
      ...existingCellStyle(params),
      ...rightAlignCellStyle,
    });
  }

  return { ...(existingCellStyle || {}), ...rightAlignCellStyle };
};

export const alignStoreCodeColumnRight = (column) => {
  if (!column) {
    return column;
  }

  let updatedColumn = { ...column };

  if (updatedColumn.children?.length) {
    updatedColumn.children = updatedColumn.children.map(alignStoreCodeColumnRight);
  }

  if (updatedColumn.sub_headers?.length) {
    updatedColumn.sub_headers = updatedColumn.sub_headers.map(
      alignStoreCodeColumnRight
    );
  }

  const storeCodeColumn = dynamicLabelKeysBasedOnTenant("store_code", "core");
  if (!isStoreCodeColumnDef(updatedColumn, storeCodeColumn)) {
    return updatedColumn;
  }

  updatedColumn = {
    ...updatedColumn,
    cellStyle: getRightAlignedCellStyle(updatedColumn.cellStyle),
    cellClass: appendColumnClassToken(
      appendColumnClassToken(updatedColumn.cellClass, "flex-reverse-cell"),
      "store-code-right-align-cell"
    ),
    headerClass: appendColumnClassToken(
      appendColumnClassToken(updatedColumn.headerClass, "flex-reverse-column"),
      "ag-right-aligned-header"
    ),
  };

  if (updatedColumn.cellRenderer === "agGroupCellRenderer") {
    updatedColumn.cellRendererParams = {
      ...(updatedColumn.cellRendererParams || {}),
      suppressCount: true,
      innerRenderer: (params) => (
        <span
          style={{
            display: "inline-block",
            width: "100%",
            textAlign: "right",
          }}
        >
          {params.value ?? ""}
        </span>
      ),
    };
  }

  return updatedColumn;
};

export const alignStoreCodeColumnsRight = (columns = []) =>
  columns.map(alignStoreCodeColumnRight);

// Helper function to transform constraint data into attribute objects format
export const transformConstraintsToAttributeFormat = (constraints) => {
  const attributeConfig = {
    min_stock: {
      label: "Min",
      accessor: "min_stock",
      value_type: "number",
      field_type: "IntegerField"
    },
    max_stock: {
      label: "Max",
      accessor: "max_stock",
      value_type: "number",
      field_type: "IntegerField"
    },
    wos: {
      label: "WOS",
      accessor: "wos",
      value_type: "number",
      field_type: "IntegerField"
    },
    start_date: {
      label: "Start Date",
      accessor: "start_date",
      value_type: "number",
      field_type: "DateTimeField"
    },
    end_date: {
      label: "End Date",
      accessor: "end_date",
      value_type: "number",
      field_type: "DateTimeField"
    }
  };

  return constraints.map((constraint) => {
    const attributeArray = [];
    
    // Only include attributes that are defined in the constraint and in attributeConfig
    Object.keys(attributeConfig).forEach((key) => {
      if (constraint[key] !== undefined && constraint[key] !== null) {
        attributeArray.push({
          attribute_name: key,
          attribute_value: constraint[key],
          accessor: attributeConfig[key].accessor,
          value_type: attributeConfig[key].value_type,
          label: attributeConfig[key].label,
          field_type: attributeConfig[key].field_type
        });
      }
    });
    
    return attributeArray;
  });
};

/** Rows at or below this use autoHeight; above use fixed grid + sheet height. */
export const BOTTOM_SHEET_AUTO_HEIGHT_MAX_ROWS = 5;

/** Bottom sheet grid max height (~7–8 visible rows before internal scroll). */
export const BOTTOM_SHEET_GRID_MAX_HEIGHT = 440;

const BOTTOM_SHEET_GRID_ROW_HEIGHT = 46;
const BOTTOM_SHEET_GRID_CHROME = 80;
const BOTTOM_SHEET_GRID_PAGINATION_CHROME = 132;

/** Row-based grid height — compact for few rows, caps and scrolls for many. */
export const getBottomSheetGridHeight = (rowCount = 1, options = {}) => {
  const { withPagination = false } = options;
  const rows = Math.max(rowCount || 0, 1);
  const chrome = withPagination
    ? BOTTOM_SHEET_GRID_PAGINATION_CHROME
    : BOTTOM_SHEET_GRID_CHROME;
  const desired = rows * BOTTOM_SHEET_GRID_ROW_HEIGHT + chrome;
  return `${Math.min(desired, BOTTOM_SHEET_GRID_MAX_HEIGHT)}px`;
};

/** Use autoHeight for small tables; fixed height + internal scroll for 6+ rows. */
export const getBottomSheetGridProps = (rowCount = 1, options = {}) => {
  const rows = Math.max(rowCount || 0, 1);
  if (rows <= BOTTOM_SHEET_AUTO_HEIGHT_MAX_ROWS) {
    return { domLayout: "autoHeight", height: "auto" };
  }
  return {
    domLayout: "normal",
    height: getBottomSheetGridHeight(rows, options),
  };
};

/** Total bottom sheet height when grid uses fixed height (6+ rows). */
export const getBottomSheetModalHeight = (rowCount = 1, options = {}) => {
  const rows = Math.max(rowCount || 0, 1);
  if (rows <= BOTTOM_SHEET_AUTO_HEIGHT_MAX_ROWS) {
    return undefined;
  }
  const gridHeight = parseInt(getBottomSheetGridHeight(rows, options), 10);
  // modal header + body padding + table header + grid gap + footer
  const modalChrome = 226;
  return `${gridHeight + modalChrome}px`;
};

export const bottomSheetGridContentStyle = {
  paddingBottom: "24px",
};

export const bottomSheetFooterStyle = {
  display: "flex",
  justifyContent: "flex-end",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  marginLeft: "auto",
};

/** Cancel sits left of primary; when primary is absent, Cancel takes its rightmost slot. */
export const BottomSheetFooter = ({ onCancel, primaryButton }) => (
  <div style={bottomSheetFooterStyle}>
    {primaryButton ? (
      <>
        <Button variant="tertiary" onClick={onCancel}>
          Cancel
        </Button>
        {primaryButton}
      </>
    ) : (
      <Button variant="tertiary" onClick={onCancel}>
        Cancel
      </Button>
    )}
  </div>
);

export const getSizeBasedonRowHeight = (params) => {
  return params.node.rowHeight === 30 ? "small": "large"
}

export const checkS2SAvaiableOrNot = (sideBarData) => {
  let isS2SAvailable = false;
  for (let i = 0; i < sideBarData.length; i++) {
    if (sideBarData[i].title === "Allocation") {
      sideBarData[i].children.forEach((item) => {
        if (item.link.startsWith("/inventory-smart/create-store-transfer")) {
          isS2SAvailable = true;
        }
      });
      break;
    }
  }
  return isS2SAvailable;
}