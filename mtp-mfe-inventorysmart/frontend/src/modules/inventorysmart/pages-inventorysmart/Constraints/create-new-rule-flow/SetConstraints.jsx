import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom";
import { addSnack } from "core/actions/snackbarActions";
import InfoSvg from "assets/Info.svg";
import { cloneDeep, isNull, isUndefined } from "lodash";
import moment from "moment";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Button, Select, Alert } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import {
  addUniqueKeyToSubrows,
  checkRedundantDate,
  childNewRowDataWithMinDistribution,
  sortChildRowsByStartDate,
  validateForNullValues,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { tableConfigurationMetaData } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import SetAllModalComponent from "../../Common/components/Set-All-Modal-Component";
import {
  collectConstraintGridSelection,
  getExceptionStoreParentRowFields,
  isParentRowByLevel,
} from "../../Common/components/constraintSelectionUtils";
import { displaySnackMessages } from "../../inventorysmart-utility";
import { setConstraintsConfigs as setConstraintsConfigsAction } from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import {
  createNewRuleRcl,
  fetchCreateNewRuleExistingRclDetails,
  saveEditedRCL as saveEditedRCLAction,
  saveRuleName,
  saveCreateNewRuleSetAllDataForRCL,
  setAllModalData as setAllModalDataAction,
  setAllModalVisibility as setAllModalVisibilityAction,
  setCreateRulesTableManualBody as setCreateRulesTableManualBodyAction,
  setRulesTableLoader as setRulesTableLoaderAction,
  setSelectedRCLFromTable as setSelectedRCLFromTableAction,
  setInvalidKeys as setInvalidKeysAction,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import NewMinDistributionModal from "./min-distribution/NewMinDistributionModal";
import {
  applyMinDistributionRowFields,
  buildMinDistributionAttributeValue,
  buildRulesSummaryBannerMessage,
} from "./createNewRuleConstraintsUtils";
import { canEditCreateNewRuleConstraints } from "./createNewRulePermissions";
// import { mockData, USE_RCL_CREATION_API } from "./mock";
import { buildSetConstraintsColumns } from "./setConstraintsGridColumns";
import {
  formatActionColumn,
  useConstraintsActionColumnStyles,
} from "../landing-screen/constraintsCommonUtils";
import { useStyles as useInventorySmartStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import {
  getPersistedCreateNewRuleTableName,
  isCreateNewRuleStep1Refresh,
  loadCreateNewRuleFlowSession,
  saveCreateNewRuleFlowSession,
} from "./createNewRuleFlowSession";
import {
  CREATE_NEW_RULE_RCL_CODE,
  resolveConstraintFilters as resolveConstraintFiltersFromProps,
} from "./setConstraintsHelpers";
import {
  CREATE_NEW_RULE_SCREEN_NAME,
  fetchCreateNewRuleTenantConfigs,
} from "./fetchCreateNewRuleModuleAccess";
import globalStyles from "core/Styles/globalStyles";

const tenantDateFormat = localStorage.getItem("tenantDateFormat");

export const CREATE_NEW_RULE_MODULE_KEY = "inventorysmart_create_new_rule";

const RULE_TYPE_FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "New", value: "new_rule" },
  { label: "Existing", value: "existing_rule" },
];

const DEFAULT_RULE_TYPE_OPTION = RULE_TYPE_FILTER_OPTIONS[0];

const INVALID_RULES_TEXT_COLOR = "#D62F2D";
const INVALID_RULES_BG_COLOR = "#FEF4F5";

const useInvalidRulesBadgeStyles = makeStyles({
  badge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "2px 10px",
    borderRadius: "999px",
    border: `0.5px solid ${INVALID_RULES_TEXT_COLOR}`,
    backgroundColor: INVALID_RULES_BG_COLOR,
  },
  icon: {
    width: "16px",
    height: "16px",
    fontSize: "16px",
    color: INVALID_RULES_TEXT_COLOR,
  },
  text: {
    fontFamily: "Manrope",
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "20px",
    letterSpacing: 0,
    color: INVALID_RULES_TEXT_COLOR,
  },
});

