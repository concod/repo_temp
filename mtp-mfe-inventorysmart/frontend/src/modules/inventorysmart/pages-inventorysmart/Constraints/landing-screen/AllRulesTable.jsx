import { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import AddActionButton from "modules/inventorysmart/components/ui-actions/AddActionButton";
import SetAllModalComponent from "../../Common/components/Set-All-Modal-Component";
import {
  collectConstraintGridSelection,
  getPartiallySelectedParentIds,
  getRulesParentRowFields,
} from "../../Common/components/constraintSelectionUtils";
import { connect } from "react-redux";
import { cloneDeep, isEmpty, isNull, isUndefined } from "lodash";
import {
  displaySnackMessages,
  isActionAllowedOnSubModule,
} from "../../inventorysmart-utility";
import {
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Grid } from "@mui/material";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import { useExceptionStyles } from "../../Exceptions-stores/exceptionStyles";
import { useStyles as useInventorySmartStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import { deleteRules } from "../../../services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { tableConfigurationMetaData } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import {
  addChildRow,
  addDataToEditableState,
  addUniqueKeyToSubrows,
  checkRedundantDate,
  flattenJSON,
  getPropsWithFreshEditedData,
  getSizeBasedonRowHeight,
  onDeleteClick,
  sortChildRowsByStartDate,
  transformConstraintsToAttributeFormat,
  validateConstraintFields,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import {
  getRulesListData,
  saveEditedRules,
  saveSetAllModalData,
  setAllModalData,
  setAllModalVisibility,
  setRulesTableData,
  setRulesTableLoader,
  setSelectedRulesList,
  resetToDefault,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import moment from "moment";
import { handleErrorMessage } from "../Rules-Constraints/add-rcl-component";
import { Button, BottomSheet, Tooltip } from "impact-ui-v3";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import commentingColumnFormatter from "../../../../../core/Utils/agGrid/commentingColumnFormatter";
import MinDistributionModal from "../Rules-Constraints/MinDistribution/MinDistributionModal";
import NewMinDistributionModal from "../create-new-rule-flow/min-distribution/NewMinDistributionModal";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { setStoreConstraintsConfigs } from "../../../services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { DEFAULT_RULES_LIST_STATUS } from "./kpiCardConstants";
import {
  applyActionColumnLayout,
  useConstraintsActionColumnStyles,
  injectStatusColumn,
  renderParentDash,
  renderReadOnlyConstraintValue,
  wrapColumnsWithEmptyCell,
  applyNumericColumnAlignment,
} from "./constraintsCommonUtils";
import {
  statusBadgeCellRenderer,
  transformMinDistribution,
} from "../Rule-Group-Constraints/ruleGroupUtils";
import { cellStyles } from "../Rule-Group-Constraints/ruleGroupStyles";
import InfoBanner from "../../Exceptions-stores/InfoBanner";
import ExceptionStoresListTable from "../../Exceptions-stores/excpetion_constraints_list_component";
import Loader from "core/Utils/Loader/loader";
import {
  saveSetAllModalData as saveExceptionSetAllModalData,
  setExceptionTableLoader,
  saveEditedExceptions,
  setSelectedExceptionList as setSelectedExceptionListAction,
  setAllModalVisibility as setExceptionSetAllModalVisibility,
  saveStateAfterExceptionUpdate,
} from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import { flyRuleGroupBannerToTab } from "./ruleGroupBannerAnimation";
import UpViewIcon from "assets/up_view.svg";
import { hasNestedStyleSizeMinDistribution } from "../create-new-rule-flow/createNewRuleConstraintsUtils";

const tenantDateFormat = localStorage.getItem("tenantDateFormat");

const applyAllRulesNumericColumnStyles = (colDef) => {
  const nestedColumns = colDef?.children?.length
    ? colDef.children
    : colDef?.sub_headers;

  nestedColumns?.forEach(applyAllRulesNumericColumnStyles);

  applyNumericColumnAlignment(colDef);
};

/** SSRM tree child rows can report level 0; detect via parent/child shape. */
const isConstraintChildRow = (cellProps) => {
  const node = cellProps?.node;
  if (!node) {
    return false;
  }
  if (node.level > 0) {
    return true;
  }
  return Boolean(node.parent?.data?.data) && !node.data?.data;
};

const isConstraintParentRow = (cellProps) => {
  const node = cellProps?.node;
  if (!node) {
    return false;
  }
  return Array.isArray(node.data?.data) && !isConstraintChildRow(cellProps);
};

const formatAllRulesTableData = (
  apiData,
  { isEditEnabled = true, isNewConstraintsFlow = false } = {}
) => {
  const transformed = transformMinDistribution(apiData, {
    isNewConstraintsFlow,
  }).map((row) => {
    const isDefault = Boolean(row?.is_default);
    return {
      ...row,
      // Keep checkbox visible but disabled for default rules (AgGrid cellStyle).
      checkbox_disabled: isDefault,
      // Also disable selection of children belonging to a default rule.
      data: isDefault
        ? row.data?.map((subRow) => ({
            ...subRow,
            checkbox_disabled: true,
          }))
        : row.data,
    };
  });

  if (isEditEnabled) {
    return transformed;
  }

  return transformed.map((row) => ({
    ...row,
    data: row.data?.map((subRow) => ({
      ...subRow,
      min_distribution: "Same minimum for all sizes",
    })),
  }));
};

const AllRulesTable = (props) => {
  const isOMSConstraintsFlow =
    sessionStorage.getItem("isOMSConstraintsFlow") === "true";

  const [rulesConstraintListColumns, setRulesConstraintColumns] = useState([]);
  const [deSelectedRows, setDeselectedRows] = useState([]);
  const [selectedParentAndChildRows, setSelectedParentAndChildRows] = useState([]);
  const [minDistributionModalStatus, setMinDistributionModalStatus] = useState(
    false
  );
  const [minDistributionRowData, setMinDistributionRowData] = useState({});
  const [isLastPage, setIsLastPage] = useState(false);
  const [
    enableSetAllMinDistribution,
    setEnableSetAllMinDistribution,
  ] = useState(true);
  // Rule group created success banner + its fly-to-tab exit animation.
  const [ruleGroupBannerVisible, setRuleGroupBannerVisible] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showExceptionDetails, setShowExceptionDetails] = useState(false);
  const [exceptionRuleData, setExceptionRuleData] = useState(null);
  const ruleGroupBannerTimerRef = useRef(null);
  const ruleGroupBannerRef = useRef(null);
  const filterDependencies = useRef({});
  const rulesListStatusRef = useRef(
    props.rulesListStatus || DEFAULT_RULES_LIST_STATUS
  );
  const skipRulesListStatusRefreshRef = useRef(true);
  const agGridInstance = useRef(null);
  const exceptionEditsAppliedRef = useRef(false);
  const savedEditedDataRef = useRef(props.savedEditedData || []);
  const useStyles = useExceptionStyles();
  const inventorySmartClasses = useInventorySmartStyles();
  const actionColumnClasses = useConstraintsActionColumnStyles();

  const isColumnEditable = (column, isOMSConstraintsFlow, isEditEnabled) => {
    if (isOMSConstraintsFlow) {
      return column?.is_editable && isEditEnabled;
    }
    return isEditEnabled;
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const enableEdit = () => {
    let editEnabled = canTakeActionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_CONSTRAINTS,
      "edit"
    );
    if (isOMSConstraintsFlow) {
      editEnabled = canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.OMS_RULES_CONSTRAINTS,
        "edit"
      );
    }
    return editEnabled && !props.isUploadPending;
  };

  const isEditEnabledRef = useRef(enableEdit());
  isEditEnabledRef.current = enableEdit();

  const CONSTRAINT_COLUMN_NAMES = [
    "wos",
    "st",
    "min_stock",
    "max_stock",
    "category_minimum",
    "category_maximum",
    "start_date",
    "end_date",
  ];

  const isConstraintColumn = (column) =>
    CONSTRAINT_COLUMN_NAMES.indexOf(column?.column_name) > -1 ||
    column?.extra?.isEditableConstraint;

  const renderConstraintCell = (cellProps, extraProps, column) => {
    if (!isConstraintChildRow(cellProps)) {
      return renderParentDash(column);
    }

    const isParentDefault = cellProps?.node?.parent?.data?.is_default;
    const isDateColumn = column.column_name.includes("date");

    if (isParentDefault && isDateColumn) {
      const formattedDate = cellProps?.value
        ? moment(cellProps.value).format(
            localStorage.getItem("tenantDateFormat") || "MM-DD-YYYY"
          )
        : "";
      return renderReadOnlyConstraintValue(
        { ...cellProps, value: formattedDate },
        { ...column, type: "str" }
      );
    }

    if (!isEditEnabledRef.current || isParentDefault) {
      return renderReadOnlyConstraintValue(cellProps, column);
    }

    return (
      <CellRenderers
        cellData={cellProps}
        column={column}
        extraProps={extraProps}
      ></CellRenderers>
    );
  };

  const applyRulesConstraintColumnRenderers = (data) => {
    if (props?.constraintsConfigs?.showSingleMergedRows) {
      return;
    }

    if (!isConstraintColumn(data)) {
      data.is_editable = data?.is_editable && isEditEnabledRef.current;
    }
    // data?.sub_headers?.forEach((subData) => {
    //   if (!isConstraintColumn(subData)) {
    //     subData.is_editable =
    //       subData.is_editable && isEditEnabledRef.current;
    //   }
    // });

    if (data?.column_name === "rule_code") {
      data.cellRenderer = "agGroupCellRenderer";
      data.cellRendererParams = {
        innerRenderer: (cellProps, extraProps) => {
          return (
            <CellRenderers
              cellData={cellProps}
              column={{ ...data, type: "ruleIdWithStatus" }}
              extraProps={extraProps}
            />
          );
        }
      };
      data.rowGroup = true;
    }
    if (data?.column_name === "status") {
      data.cellRenderer = statusBadgeCellRenderer;
      data.width = data.width || 200;
    }
    if (data?.column_name === "rule_name") {
      data.editable = (params) => {
        if (!isConstraintParentRow(params)) {
          return false;
        }
        return (
          isColumnEditable(
            data,
            isOMSConstraintsFlow,
            isEditEnabledRef.current
          ) && !params?.node?.data?.is_default
        );
      };
      data.valueGetter = (params) => {
        if (isConstraintChildRow(params)) {
          return null;
        }
        return params.data?.rule_name ?? "";
      };
      data.cellRenderer = (cellProps, extraProps) => {
        if (!isConstraintParentRow(cellProps)) {
          return <></>;
        }
        const displayValue =
          cellProps.value ?? cellProps.data?.rule_name ?? "";
        const cellData = { ...cellProps, value: displayValue };
        const isColumnEditEnabled = isColumnEditable(
          data,
          isOMSConstraintsFlow,
          isEditEnabledRef.current
        );
        if (isColumnEditEnabled && !cellProps?.node?.data?.is_default) {
          return (
              <CellRenderers
                cellData={cellData}
                column={data}
                extraProps={extraProps}
              />
          );
        }
        return <div>{displayValue}</div>;
      };
    }
    if (isConstraintColumn(data)) {
      data.cellRenderer = (cellProps, extraProps) =>
        renderConstraintCell(cellProps, extraProps, data);
    }
    if (data?.column_name === "end_date") {
      data.disablePast = true;
    }
    if (data?.column_name === "min_distribution") {
      data.is_aggregated = false;
      data.width = 470;
      data.minWidth = 470;
      data.extra = { ...data.extra, width: 470 };
      data.cellRenderer = (cellProps, extraProps) => {
        const hasDetails = hasNestedStyleSizeMinDistribution(cellProps?.data);
        if (!isConstraintChildRow(cellProps)) {
          return renderParentDash(data);
        }
        if (
          isEditEnabledRef.current &&
          !cellProps?.node?.parent?.data?.is_default
        ) {
          return (
            <div className={inventorySmartClasses.minDistributionCell}>
              <div className={inventorySmartClasses.minDistributionCellContent}>
                <CellRenderers
                  cellData={cellProps}
                  column={data}
                  extraProps={extraProps}
                />
              </div>
              {hasDetails && (
                <span
                  role="button"
                  onClick={() => {
                    setMinDistributionRowData(cellProps?.data);
                    setMinDistributionModalStatus(true);
                  }}
                  className={inventorySmartClasses.minDistributionIconBtn}
                  aria-label="View style and size details"
                >
                  <UpViewIcon className={inventorySmartClasses.minDistributionIcon} />
                </span>
              )}
            </div>
          );
        }
        return renderReadOnlyConstraintValue(cellProps, data);
      };
      data.onClick = (tableInfo) => {
        setMinDistributionRowData(tableInfo.cellData);
        setMinDistributionModalStatus(true);
      };
    }
    if (data?.column_name === "exceptions") {
      data.type = "link";
      //custom cellRenderer because we are using commenting cell renderer here and AgGridcolumn formatter 
      data.cellRenderer = (cellProps) => {
        if (isConstraintChildRow(cellProps)) return <></>;
        const value = cellProps?.value;
        if (value === null || value === undefined) return "-";
        return (
            <Button
              variant="url"
              onClick={() => {
                props.setExceptionSetAllModalVisibility(false);
                props.setSelectedExceptionListAction([]);
                props.saveEditedExceptions([]);
                setExceptionRuleData(cellProps?.data);
                setShowExceptionDetails(true);
              }}
            >
              {value}
            </Button>
        );
      };
    }
    if (data?.column_name === "action") {
      applyActionColumnLayout(data);
      data.cellRenderer = (params) => {
        if (isConstraintChildRow(params)) {
          return (
            <div>
              <DeleteActionButton
                iconOnly
                plainHover
                onClick={() => {  
                  onDeleteClick(
                    getPropsWithFreshEditedData(props, savedEditedDataRef),
                    params,
                    agGridInstance,
                    filterDependencies,
                    deSelectedRows
                  );
                }}
                disabled={
                  !isEditEnabledRef.current ||
                  params?.node?.parent?.data?.data?.length === 1 ||
                  params?.node?.parent?.data?.is_default
                }
                size={getSizeBasedonRowHeight(params)}
              />
            </div>
          );
        }
        if (!isConstraintParentRow(params)) {
          return "";
        }
        return (
          <div>
            <AddActionButton
              iconOnly
              plainHover
              onClick={() => {
                addChildRow(
                  getPropsWithFreshEditedData(props, savedEditedDataRef),
                  params,
                  agGridInstance,
                  filterDependencies,
                  null,
                  {
                    useNestedMinDistribution: Boolean(
                      props.showNewConstraintFlow
                    ),
                  }
                );
              }}
              disabled={
                !isEditEnabledRef.current ||
                params?.node?.data?.data?.length > 4 ||
                params?.node?.data?.is_default
              }
            />
          </div>
        );
      };
    }

    const nestedColumns = data?.children?.length
      ? data.children
      : data?.sub_headers;
    nestedColumns?.forEach(applyRulesConstraintColumnRenderers);
  };

  useEffect(() => {
    fetchModuleConfigs();
  }, []);

  useEffect(() => {
    savedEditedDataRef.current = props.savedEditedData || [];
  }, [props.savedEditedData]);

  useEffect(() => {
    if (!props.rulesConstraintColumnsFromParent) {
      return;
    }
    isEditEnabledRef.current = enableEdit();
    let rulesConstraintColDef = injectStatusColumn(
      cloneDeep(props.rulesConstraintColumnsFromParent)
    );
    rulesConstraintColDef.forEach(applyAllRulesNumericColumnStyles);
    rulesConstraintColDef.forEach(applyRulesConstraintColumnRenderers);
    wrapColumnsWithEmptyCell(rulesConstraintColDef);
    setRulesConstraintColumns(
      commentingColumnFormatter(
        rulesConstraintColDef,
        null,
        false, // isThreadFeatureEnabled add later for chat funtionality
        false
      )
    );
  }, [
    props.rulesConstraintColumnsFromParent,
    props.inventorysmartModulesPermission,
    props.module,
    props.isUploadPending,
    props?.constraintsConfigs?.showSingleMergedRows,
  ]);

  useEffect(() => {
    isEditEnabledRef.current = enableEdit();
    const gridApi = agGridInstance.current?.api;
    if (!gridApi) {
      return undefined;
    }
    // Defer so we don't call the grid API while AG Grid is mid-draw.
    const timeoutId = setTimeout(() => {
      gridApi.refreshCells({ force: true });
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [
    props.inventorysmartModulesPermission,
    props.module,
    props.isUploadPending,
  ]);

  useEffect(() => {
    if (!isEmpty(props.selectedDependencyValue)) {
      filterDependencies.current = props.selectedDependencyValue;
    } else {
      // setting ref to empty
      filterDependencies.current = {};
    }
    props.setSelectedRulesList([]);
    setDeselectedRows([]);
    // New filter context reloads the grid; pending cell edits no longer apply.
    props.saveModifiedData([]);
    savedEditedDataRef.current = [];
    const gridApi = agGridInstance.current?.api;
    if (!gridApi) {
      return undefined;
    }
    const timeoutId = setTimeout(() => {
      if (!isEmpty(props.selectedDependencyValue)) {
        gridApi.refreshServerSideStore({ purge: true });
      }
      gridApi.deselectAll();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [props.selectedDependencyValue]);

  useEffect(() => {
    rulesListStatusRef.current =
      props.rulesListStatus || DEFAULT_RULES_LIST_STATUS;
  }, [props.rulesListStatus]);

  useEffect(() => {
    if (skipRulesListStatusRefreshRef.current) {
      skipRulesListStatusRefreshRef.current = false;
      return;
    }
    const gridApi = agGridInstance.current?.api;
    if (!gridApi) {
      return undefined;
    }
    props.setSelectedRulesList([]);
    setDeselectedRows([]);
    const timeoutId = setTimeout(() => {
      gridApi.deselectAll();
      gridApi.refreshServerSideStore({ purge: true });
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [props.rulesListStatus]);

  useEffect(() => {
    if (!props?.rulesDataUpdatedState) {
      return undefined;
    }
    const gridApi = agGridInstance.current?.api;
    if (!gridApi) {
      return undefined;
    }
    const timeoutId = setTimeout(() => {
      gridApi.refreshServerSideStore({ purge: true });
      gridApi.deselectAll();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [props?.rulesDataUpdatedState]);

  const fetchModuleConfigs = async () => {
    try {
      let reqBody = {
        module_name: "store_constraints_configs",
        screen_name: props.screenName,
      };
      let response = await props.getModuleBasedTenantConfig(reqBody);
      props.setStoreConstraintsConfigs(response);
    } catch (e) {
      handleErrorMessage(e,props);
    } 
  };

  const manualCallFetchRulesList = async (manualbody, pageIndex, params) => {
    props.setRulesTableLoader(true);
    let body = {
      meta: {
        ...manualbody,
        limit: {
          limit: props.pageSize || 10,
          page: isNull(pageIndex) ? 1 : pageIndex + 1,
        },
      },
      filters: isEmpty(filterDependencies.current)
        ? []
        : filterDependencies?.current?.filters,
      selection: {
        data: [
          ...agGridInstance?.current?.api?.checkConfiguration,
          {
            checkedRows: agGridInstance?.current?.api
              .getSelectedRows()
              .map((item) => item.key),
          },
        ],
        unique_columns: ["key"],
      },
      status: rulesListStatusRef.current || DEFAULT_RULES_LIST_STATUS,
    };
    props.setConstraintRulesPayload(body);
    try {
      let response = await getRulesListData(body);
      // debugger;
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      props.setRulesTableLoader(false);
      if (!response.data?.data?.length) {
        return {
          data: [],
          totalCount: 0,
        };
      }
      response.data.data = formatAllRulesTableData(response.data.data, {
        isEditEnabled: enableEdit(),
        isNewConstraintsFlow: props?.isNewConstraintsFlow,
      });
      // Sort child rows by start_date for each parent row
      response.data.data = response.data.data.map(row => ({
        ...row,
        data: row.data ? sortChildRowsByStartDate(row.data) : row.data
      }));
      props.setRulesTableData(response.data.data);
      if (response.data.data.length < (props.pageSize || 10)) {
        setIsLastPage(true);
      }
      let result = props?.constraintsConfigs?.showSingleMergedRows
        ? cloneDeep(flattenJSON(response?.data?.data))
        : addUniqueKeyToSubrows(cloneDeep(response?.data?.data));

      let formattedData;
      if (pageIndex) {
        formattedData = agGridRowFormatter(
          result,
          params?.api?.checkConfiguration,
          props.uniqueKey
        );
      } else {
        params.api.setCheckConfiguration([]);
        formattedData = result;
      }

      return {
        data: formattedData,
        totalCount: response.data.total,
      };
    } catch (e) {
      props.setRulesTableLoader(false);
      handleErrorMessage(e, props);
      return {
        data: 0,
        totalCount: 0,
      };
    }
  };

  const saveTheEditedRules = (params) => {
    if (params.column.colId === "rule_name") {
      return;
    }
    let { oldValue, newValue, data } = params;
    if (oldValue !== newValue && !isNull(newValue) && newValue !== "") {
      let tempDateValidation = false;
      params?.node?.setDataValue(params?.colDef?.id, newValue);
      const parentNode = params.node.parent;
      if (parentNode && parentNode?.data) {
        const parentData = { ...parentNode.data };
        const childIndex = parentData?.data?.findIndex(
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

        let end_date = new Date(params?.data?.end_date);
        let start_date = new Date(params?.data?.start_date);
        if (!isNull(params?.data?.end_date) && end_date < start_date) {
          displaySnackMessages(
            `End date cannot be less than start date`,
            "error",
            props
          );
          return params?.node?.setDataValue(
            "end_date",
            params?.data?.start_date
          );
        }
        tempDateValidation = checkRedundantDate(
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
        } else
          addDataToEditableState(
            getPropsWithFreshEditedData(props, savedEditedDataRef),
            params,
            data,
            agGridInstance,
            filterDependencies,
            deSelectedRows
          );
      } else {
        addDataToEditableState(
          getPropsWithFreshEditedData(props, savedEditedDataRef),
          params,
          data,
          agGridInstance,
          filterDependencies,
          deSelectedRows
        );
      }
    } else if (oldValue !== newValue && newValue === "") {
      displaySnackMessages(
        `Cannot have null values in ${params?.colDef?.label}`,
        "error",
        props
      );
      addDataToEditableState(
        getPropsWithFreshEditedData(props, savedEditedDataRef),
        params,
        data,
        agGridInstance,
        filterDependencies,
        deSelectedRows
      );
      return params?.node?.setDataValue(params?.colDef?.id, newValue);
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    const { selectedRows, deSelections, nestedSelection } =
      collectConstraintGridSelection({
        api: agGridInstance?.current?.api,
        event,
        isParentRow: (node) => isConstraintParentRow({ node }),
        getParentRowFields: getRulesParentRowFields,
        deselectionFields: ["rule_code", "psa_code"],
      });

    setEnableSetAllMinDistribution(
      selectedRows.every((row) => row?.is_article_level === true)
    );
    props?.setSelectedRulesList(selectedRows);
    setDeselectedRows(deSelections);
    setSelectedParentAndChildRows(nestedSelection);
  };

  const onDelete = async (tableData) => {
  // When child rows are involved, split parents into two groups:
  // - parents that still have selected children (constraint.length > 0)
  //   -> update via set-all API
  // - parents with no selected children left
  //   -> delete via delete API
  if (selectedParentAndChildRows?.length > 0) {
    const sharedFilters = isUndefined(filterDependencies?.current?.filters)
      ? []
      : filterDependencies?.current?.filters;

    const sharedMeta = {
      limit: {
        limit: props.pageSize || 10,
        page: 1,
      },
      ...(isUndefined(filterDependencies?.current?.meta)
        ? tableConfigurationMetaData.meta
        : filterDependencies?.current?.meta),
    };

    const parentsWithConstraints = selectedParentAndChildRows.filter(
      (parent) => parent?.constraint?.length > 0
    );

    const parentsWithoutConstraints = selectedParentAndChildRows.filter(
      (parent) => !(parent?.constraint?.length > 0)
    );

    const rowsToDelete = parentsWithoutConstraints.filter(
      (parent) => !parent.is_default
    );

    // Build unchecked rows from the rows being deleted in this flow
    let unCheckedRows = rowsToDelete
      .filter(
        (row) =>
          row?.rule_code !== undefined &&
          row?.rule_code !== null
      )
      .map((row) => ({
        rule_code: row.rule_code,
      }));

    // Remove duplicates
    unCheckedRows = [
      ...new Map(
        unCheckedRows.map((item) => [
          item.rule_code,
          item,
        ])
      ).values(),
    ];

    props?.setRulesTableLoader(true);

    try {
      if (rowsToDelete.length > 0) {
        const payloadToDelete = {
          filters: sharedFilters,
          meta: sharedMeta,
          row_delete: rowsToDelete,
          checkAll: false,
          unCheckedRows,
        };
        const deleteResponse = await deleteRules(
          payloadToDelete,
          isOMSConstraintsFlow
        );
        if (
          deleteResponse?.data?.show_message ||
          deleteResponse?.status
        ) {
          displaySnackMessages(
            deleteResponse?.data?.message,
            "success",
            props
          );
        }
      }

      if (parentsWithConstraints.length > 0) {
        const transformedUpdates = parentsWithConstraints.map(
          (parent) => ({
            ...parent,
            constraint: transformConstraintsToAttributeFormat(
              parent.constraint
            ),
          })
        );

        const updatesPayload = {
          filters: sharedFilters,
          updates: transformedUpdates,
          meta: sharedMeta,
          excluded_rows: [],
          is_all_records_selected: false,
          is_new_row: false,
        };

        const setAllResponse = await saveSetAllModalData(
          updatesPayload,
          false
        );

        if (
          setAllResponse?.data?.show_message ||
          setAllResponse?.status
        ) {
          displaySnackMessages(
            setAllResponse?.data?.message,
            "success",
            props
          );
        }
      }

      agGridInstance.current.api.refreshServerSideStore({
        purge: true,
      });

      props.onRefreshRulesSummary?.();
    } catch (error) {
      handleErrorMessage(error, props);
    } finally {
      props?.setRulesTableLoader(false);
      props?.setSelectedRulesList([]);
      setDeselectedRows([]);
      setSelectedParentAndChildRows([]);
      agGridInstance?.current?.api?.deselectAll();
    }

    return;
  }

  // NORMAL FLOW
  const isAllRowsSelected =
    agGridInstance?.current?.api?.isSelectAllRecords;

  let unCheckedRows = [];

  if (isAllRowsSelected) {
    agGridInstance.current.api.forEachNode((node) => {
      // Keep existing parent row selection logic
      if (
        node?.level === 0 &&
        node?.data?.key &&
        (!node.selected || node?.data?.is_default)
      ) {
        // Only push valid rule codes
        if (
          node?.data?.rule_code !== undefined &&
          node?.data?.rule_code !== null
        ) {
          unCheckedRows.push({
            rule_code: node.data.rule_code,
          });
        } else {
          console.warn(
            "rule_code missing for unchecked row:",
            node?.data
          );
        }
      }
    });

    // Remove duplicate rule codes
    unCheckedRows = [
      ...new Map(
        unCheckedRows.map((item) => [
          item.rule_code,
          item,
        ])
      ).values(),
    ];
  }

  const payloadToDelete = {
    filters: isUndefined(filterDependencies?.current?.filters)
      ? []
      : filterDependencies?.current?.filters,

    meta: {
      limit: {
        limit: props.pageSize || 10,
        page: 1,
      },
      ...(isUndefined(filterDependencies?.current?.meta)
        ? tableConfigurationMetaData.meta
        : filterDependencies?.current?.meta),
    },

    row_delete: props?.selectedPlan?.filter(
      (plan) => !plan.is_default
    ),

    checkAll: isAllRowsSelected,

    // Add unchecked rule codes
    unCheckedRows,
  };

  props?.setRulesTableLoader(true);

  try {
    const response = await deleteRules(
      payloadToDelete,
      isOMSConstraintsFlow
    );

    const defaultItems = props?.selectedPlan?.filter(
      (plan) => plan.is_default
    );

    if (defaultItems.length) {
      displaySnackMessages(
        `${defaultItems.length} default ${
          defaultItems.length === 1 ? "item" : "items"
        } have not been deleted`,
        "warning",
        props
      );
    } else {
      displaySnackMessages(
        response?.data?.message,
        "success",
        props
      );
    }

    agGridInstance.current.api.refreshServerSideStore({
      purge: true,
    });

    props.onRefreshRulesSummary?.();
  } catch (error) {
    handleErrorMessage(error, props);
  } finally {
    props?.setRulesTableLoader(false);
    props?.setSelectedRulesList([]);
    setDeselectedRows([]);
    agGridInstance?.current?.api?.deselectAll();
  }
};

  const saveRuleNameOnBlur = async (
    params,
    row,
    column,
    isChanged,
    value,
    initialValue
  ) => {
    if (column.colId === "rule_name" && isChanged && value !== initialValue) {
      let payload = {
        rule_name: params?.target?.value,
        rule_code: row?.rule_code,
      };
      props?.callRulesSaveOnBlur(params, row, column, payload, agGridInstance);
    }
  };

  const checkDefaultRuleSelected = () => {
    let defaultRuleSelected = false;
    let selectedRows = agGridInstance.current.api.getSelectedRows();
    selectedRows.map((row) => {
      if (row.is_default) {
        defaultRuleSelected = true;
      }
    });
    return defaultRuleSelected;
  };

  const handleResetToDefault = async () => {
    props.setRulesTableLoader(true);
    let rowUpdate = [];
    const partiallySelectedParentIds = getPartiallySelectedParentIds(
      agGridInstance?.current?.api
    );
    agGridInstance?.current?.api?.forEachNode((node) => {
      if (
        isConstraintParentRow({ node }) &&
        (node.selected || partiallySelectedParentIds.has(node.id))
      ) {
        rowUpdate.push({
          rule_code: node.data?.rule_code,
          psa_code: node?.data?.psa_code,
          key: node?.data?.key,
        });
      }
    });
    let requestBody = {
      filters: isUndefined(filterDependencies?.current?.filters)
        ? []
        : filterDependencies?.current?.filters,
      meta: {
        limit: { limit: props.pageSize || 10, page: 1 },
        ...(isUndefined(filterDependencies?.current?.meta)
          ? tableConfigurationMetaData.meta
          : filterDependencies?.current?.meta),
      },
      row_update: agGridInstance?.current?.api?.isSelectAllRecords
        ? []
        : rowUpdate,
    };
    try {
      let response = await resetToDefault(requestBody);
      if (response?.data?.show_message) {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
      if (response?.data?.message)
        displaySnackMessages(response?.data?.message, "success", props);
    } catch (error) {
      props.setRulesTableLoader(false);
      handleErrorMessage(error, props);
    } finally {
      props?.setRulesTableLoader(false);
      props?.setSelectedRulesList([]);
      setDeselectedRows([]);
      agGridInstance?.current?.api?.deselectAll();
    }
  };

  function isDisabled() {
    if (
      agGridInstance.current?.api?.isSelectAllRecords &&
      props?.selectedPlan?.length === 0 &&
      !isLastPage
    ) {
      return false;
    }

    return (
      !enableEdit() ||
      isUndefined(props?.selectedPlan) ||
      props?.selectedPlan?.length === 0
    );
  }

  const disableDelete = () => {
    if (agGridInstance?.current?.api?.isSelectAllRecords) {
      return !enableEdit();
    }
    return (
      !enableEdit() ||
      !props?.selectedPlan?.filter((plan) => !plan.is_default).length
    );
  };


  const renderTopRightOptions = () => {
    const hasSelectedRows =
      props.selectedPlan?.length > 0 ||
      agGridInstance?.current?.api?.isSelectAllRecords;
    const showCreateRuleGroup = props.selectedPlan?.length > 0;
    const showAddExceptions =
      props.showNewConstraintFlow && props.selectedPlan?.length > 0;
    const showApplyCancel =
      !hasSelectedRows && props?.savedEditedData?.length > 0;

    return (
      <>
        {props.showNewConstraintFlow && !hasSelectedRows && !showApplyCancel && (
          <Button
            id="create-new-rule-constraints-table"
            variant="primary"
            // will change to medium later
            size="large"
            onClick={props.onCreateNewRule}
            disabled={props.isUploadPending}
          >
            Create New Rule
          </Button>
        )}
        {hasSelectedRows && (
          <DeleteActionButton
            onClick={() => {
              if (checkDefaultRuleSelected()) {
                displaySnackMessages(
                  "One or more selected rules cannot be deleted as they are system defaults. Please change the selection",
                  "info",
                  props
                );
              } else {
                onDelete();
              }
            }}
            disabled={disableDelete()}
          />
        )}
        {hasSelectedRows && (showCreateRuleGroup || showAddExceptions) && (
          <div
            key="selection-actions-separator"
            className={inventorySmartClasses.dividerLine}
          />
        )}
        {showCreateRuleGroup && (
          <Button
            id="create-rule-group-button"
            variant="tertiary"
            size="large"
            onClick={() => {
               if (checkDefaultRuleSelected()) {
                displaySnackMessages(
                  "One or more selected rules cannot be edited as they are system defaults. Please change the selection",
                  "info",
                  props
                );
                return;
              }
              props.onCreateRuleGroup();
            }}
          >
            Create Rule Group
          </Button>
        )}
        {showAddExceptions && (
          <Button
            id="add-exceptions-button"
            variant="secondary"
            size="large"
            onClick={() => {
              if (checkDefaultRuleSelected()) {
                displaySnackMessages(
                  "One or more selected rules cannot be edited as they are system defaults. Please change the selection",
                  "info",
                  props
                );
                return;
              }
              props.onAddExceptions();
            }}
          >
            Add Exceptions
          </Button>
        )}
        {props?.storeConstraintsConfigs?.revertToDefault && (
          <Button
            id="revert-to-default"
            variant="tertiary"
            size="large"
            onClick={() => {
              //Check if the selected rows contain any rules at default level. if any rule at default rule is present, display snackmessage else open the set all modal.
              if (checkDefaultRuleSelected()) {
                displaySnackMessages(
                  "One or more selected rules cannot be edited as they are system defaults. Please change the selection",
                  "info",
                  props
                );
              } else {
                handleResetToDefault();
              }
            }}
            disabled={
              !enableEdit() ||
              isUndefined(props?.selectedPlan) ||
              props?.selectedPlan?.length === 0
            }
          >
            Revert to Default
          </Button>
        )}
        {props.selectedPlan?.length > 0 && <Button
          id="set-all-exception"
          variant="primary"
          onClick={() => {
            //Check if the selected rows contain any rules at default level. if any rule at default rule is present, display snackmessage else open the set all modal.
            if (checkDefaultRuleSelected()) {
              displaySnackMessages(
                "One or more selected rules cannot be edited as they are system defaults. Please change the selection",
                "info",
                props
              );
            } else {
              props?.setAllModalVisibility(true);
            }
          }}
          disabled={isDisabled()}
        >
          Set All
        </Button>}
        {showApplyCancel && (
          <>
            <Button
              id="cancelStore-id"
              variant="tertiary"
              size="large"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel
            </Button>
            <Button
              id="applyStore-id"
              onClick={props.onApply}
              variant="primary"
              size="large"
            >
              Apply
            </Button>
          </>
        )}
      </>
    );
  };

  const handleCancelEdits = () => {
    props.saveModifiedData([]);
    agGridInstance?.current?.api?.refreshServerSideStore?.({ purge: true });
    setShowCancelConfirm(false);
  };

  // const isCommentFeatureEnabled = Boolean(
  //   props?.inventorysmartScreenConfig?.inventory_smart_comment_and_thread
  //     ?.isCommentFeatureEnabled
  // );

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

    // Patch parent.data.data in place — same approach as SetConstraints —
    // so Apply reads the saved drawer values without a setTimeout race.
    if (parentNode?.data && nextChildren) {
      parentNode.data.data = nextChildren;
    }
    if (node) {
      node.setData(nextChild);
    }

    addDataToEditableState(
      getPropsWithFreshEditedData(props, savedEditedDataRef),
      { ...params, data: nextChild, node },
      nextChild,
      agGridInstance,
      filterDependencies,
      deSelectedRows
    );
  };

  const dismissRuleGroupBanner = () => {
    clearTimeout(ruleGroupBannerTimerRef.current);
    flyRuleGroupBannerToTab(ruleGroupBannerRef.current, () => {
      setRuleGroupBannerVisible(false);
      props.onCloseRuleGroupBanner && props.onCloseRuleGroupBanner();
    });
  };

  // Show the "Rule group created" banner when a group is created, then trigger
  // the fly-to-tab dismiss after a short delay.
  useEffect(() => {
    if (props.showRuleGroupBanner) {
      setRuleGroupBannerVisible(true);
      clearTimeout(ruleGroupBannerTimerRef.current);
      ruleGroupBannerTimerRef.current = setTimeout(dismissRuleGroupBanner, 3000);
    }
    return () => clearTimeout(ruleGroupBannerTimerRef.current);
  }, [props.showRuleGroupBanner]);

  const renderRuleGroupBanner = () => {
    if (!ruleGroupBannerVisible) return null;
    return (
      <div ref={ruleGroupBannerRef} style={{ width: "495px" }}>
        <InfoBanner
          variant="success"
          fullWidth
          message="Rule group created. View it in the 'Rule Group Tab'."
          onClose={dismissRuleGroupBanner}
        />
      </div>
    );
  };

  const handleSaveSetAllModalData = async (...args) => {
    const response = await saveSetAllModalData(...args);
    // Set All persists + refreshes the grid; clear pending cell edits so Apply hides.
    props.saveModifiedData([]);
    return response;
  };

  const handleCloseExceptionSheet = () => {
    props.saveEditedExceptions([]);
    setShowExceptionDetails(false);
    setExceptionRuleData(null);
    if (exceptionEditsAppliedRef.current) {
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
      exceptionEditsAppliedRef.current = false;
    }
  };

  const handleApplyExceptionEdits = async () => {
    if (!props?.savedEditedExceptions?.length) return;

    const constraintValidationChecks = validateConstraintFields(
      cloneDeep(props.savedEditedExceptions)
    );

    if (constraintValidationChecks?.inValidDate?.length > 0) {
      displaySnackMessages(
        `Invalid Date found in ${constraintValidationChecks.inValidDate}`,
        "error",
        props
      );
      return;
    }
    if (constraintValidationChecks?.nullValues?.length > 0) {
      displaySnackMessages(
        `Null values found in ${constraintValidationChecks.nullValues}`,
        "error",
        props
      );
      return;
    }

    props.setExceptionTableLoader(true);
    props.saveStateAfterExceptionUpdate(false);
    try {
      const promises = props.savedEditedExceptions.map(
        async (editedRow) => await saveExceptionSetAllModalData(editedRow)
      );
      await Promise.all(promises);
      displaySnackMessages("Updated Successfully", "success", props);
      props.saveEditedExceptions([]);
      props.setSelectedExceptionListAction([]);
      props.saveStateAfterExceptionUpdate(true);
      exceptionEditsAppliedRef.current = true;
    } catch (error) {
      handleErrorMessage(error, props);
    } finally {
      props.setExceptionTableLoader(false);
    }
  };

  return (
    <Grid>
      {showCancelConfirm && (
        <ConfirmBox
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={handleCancelEdits}
        />
      )}
      <SetAllModalComponent
        isNewConstraintsFlow={props?.isNewConstraintsFlow}
        resetSelectedPlan={props?.setSelectedRulesList}
        showSetAllModal={props?.isSetAllModalVisible}
        setAllModalVisible={props?.setAllModalVisibility}
        filterDependencies={filterDependencies}
        savedSetAllModalData={props?.savedSetAllModalData}
        setAllModalData={props?.setAllModalData}
        saveSetAllModalData={handleSaveSetAllModalData}
        selectedPlan={props?.selectedPlan}
        selectedParentAndChildRows={selectedParentAndChildRows}
        agGridInstance={agGridInstance}
        addSnack={props?.addSnack}
        filtersWithSearch={props.constraintRulesPayload}
        deSelectedRows={deSelectedRows}
        setDeselectedRows={setDeselectedRows}
        excludeDeselections={true} // this flag is required to add excluded_rows, is_all_records_selected keys in the save paylaod
        relativeWosMessage={[
          "In Relative change, values will be added to/subtracted from current WOS.",
          "In Relative change, WOS values will be adjusted for the relevant Rule-Store combinations in the exception screen as well.",
        ]}
        disableRelativeWos={
          props?.isRelativeWOSdisabled || false
        }
        enableMinDistribution={enableSetAllMinDistribution}
      />
      {props?.isNewConstraintsFlow ? (
        <NewMinDistributionModal
          isModalOpen={minDistributionModalStatus}
          setIsModalOpen={setMinDistributionModalStatus}
          rowData={minDistributionRowData}
          filters={filterDependencies?.current?.filters}
          addDataToEditableState={addDataToEditableState}
          handleMinDistributionSave={handleMinDistributionSave}
          flow={"rules_constraint_list"}
        />
      ) : (
        <MinDistributionModal
          isModalOpen={minDistributionModalStatus}
          setIsModalOpen={setMinDistributionModalStatus}
          rowData={minDistributionRowData}
          filters={filterDependencies?.current?.filters}
          addDataToEditableState={addDataToEditableState}
          handleMinDistributionSave={handleMinDistributionSave}
          flow={"rules_constraint_list"}
        />
      )}
      {showExceptionDetails && (
        <BottomSheet
          title="Exceptions"
          open={showExceptionDetails}
          onClose={handleCloseExceptionSheet}
          withExpandIcon={false}
          className={`${useStyles.exceptionBottomSheet} ${props.isExceptionSetAllModalVisible ? useStyles.exceptionBottomSheetHeight : ''}`}
          footerOptions={
            <div style={cellStyles.bottomSheetFooterActions}>
              <Button variant="url" onClick={handleCloseExceptionSheet}>
                Cancel
              </Button>
              <Button
                variant="primary"
                disabled={!props?.savedEditedExceptions?.length}
                onClick={handleApplyExceptionEdits}
              >
                Save
              </Button>
            </div>
          }
        >
          <Loader loader={props.exceptionTableLoader}>
            <ExceptionStoresListTable
              ruleData={exceptionRuleData}
              module={props.module}
              isNewConstraintsFlow={props?.isNewConstraintsFlow}
              cardContainer={false}
              onApply={handleApplyExceptionEdits}
              showSetAllInBottomSheet
              showActionButtonsInFooter
              selectedDependencyValue={props.selectedDependencyValue}
            />
          </Loader>
        </BottomSheet>
      )}
      <AgGridComponent
        customClass={actionColumnClasses.grid}
        tableHeader={"Details"}
        uniqueRowId={"key"}
        rowModelType="serverSide"
        serverSideStoreType="partial"
        selectAllHeaderComponent={enableEdit()}
        columns={rulesConstraintListColumns}
        cacheBlockSize={props.pageSize || 10}
        onSelectionChanged={onSelectionChanged}
        loadTableInstance={loadTableInstance}
        manualCallBack={(body, pageIndex, params) =>
          manualCallFetchRulesList(body, pageIndex, params)
        }
        onCellValueChanged={(params) => {
          saveTheEditedRules(params);
        }}
        onBlur={(params, row, column, isChanged, value, initialValue) =>
          saveRuleNameOnBlur(
            params,
            row,
            column,
            isChanged,
            value,
            initialValue
          )
        }
        skipAutoSizeColumn={true}
        hideChildSelection={true}
        groupDisplayType={"custom"}
        suppressAggFuncInHeader={true}
        enableChildRowSelection={props.showNewConstraintFlow}
        syncChildAndParentSelection={props.showNewConstraintFlow}
        childKey={"data"}
        treeData={true}
        purgeClosedRowNodes={true}
        paginationPageSize={props.pageSize}
        disablePaginationForSinglePage={true}
        showDownloadButton={true}
        onDownloadButtonClick={props?.downloadStoreConstraints}
        topRightOptions={renderTopRightOptions()}
        topCenterOptions={renderRuleGroupBanner()}
        enableCellComment={false}
        tableName={"rules_constraint_table"}
        requestUrl={"/inventory-smart/constraint/rule/list"}
        appliedFilters={filterDependencies?.current?.filters}
        selectedRowsIDs={props.selectedPlan}
        isChatEnabled={false}
      />
    </Grid>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    savedEditedData: inventorysmartReducer?.rulesConstraintsReducer.editedRules,
    isSetAllModalVisible:
      inventorysmartReducer?.rulesConstraintsReducer.isSetAllModalVisible,
    savedSetAllModalData:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesSetAllModalData,
    selectedPlan:
      inventorysmartReducer?.rulesConstraintsReducer.selectedRulesPlan,
    rulesTableData:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesTableData,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    constraintsConfigs:
      inventorysmartReducer.inventorySmartConstraints.constraintsConfigs,
    rulesDataUpdatedState:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesDataUpdatedState,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    pageSize:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    storeConstraintsConfigs:inventorysmartReducer?.rulesConstraintsReducer?.storeConstraintsConfigs,
    isRelativeWOSdisabled:
      inventorysmartReducer?.inventorySmartConstraints?.constraintsConfigs?.isRelativeWOSdisabled,
    commentingConfig: store?.tenantConfigReducer?.commentingConfig,
    exceptionTableLoader:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionLoader,
    savedEditedExceptions:
      inventorysmartReducer?.exceptionConstraintsReducer?.savedEditedExceptions,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
    isExceptionSetAllModalVisible:
      inventorysmartReducer?.exceptionConstraintsReducer?.isSetAllModalVisible
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (payload) => dispatch(addSnack(payload)),
    saveModifiedData: (data) => dispatch(saveEditedRules(data)),
    getRulesListData: (body) => dispatch(getRulesListData(body)),
    setRulesTableData: (body) => dispatch(setRulesTableData(body)),
    setRulesTableLoader: (body) => dispatch(setRulesTableLoader(body)),
    setSelectedRulesList: (body) => dispatch(setSelectedRulesList(body)),
    setAllModalVisibility: (body) => dispatch(setAllModalVisibility(body)),
    setAllModalData: (data) => dispatch(setAllModalData(data)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setStoreConstraintsConfigs: (body) =>
      dispatch(setStoreConstraintsConfigs(body)),
    setExceptionTableLoader: (body) => dispatch(setExceptionTableLoader(body)),
    saveEditedExceptions: (data) => dispatch(saveEditedExceptions(data)),
    setSelectedExceptionListAction: (data) =>
      dispatch(setSelectedExceptionListAction(data)),
    setExceptionSetAllModalVisibility: (body) =>
      dispatch(setExceptionSetAllModalVisibility(body)),
    saveStateAfterExceptionUpdate: (data) =>
      dispatch(saveStateAfterExceptionUpdate(data)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AllRulesTable);