const SCOPE_INFO_TEXT =
  "All active Style-Color IDs within the selected scope are included in the rule. However, product selection is dynamic and may change as the assortment changes.";

/** Create-new-rule Rules grid + scope info footer (impact-ui footer selectors, not JSS hashes). */
const useCreateNewRuleGridStyles = makeStyles({
  // impact UI needs to override the width of the footer section to 100%
  rulesGridWrapper: {
    "& .table-footer-section.table-footer-section-without-pagination": {
      width: "100% !important",
    },
  },
  scopeInfoRow: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    paddingLeft: 0,
    minWidth: 0,
  },
  scopeInfoIcon: {
    width: 16,
    height: 16,
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    "& svg": { width: 16, height: 16, display: "block" },
  },
  scopeInfoText: {
    margin: 0,
    fontFamily: "Manrope",
    fontSize: "14px",
    fontWeight: 500,
    lineHeight: "20px",
    color: "#7A8294",
    wordBreak: "break-word",
  },
});

const SetConstraints = (props) => {
  const {
    constraintsConfigs,
    inventorysmartModulesPermission,
    inventorysmartScreenConfig,
    module,
    pageSize,
    selectedRclProductLevel,
    createRulesTableLoader,
    selectedPlan,
    isSetAllModalVisible,
    savedSetAllModalData,
    defaultValues,
    defaultFilters,
    setConstraintsConfigs,
    addSnack,
    setRulesCreateLoader,
    setSelectedRCLFromTable,
    setAllModalVisibility,
    setAllModalData,
    saveEditedRCL,
    savedEditedRcls,
    setCreateRulesTableManualBody,
  } = props;

  const location = useLocation();
  const actionColumnClasses = useConstraintsActionColumnStyles();
  const createNewRuleGridClasses = useCreateNewRuleGridStyles();
  const invalidRulesClasses = useInvalidRulesBadgeStyles();
  const inventorySmartClasses = useInventorySmartStyles();
  const globalClasses = globalStyles();
  const agGridInstance = useRef(null);
  const ruleTypeRef = useRef(DEFAULT_RULE_TYPE_OPTION.value);
  const handlersRef = useRef({
    onDeleteClick: () => {},
    addChildRow: () => {},
  });
  const minDistributionHandlersRef = useRef({
    openModal: () => {},
  });
  const fetchExistingRclInFlightRef = useRef(false);
  const [rclColumnConfig, setRclColumnConfig] = useState([]);
  const invalidKeysRef = useRef([]);
  const [rclRulesTableName, setRclRulesTableName] = useState(() => {
    const session = loadCreateNewRuleFlowSession();
    if (session?.activeStep === 1 && session?.tableName) {
      return session.tableName;
    }
    return null;
  });
  const [filtersOfRclConstraints, setFiltersOfRclConstraints] = useState([]);
  const [deSelectedRows, setDeselectedRows] = useState([]);
  const [selectedParentAndChildRows, setSelectedParentAndChildRows] = useState(
    []
  );
  const [selectedRuleTypeOption, setSelectedRuleTypeOption] = useState(
    DEFAULT_RULE_TYPE_OPTION
  );
  const [ruleTypeSelectOpen, setRuleTypeSelectOpen] = useState(false);
  const [rulesSummaryMessage, setRulesSummaryMessage] = useState(null);
  const [showRulesSummaryBanner, setShowRulesSummaryBanner] = useState(true);
  const [totalRulesCount, setTotalRulesCount] = useState(0);
  const [minDistributionModalStatus, setMinDistributionModalStatus] = useState(
    false
  );
  const [minDistributionRowData, setMinDistributionRowData] = useState({});

  const isEditEnabled = canEditCreateNewRuleConstraints(
    inventorysmartModulesPermission,
    inventorysmartScreenConfig
  );

  const activeProductFilters = useMemo(
    () =>
      resolveConstraintFiltersFromProps({
        selectedRclProductLevel,
        defaultFilters,
      }),
    [selectedRclProductLevel, defaultFilters]
  );

  /** Step-1 refresh: tenant configs (style_mapping_key) are not loaded unless we fetch them. */
  useEffect(() => {
    if (constraintsConfigs?.style_mapping_key) {
      return undefined;
    }
    let cancelled = false;
    const loadConfigs = async () => {
      try {
        await fetchCreateNewRuleTenantConfigs({
          screenName: CREATE_NEW_RULE_SCREEN_NAME,
          setConstraintsConfigs,
        });
      } catch (err) {
        if (!cancelled) {
          handleErrorMessage(err, { addSnack });
        }
      }
    };
    loadConfigs();
    return () => {
      cancelled = true;
    };
  }, [addSnack, constraintsConfigs?.style_mapping_key, setConstraintsConfigs]);

  /** Update invalidKeys state when props change */
  useEffect(() => {
    invalidKeysRef.current = props.invalidKeys || [];
    const gridApi = agGridInstance.current?.api;
    if (!gridApi) {
      return () => {
        invalidKeysRef.current = [];
      };
    }
    const timeoutId = setTimeout(() => {
      gridApi.refreshServerSideStore({ purge: true });
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      invalidKeysRef.current = [];
    };
  }, [props.invalidKeys]);

  useEffect(() => {
    const onLoad = async () => {
      const rulesConstraintColDef = await getColumnsAg(
        "table_name=create_rules_constraint_table"
      )();
      const cols = buildSetConstraintsColumns(rulesConstraintColDef, {
        isEditEnabled,
        showSingleMergedRows: !!constraintsConfigs?.showSingleMergedRows,
        handlersRef,
        minDistributionHandlersRef,
        inventorySmartClasses,
      });
      setRclColumnConfig(formatActionColumn(cols));
    };
    onLoad();
    return () => {
      saveEditedRCL([]);
    };
  }, [
    inventorysmartModulesPermission,
    inventorysmartScreenConfig,
    constraintsConfigs?.showSingleMergedRows,
    isEditEnabled,
    handlersRef,
    minDistributionHandlersRef,
    inventorySmartClasses,
    saveEditedRCL,
  ]);

  const applyTableName = (tableName, filters) => {
    if (!tableName) return;
    saveCreateNewRuleFlowSession({
      activeStep: 1,
      tableName,
      filters,
    });
    setRclRulesTableName((previousTableName) => {
      const gridApi = agGridInstance?.current?.api;
      if (
        previousTableName &&
        previousTableName !== tableName &&
        gridApi?.refreshServerSideStore
      ) {
        gridApi.refreshServerSideStore({ purge: true });
      }
      return tableName;
    });
  };

  const fetchRulesList = async () => {
    if (fetchExistingRclInFlightRef.current) {
      return;
    }
    if (!activeProductFilters.length) {
      return;
    }

    const persistedTableName = getPersistedCreateNewRuleTableName(
      activeProductFilters
    );
    if (persistedTableName) {
      if (rclRulesTableName !== persistedTableName) {
        applyTableName(persistedTableName, activeProductFilters);
      }
      return;
    }

    fetchExistingRclInFlightRef.current = true;
    setRclRulesTableName(null);
    try {
      const requestBody = { filters: activeProductFilters };
      const response = await fetchCreateNewRuleExistingRclDetails(
        requestBody,
        CREATE_NEW_RULE_RCL_CODE
      );
      if (response?.data?.data?.table_name) {
        applyTableName(response?.data?.data?.table_name, activeProductFilters);
      }
    } catch (error) {
      handleErrorMessage(error, props);
    } finally {
      fetchExistingRclInFlightRef.current = false;
    }
  };

  /** One table_name setup per filter set; createRcl runs once when the grid mounts. */
  useEffect(() => {
    if (!activeProductFilters.length) {
      return;
    }

    if (isCreateNewRuleStep1Refresh(activeProductFilters)) {
      const persistedTableName = getPersistedCreateNewRuleTableName(
        activeProductFilters
      );
      if (persistedTableName && rclRulesTableName !== persistedTableName) {
        applyTableName(persistedTableName, activeProductFilters);
      }
      return;
    }

    if (rclRulesTableName) {
      return;
    }

    fetchRulesList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProductFilters, defaultFilters]);

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const fetchTableData = useCallback(
    async (manualbody, pageIndex, params) => {
      if (!rclRulesTableName) {
        return { data: [], totalCount: 0 };
      }

      setCreateRulesTableManualBody({
        meta: {
          ...manualbody,
          limit: { limit: pageSize || 10, page: pageIndex + 1 },
        },
      });
      const activeFilters = activeProductFilters;

      let l0_name;
      let l1_name;
      activeFilters.forEach((thisLevel) => {
        if (thisLevel?.attribute_name === "l0_name") {
          l0_name = thisLevel?.values[0];
        }
        if (thisLevel?.attribute_name === "l1_name") {
          l1_name = thisLevel?.values[0];
        }
      });

      try {
        setRulesCreateLoader(true);
        const tempCreationBody = {
          meta: {
            ...manualbody,
            limit: { limit: pageSize || 10, page: pageIndex + 1 },
          },
          filters: activeFilters,
          l0_name,
          l1_name,
          table_name: rclRulesTableName,
          rule_type: ruleTypeRef.current,
        };
        setFiltersOfRclConstraints(tempCreationBody);

        // const responseFromCreation = USE_RCL_CREATION_API
        //   ? await createRcl(tempCreationBody, true, false, false)
        //   : { data: mockData };
        const responseFromCreation = await createNewRuleRcl(
          tempCreationBody
        );
        setRulesCreateLoader(false);

        setRulesSummaryMessage(
          buildRulesSummaryBannerMessage(
            responseFromCreation?.data?.data?.summary
          )
        );
        setTotalRulesCount(
          responseFromCreation?.data?.data?.summary?.total_rules || 0
        );

        if (responseFromCreation?.data?.show_message) {
          displaySnackMessages(
            responseFromCreation?.data?.message,
            "success",
            props
          );
        }

        if (!responseFromCreation.data?.data?.rules?.length) {
          return { data: [], totalCount: 0 };
        }

        let result = addUniqueKeyToSubrows(
          cloneDeep(responseFromCreation?.data?.data?.rules),
          "data"
        );
        // Sort child rows by start_date for each parent row
        result = result.map((row) => {
          row.data = row.data ? sortChildRowsByStartDate(row.data) : row.data;
          return row;
        });
        result = result.map((row) => {
          row.data = row.data?.map((subRow) => {
            const nextSubRow = applyMinDistributionRowFields(subRow);
            // Blank UI for new rules — keep null/undefined for display, but null breaks
            // int cell max (dynamicMaxKey): !isNaN(null) is true so max becomes null and min cannot be edited.
            if (nextSubRow.min_stock === null) {
              nextSubRow.min_stock = undefined;
            }
            if (nextSubRow.max_stock === null) {
              nextSubRow.max_stock = undefined;
            }
            return nextSubRow;
          });
          return row;
        });
        let formattedData;
        if (pageIndex) {
          formattedData = agGridRowFormatter(
            result,
            params?.api?.checkConfiguration,
            "key"
          );
        } else {
          params?.api?.setCheckConfiguration([]);
          formattedData = result;
        }

        // Apply rule_id_status based on invalidKeys from ref (always has latest value)
        const invalidKeys = invalidKeysRef.current || [];

        if (invalidKeys.length > 0) {
          formattedData = formattedData.map((row) => ({
            ...row,
            rule_id_status: invalidKeys.includes(row.key)
              ? "inactive"
              : "active",
          }));
        }

        return {
          data: formattedData,
          totalCount:
            responseFromCreation?.data?.data?.summary?.total_rules || 0,
        };
      } catch (error) {
        setRulesCreateLoader(false);
        handleErrorMessage(error, props);
        return { data: [], totalCount: 0 };
      }
    },
    [
      rclRulesTableName,
      pageSize,
      activeProductFilters,
      setCreateRulesTableManualBody,
      setRulesCreateLoader,
      props,
      defaultValues?.min_stock,
      defaultValues?.max_stock,
    ]
  );

  const onSelectionChanged = (event) => {
    const {
      selectedRows,
      deSelections,
      nestedSelection,
    } = collectConstraintGridSelection({
      api: agGridInstance?.current?.api,
      event,
      isParentRow: isParentRowByLevel,
      getParentRowFields: getExceptionStoreParentRowFields,
      deselectionFields: ["rule_code", "psa_code", "store_code"],
    });

    setSelectedRCLFromTable(selectedRows);
    setDeselectedRows(deSelections || []);
    setSelectedParentAndChildRows(nestedSelection);
  };

  const saveRclEditedValue = (params) => {
    if (params.column.colId === "rule_name") {
      return;
    }
    const { oldValue, newValue, data } = params;
    if (oldValue !== newValue && !isNull(newValue) && newValue !== "") {
      params?.node?.setDataValue(params?.colDef?.id, newValue);
      const parentNode = params.node.parent;
      if (parentNode?.data) {
        const parentData = { ...parentNode.data };
        const childIndex = parentData.data.findIndex(
          (row) => row.key === params.node.data.key
        );
        if (childIndex !== -1) {
          parentData.data[childIndex] = { ...params.node.data };
          // Defer parent setData — cell-value change can still be mid AG Grid draw.
          setTimeout(() => {
            parentNode.setData(parentData);
          }, 0);
        }
      }
      if (params?.colDef?.type === "datetime") {
        if (!moment(newValue).isValid()) {
          displaySnackMessages(
            `Please enter a valid date in ${tenantDateFormat} format`,
            "error",
            props
          );
          params?.node?.setDataValue(params?.colDef?.id, null);
          return;
        }
        const end_date = new Date(params?.data?.end_date);
        const start_date = new Date(params?.data?.start_date);
        if (!isNull(params?.data?.end_date) && end_date < start_date) {
          displaySnackMessages(
            "End date cannot be less than start date",
            "error",
            props
          );
          return params?.node?.setDataValue(
            "end_date",
            params?.data?.start_date
          );
        }
        const tempDateValidation = checkRedundantDate(
          params?.node?.parent?.data?.data,
          newValue,
          params?.colDef?.id,
          data
        );
        if (tempDateValidation) {
          displaySnackMessages(
            `Please choose dates that are not in the same range for ${params?.colDef?.label}.`,
            "error",
            props
          );
          return params?.node?.setDataValue(params?.colDef?.id, null);
        }
        addDataToEditableState(params, data);
      } else {
        addDataToEditableState(params, data);
      }
    } else if (newValue === "" || isNull(newValue)) {
      displaySnackMessages(
        `Cannot have null values in ${params?.colDef?.label}`,
        "error",
        props
      );
      return params?.node?.setDataValue(params?.colDef?.id, oldValue);
    }
  };

  const onBlur = async (_e, data, column, isChanged) => {
    if (column?.colId === "rule_name" && isChanged) {
      const { rule_name, rule_code } = data;
      try {
        const response = await saveRuleName(
          {
            rule_name: rule_name || "",
            rule_code,
            table_name: rclRulesTableName,
          },
          false
        );
        if (response?.status && response?.data?.message) {
          displaySnackMessages(response?.data?.message, "success", props);
          agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
        }
      } catch (e) {
        handleErrorMessage(e, props);
      }
    }
  };

  const addChildRow = (params) => {
    const tempValidation = validateForNullValues(
      params?.data?.data,
      agGridInstance,
      displaySnackMessages,
      props
    );
    if (tempValidation?.length <= 0) {
      const newRowData = childNewRowDataWithMinDistribution(params);
      const newRowAdded = Object.assign(params.data, {
        data: [...(params.data?.data || []), newRowData],
      });
      addDataToEditableState(params, newRowData);
      params.node.setExpanded(false);
      params.node.setData(newRowAdded);
      params.node.setExpanded(true);
    }
  };

  const onDeleteClick = (params) => {
    const parentNode = params.node.parent;
    let childNodes = params.node.parent.data.data.filter(
      (item) => item.key !== params.data.key
    );
    childNodes = childNodes.map((item, index) => ({
      ...item,
      key: index,
    }));
    parentNode.setExpanded(false);
    const updated_data = { ...params.node.parent.data };
    updated_data.data = childNodes;
    parentNode.setData(updated_data);
    addDataToEditableState(params, updated_data);
    parentNode.setExpanded(true);
  };

  const handleMinDistributionSave = (params, newData) => {
    const node = params?.node;
    const nextChild = { ...(node?.data || params?.data || {}), ...newData };
    const parentNode = node?.parent;
    const parentChildren = parentNode?.data?.data;
    const nextChildren = Array.isArray(parentChildren)
      ? parentChildren.map((row) =>
          String(row.key) === String(nextChild.key) ? nextChild : row
        )
      : null;

    if (parentNode?.data && nextChildren) {
      parentNode.data.data = nextChildren;
    }
    if (node) {
      node.setData(nextChild);
    }
    addDataToEditableState(
      { ...params, data: nextChild, node },
      nextChild,
      nextChildren
    );
  };

  const addDataToEditableState = (params, data, nestedRows) => {
    const clonedRclsList = cloneDeep(savedEditedRcls || []);
    const editableColumns = agGridInstance?.current?.api.columnModel
      .getAllGridColumns()
      ?.filter(
        (col) =>
          col?.colId !== "rule_name" &&
          (col?.colDef?.is_editable || col?.colDef?.extra?.isEditableConstraint)
      );
    const toLoopThroughConstraints =
      nestedRows || params?.node?.parent?.data?.data || params?.data?.data;
    const constraints = toLoopThroughConstraints?.map((subRows) => {
      const constraintsWithSubrow = [];
      editableColumns?.forEach((attri) => {
        if (attri?.colId !== "x_units_per_size") {
          let attributeValue = subRows?.[attri?.colId];
          if (attri?.colDef?.type === "datetime") {
            attributeValue = moment(subRows?.[attri?.colId]).format(
              "YYYY-MM-DD"
            );
          } else if (attri.colId === "min_distribution") {
            attributeValue = buildMinDistributionAttributeValue(subRows);
          }
          constraintsWithSubrow.push({
            attribute_name: attri?.colId,
            attribute_value: attributeValue,
          });
        }
      });
      return constraintsWithSubrow;
    });

    const payload = {
      constraint: [...constraints],
      row_update: [
        {
          rule_code:
            params?.data?.rule_code || params?.node?.parent?.data?.rule_code,
          psa_code:
            params?.data?.psa_code || params?.node?.parent?.data?.psa_code,
          store_code:
            data?.store_code || params?.node?.parent?.data?.store_code,
          key: params?.data?.uniqueParentKey || params?.node?.data?.key,
        },
      ],
      table_name: rclRulesTableName,
      meta: {
        ...tableConfigurationMetaData.meta,
        limit: { limit: pageSize || 10, page: 1 },
      },
      excluded_rows: [],
      is_all_records_selected: false,
    };

    const payloadIndex = clonedRclsList?.findIndex(
      (saved) => saved?.row_update?.[0]?.key === data?.uniqueParentKey
    );
    if (payloadIndex > -1) {
      clonedRclsList[payloadIndex] = {
        ...clonedRclsList[payloadIndex],
        ...payload,
      };
    } else {
      clonedRclsList.push(payload);
    }
    saveEditedRCL([...clonedRclsList]);
  };

  useEffect(() => {
    handlersRef.current = {
      onDeleteClick,
      addChildRow,
    };
    minDistributionHandlersRef.current = {
      openModal: (cellData) => {
        setMinDistributionRowData(cellData);
        setMinDistributionModalStatus(true);
      },
    };
  });

  // commenting for future use
  // const onBulkDelete = async () => {
  //   try {
  //     const response = await deleteRcl(
  //       {
  //         table_name: localStorage.getItem("rclCreatedTableName"),
  //         row_delete: selectedPlan,
  //         meta: filtersOfRclConstraints?.meta || {
  //           ...tableConfigurationMetaData.meta,
  //           limit: { limit: pageSize || 10, page: 1 },
  //         },
  //       },
  //       false
  //     );
  //     setSelectedRCLFromTable([]);
  //     agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
  //     agGridInstance?.current?.api?.deselectAll?.();
  //     displaySnackMessages(response?.data?.message, "success", props);
  //   } catch (error) {
  //     handleErrorMessage(error, props);
  //   }
  // };

  const onRuleTypeChange = (option) => {
    const nextValue = typeof option === "string" ? option : option?.value;
    if (!nextValue || nextValue === ruleTypeRef.current) {
      return;
    }
    const matchedOption =
      RULE_TYPE_FILTER_OPTIONS.find((item) => item.value === nextValue) ||
      (typeof option === "object"
        ? option
        : { label: nextValue, value: nextValue });

    ruleTypeRef.current = nextValue;
    setSelectedRuleTypeOption(matchedOption);
    setShowRulesSummaryBanner(true);
    setSelectedRCLFromTable([]);
    saveEditedRCL([]);

    const gridApi = agGridInstance.current?.api;
    const gridContext = gridApi?.gridOptionsWrapper?.gridOptions?.context;
    if (gridContext) {
      gridContext.manualCallBack = (body, pageIndex, gridParams) =>
        fetchTableData(body, pageIndex, gridParams);
    }
    gridApi?.refreshServerSideStore?.({ purge: true });
  };

  const getTopRightOptions = () => {
    if (selectedPlan?.length > 0) {
      return [
        <Button
          key="set-all-create-new-rule"
          id="set-all-create-new-rule"
          variant="primary"
          onClick={() => setAllModalVisibility(true)}
          disabled={!isEditEnabled || isUndefined(selectedPlan)}
        >
          Set All
        </Button>,
      ];
    }

    return [
      <div key="create-new-rule-type-label">
        <span>Rule Type</span>
      </div>,
      <Select
        key="create-new-rule-type-filter"
        isSearchable={true}
        isClearable={false}
        menuShouldBlockScroll={false}
        isMulti={false}
        minWidth="168px"
        options={RULE_TYPE_FILTER_OPTIONS}
        isOpen={ruleTypeSelectOpen}
        setIsOpen={setRuleTypeSelectOpen}
        setCurrentOptions={() => {}}
        currentOptions={RULE_TYPE_FILTER_OPTIONS}
        selectedOptions={selectedRuleTypeOption}
        initialOptions={RULE_TYPE_FILTER_OPTIONS}
        data-testid="select-rule-type-filter"
        handleChange={onRuleTypeChange}
        setSelectedOptions={setSelectedRuleTypeOption}
      />,
    ];
  };

  const getTopLeftOptions = () => {
    const invalidRulesCount = props.invalidKeys?.length || 0;
    if (invalidRulesCount === 0) {
      return null;
    }

    return [
      <div key="invalid-rules-count" className={invalidRulesClasses.badge}>
        <ErrorOutlineIcon className={invalidRulesClasses.icon} />
        <span className={invalidRulesClasses.text}>
          {`${invalidRulesCount} of ${
            totalRulesCount || invalidRulesCount
          } Rules needs Constraints to proceed`}
        </span>
      </div>,
    ];
  };

  const getTopCenterOptions = () => {
    if (!showRulesSummaryBanner || !rulesSummaryMessage) {
      return null;
    }

    return [
      <Alert
        key="rules-summary-banner"
        severity="info"
        title={rulesSummaryMessage}
        subtleBackground={true}
        onClose={() => setShowRulesSummaryBanner(false)}
      />,
    ];
  };

  const getBottomLeftOptions = () => [
    <div
      key="scope-info-footer"
      className={createNewRuleGridClasses.scopeInfoRow}
    >
      <span className={createNewRuleGridClasses.scopeInfoIcon}>
        <InfoSvg />
      </span>
      <p className={createNewRuleGridClasses.scopeInfoText}>
        {SCOPE_INFO_TEXT}
      </p>
    </div>,
  ];

  return (
    <div className={globalClasses.marginTop_24}>
      <Loader
        loader={createRulesTableLoader || !rclRulesTableName}
        minHeight="380px"
      >
        <div style={{ minHeight: 380 }}>
          <SetAllModalComponent
            rulesTableName={rclRulesTableName}
            useTableName={true}
            showSetAllModal={isSetAllModalVisible}
            setAllModalVisible={setAllModalVisibility}
            filterDependencies={filtersOfRclConstraints}
            savedSetAllModalData={savedSetAllModalData}
            setAllModalData={setAllModalData}
            saveSetAllModalData={saveCreateNewRuleSetAllDataForRCL}
            resetSelectedPlan={() => {
              setSelectedRCLFromTable([]);
              saveEditedRCL([]);
            }}
            selectedPlan={selectedPlan}
            selectedParentAndChildRows={selectedParentAndChildRows}
            agGridInstance={agGridInstance}
            filtersWithSearch={filtersOfRclConstraints}
            setDeselectedRows={setDeselectedRows}
            deSelectedRows={deSelectedRows}
            excludeDeselections={true}
            disableRelativeWos={true}
            enableMinDistribution={isEditEnabled}
            inventorysmartModulesPermission={inventorysmartModulesPermission}
            module={module}
          />

          <NewMinDistributionModal
            isModalOpen={minDistributionModalStatus}
            setIsModalOpen={setMinDistributionModalStatus}
            rowData={minDistributionRowData}
            addDataToEditableState={addDataToEditableState}
            handleMinDistributionSave={handleMinDistributionSave}
            filters={activeProductFilters}
            flow="set_rcl_constraints"
          />

          {rclRulesTableName && rclColumnConfig?.length > 0 && (
            <div className={createNewRuleGridClasses.rulesGridWrapper}>
              <AgGridComponent
                key="create-new-rule-grid"
                customClass={actionColumnClasses.grid}
                tableHeader="Rules"
                loadTableInstance={loadTableInstance}
                manualCallBack={(body, pageIndex, params) =>
                  fetchTableData(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                uniqueRowId="key"
                columns={rclColumnConfig}
                selectAllHeaderComponent={isEditEnabled}
                enableChildRowSelection={props.showNewConstraintFlow}
                syncChildAndParentSelection={props.showNewConstraintFlow}
                onSelectionChanged={onSelectionChanged}
                pagination={false}
                onCellValueChanged={saveRclEditedValue}
                onBlur={onBlur}
                cacheBlockSize={pageSize || 10}
                paginationPageSize={pageSize}
                skipAutoSizeColumn={true}
                childKey="data"
                treeData={true}
                purgeClosedRowNodes
                hideChildSelection
                groupDisplayType="custom"
                topRightOptions={getTopRightOptions()}
                topLeftOptions={getTopLeftOptions()}
                topCenterOptions={getTopCenterOptions()}
                bottomLeftOptions={getBottomLeftOptions()}
              />
            </div>
          )}
        </div>
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    constraintsConfigs:
      inventorysmartReducer?.inventorySmartConstraints?.constraintsConfigs,
    inventorysmartModulesPermission:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    pageSize:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    selectedRclProductLevel:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclProductLevel,
    createRulesTableLoader:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesTableLoader,
    selectedPlan:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclFromTable,
    isSetAllModalVisible:
      inventorysmartReducer?.rulesConstraintsReducer?.isSetAllModalVisible,
    savedSetAllModalData:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesSetAllModalData,
    savedEditedRcls:
      inventorysmartReducer?.rulesConstraintsReducer?.savedEditedRcls,
    defaultValues:
      inventorysmartReducer?.rulesConstraintsReducer?.createRulesConfigs
        ?.setConstraints?.default_values,
    defaultFilters:
      inventorysmartReducer?.rulesConstraintsReducer?.createRulesConfigs
        ?.default_filters,
    invalidKeys: inventorysmartReducer?.rulesConstraintsReducer?.invalidKeys,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setRulesCreateLoader: (payload) =>
      dispatch(setRulesTableLoaderAction(payload)),
    setSelectedRCLFromTable: (payload) =>
      dispatch(setSelectedRCLFromTableAction(payload)),
    setAllModalVisibility: (body) =>
      dispatch(setAllModalVisibilityAction(body)),
    setAllModalData: (data) => dispatch(setAllModalDataAction(data)),
    saveEditedRCL: (body) => dispatch(saveEditedRCLAction(body)),
    setCreateRulesTableManualBody: (payload) =>
      dispatch(setCreateRulesTableManualBodyAction(payload)),
    setConstraintsConfigs: (payload) =>
      dispatch(setConstraintsConfigsAction(payload)),
    setInvalidKeys: (payload) => dispatch(setInvalidKeysAction(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SetConstraints);
