// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import { displaySnackMessages } from "../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  MIN_DISTRIBUTION_MAP,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import {
  createRcl,
  deleteRcl,
  fetchExistingRclDetails,
  getRclRuleList,
  saveEditedRCL,
  saveRclConstraintsTableData,
  saveSetAllDataForRCL,
  setAllModalData,
  setAllModalVisibility,
  setRulesTableLoader,
  setSelectedRCLFromTable,
  saveRuleName,
  setRclSelectedProductLevel,
} from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import AgGridComponent from "core/Utils/agGrid";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep, isEmpty, isNull, isUndefined, uniqBy } from "lodash";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import {
  addUniqueKeyToSubrows,
  checkRedundantDate,
  childNewRowData,
  validateForNullValues,
  getMinDistributionKey,
  sortChildRowsByStartDate,
  getSizeBasedonRowHeight,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import AddActionButton from "modules/inventorysmart/components/ui-actions/AddActionButton";
import { applyActionColumnLayout, renderReadOnlyConstraintValue, useConstraintsActionColumnStyles } from "../landing-screen/constraintsCommonUtils";
import { setDynamicRenderer } from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/common-functions";
import { useExceptionStyles } from "../../Exceptions-stores/exceptionStyles";
import { EDIT_RULES } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import DCStoreStrategytListTable from "../../DC-Store-Policy/DC-To-Store-Strategy/dCStoreStrategyTable";
import SetAllModal from "../../Common/components/Set-All-Modal-Component/set-all-modal";
import SetAllModalComponent from "../../Common/components/Set-All-Modal-Component";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import moment from "moment";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { handleErrorMessage } from "./add-rcl-component";
import { setCreateRulesTableManualBody } from "modules/inventorysmart/services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { Button, useTranslation } from "impact-ui-v3";
import MinDistributionModal from "./MinDistribution/MinDistributionModal";

//OMS Related Imports
import { OMS_RCL_TABLE_NAME } from "modules/oms/constants-oms/constraintsAPIConstants";
import {
  applyOrderMultiplePacksColumnVisibility,
  createPayloadItem,
  formatTableDataForPackOrdering,
  getOMSVendorConstraintsColumnConfig,
  onOMSGridFieldsChange,
  shouldShowOrderMultiplePacksForRcl,
} from "modules/oms/pages-oms/Constraints/VendorConstraints/utils";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";
import VendorConstraintsSetAllPopUp from "modules/oms/pages-oms/Constraints/VendorConstraints/vendorConstraintsSetAllPopUp";
import StoreStrategyMasterDetailTable from "../../DC-Store-Policy/DC-To-Store-Strategy/StoreStrategyMasterDetailTable";

const tenantDateFormat = localStorage.getItem("tenantDateFormat");

const SetRclConstraint = (props) => {
  const { t } = useTranslation();
  const isConstraintsFlow =
    sessionStorage.getItem("isConstraintsFlow") === "true";
  const isOMSConstraintsFlow =
    sessionStorage.getItem("isOMSConstraintsFlow") === "true";
  const agGridInstance = useRef(null);
  const useStyles = useExceptionStyles();
  const actionColumnClasses = useConstraintsActionColumnStyles();
  const [rclColumnConfig, setRclColumnConfig] = useState([]);
  const [processedRulesConstraintColDef, setProcessedRulesConstraintColDef] =
    useState(null);
  const [rclRulesTableName, setRclRulesTableName] = useState(
    props?.ruleTableData?.length
      ? localStorage.getItem("rclCreatedTableName")
      : null
  );
  const [filtersOfRclConstraints, setFiltersOfRclConstraints] = useState([]);
  const [deSelectedRows, setDeselectedRows] = useState([]);
  const [isSizeRelated, setIsSizeRelated] = useState(false);
  const [minDistributionModalStatus, setMinDistributionModalStatus] = useState(
    false
  );
  const [minDistributionRowData, setMinDistributionRowData] = useState({});
  const is_po_strategy_flow =
    JSON.parse(sessionStorage.getItem("is_po_strategy_flow")) || false;

  // OMS RCL Creation
  const RULES_CONSTRAINTS_ROW_ID =
    props?.omsScreenConfig?.unique_key || "rule_code";
  const PACK_ID_STYLE_KEY =
    props?.omsScreenConfig?.unique_pack_order_key || "article";
  const VIEW_PACK_CONFIG_DETAILS_KEY =
    props?.omsScreenConfig?.view_pack_config_details_key || "pack_exist";

  const SETALL_MAPPING = props?.omsScreenConfig?.setall_mapping || {};

  const SETALL_FORMDATA_FIELDS =
    props?.omsScreenConfig?.setall_formdata_fields || [];

  const THRESHOLD_MIN_VALUE =
    SETALL_FORMDATA_FIELDS?.filter((data) => data.accessor === "moq_tolerance")
      ?.min_value || 0;
  const THRESHOLD_MAX_VALUE =
    SETALL_FORMDATA_FIELDS?.filter((data) => data.accessor === "moq_tolerance")
      ?.max_value || 100;

  const [activeChildHierarchyKey, setActiveChildHierarchyKey] = useState(null);
  const [openPackConfigDetailSheet, setOpenPackConfigDetailSheet] = useState(
    false
  );
  const [
    packConfigDetailsPayloadData,
    setPackConfigDetailsPayloadData,
  ] = useState([]);

  const rulesConstraintsEditPayload = useRef([]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const isColumnEditable = (column, isOMSConstraintsFlow, isEditEnabled) => {
    if (isOMSConstraintsFlow) {
      return column?.is_editable && isEditEnabled;
    }
    return isEditEnabled;
  };

  //OMS Functions
  const handleClickColumnForOMS = async (data) => {
    try {
      setPackConfigDetailsPayloadData(data);
      setActiveChildHierarchyKey(data?.[PACK_ID_STYLE_KEY]);
      setOpenPackConfigDetailSheet(true);
    } catch (error) {
      console.log("Error in onClickColumn", error);
    }
  };

  const showOrderMultiplePacks = useMemo(() => {
    if (!isOMSConstraintsFlow) {
      return true;
    }
    return shouldShowOrderMultiplePacksForRcl({
      selectedRclLevel: props.selectedRclLevel,
      selectedRclProductLevel: props.selectedRclProductLevel,
      omsScreenConfig: props.omsScreenConfig,
      hierarchyList: props.hierarchyList,
    });
  }, [
    isOMSConstraintsFlow,
    props.selectedRclLevel,
    props.selectedRclProductLevel,
    props.omsScreenConfig,
    props.hierarchyList,
  ]);

  let enableMinDistributionLink = false;

  if (
    props.selectedRclLevel?.includes(
      props.constraintsConfigs?.style_mapping_key
    )
  ) {
    const allLevels = props.hierarchyList.map((level) => level.column_name);

    // Find index of each selected level in the hierarchy
    const selectedIndexes = props.selectedRclLevel
      .map((level) => allLevels.indexOf(level))
      .filter((idx) => idx !== -1); // remove anything not found

    // Highest index among selected levels
    const maxSelectedIdx = Math.max(...selectedIndexes);

    // Index of "article" in the hierarchy
    const articleIdx = allLevels.indexOf(
      props.constraintsConfigs?.style_mapping_key
    );

    // Enable only if article is the highest
    if (articleIdx === maxSelectedIdx) {
      enableMinDistributionLink = true;
    }
  }

  useEffect(() => {
    const onLoad = async () => {
      if (isConstraintsFlow) {
        let tableName = "table_name=rules_constraint_table";
        if (isOMSConstraintsFlow) {
          tableName = `table_name=${OMS_RCL_TABLE_NAME}`;
        }
        let isDCNetworkFlow = props.location.state?.redirectedFromNetworkTab;

        if (isDCNetworkFlow) {
          tableName = "table_name=rcl_creation_supply_network";
        }

        let rulesConstraintColDef = await getColumnsAg(tableName)();
        let isEditEnabled = enableEdit();
        rulesConstraintColDef.map((data) => {
          if (!props?.constraintsConfigs?.showSingleMergedRows) {
            data.is_editable = data?.is_editable && isEditEnabled;
            data?.sub_headers?.map((subData) => {
              subData.is_editable = subData.is_editable && isEditEnabled;
              return subData;
            });
            if (data?.column_name === "rule_code") {
              data.cellRenderer = "agGroupCellRenderer";
            }
            if (data?.column_name === "rule_name") {
              const isColumnEditEnabled = isColumnEditable(
                data,
                isOMSConstraintsFlow,
                isEditEnabled
              );
              data.is_hidden = false;
              data.is_editable = isOMSConstraintsFlow
                ? isColumnEditEnabled
                : true;
              return (data.cellRenderer = (cellProps, extraProps) => {
                if (cellProps.node.level !== 0) return <></>;
                else
                  return isColumnEditEnabled ? (
                    <CellRenderers
                      cellData={cellProps}
                      column={data}
                      extraProps={extraProps}
                    ></CellRenderers>
                  ) : (
                    <div>{cellProps?.value || ""}</div>
                  );
              });
            }
            if (
              [
                "wos",
                "st",
                "min_stock",
                "max_stock",
                "category_minimum",
                "category_maximum",
                "start_date",
                "end_date",
              ].indexOf(data.column_name) > -1 ||
              data.extra?.isEditableConstraint
            ) {
              data.cellRenderer = (cellProps, extraProps) =>
                isEditEnabled ? (
                  setDynamicRenderer(cellProps, extraProps, data)
                ) : (
                  <div>{cellProps?.value || ""}</div>
                );
            }
            if (data?.column_name === "end_date") {
              data.disablePast = true;
            }
            if (data?.column_name === "min_distribution") {
              data.cellRenderer = (cellProps, extraProps) => {
                data.is_aggregated = false;
                if (enableMinDistributionLink && isEditEnabled) {
                  return (
                    <CellRenderers
                      cellData={cellProps}
                      column={data}
                      extraProps={extraProps}
                    ></CellRenderers>
                  );
                } else {
                  return renderReadOnlyConstraintValue(cellProps, data);
                }
              };
              data.onClick = (tableInfo) => {
                setMinDistributionRowData(tableInfo.cellData);
                setMinDistributionModalStatus(true);
              };
            }
            if (data?.column_name === "action") {
              applyActionColumnLayout(data);
              data.cellRenderer = (params, extraProps) => {
                if (params.node.level !== 0) {
                  return (
                    <div>
                      <DeleteActionButton
                        iconOnly
                        plainHover
                        onClick={() => {
                          onDeleteClick(params);
                        }}
                        disabled={
                          !isEditEnabled ||
                          params?.node?.parent?.data?.data?.length === 1 ||
                          params?.node?.parent?.data?.is_default
                        }
                        title={t("inventorysmart.rclDeleteTooltip")}
                      />
                    </div>
                  );
                } else {
                  return (
                    <div>
                      <AddActionButton
                        iconOnly
                        plainHover
                        onClick={() => {
                          addChildRow(params);
                        }}
                        disabled={
                          !isEditEnabled ||
                          params?.node?.data?.data?.length > 2 ||
                          params?.node?.data?.is_default
                        }
                        title={t("inventorysmart.rclAddTooltip")}
                      />
                    </div>
                  );
                }
              };
            }
          }
          return data;
        });

        setProcessedRulesConstraintColDef(rulesConstraintColDef);
      }
    };
    onLoad();
    fetchRulesList();

    // Cleanup on component unmount
    return () => {
      props.saveEditedRCL([]);
    };
  }, []);

  useEffect(() => {
    if (!isConstraintsFlow || !processedRulesConstraintColDef) {
      return;
    }
    let rulesConstraintColDef = cloneDeep(processedRulesConstraintColDef);
    if (isOMSConstraintsFlow) {
      rulesConstraintColDef = applyOrderMultiplePacksColumnVisibility(
        rulesConstraintColDef,
        showOrderMultiplePacks
      );
      setRclColumnConfig(
        getOMSVendorConstraintsColumnConfig(
          rulesConstraintColDef,
          handleClickColumnForOMS,
          false,
          props?.isPackOrderingEnabled,
          props?.vendorConstraintsPackOrderIds,
          PACK_ID_STYLE_KEY,
          props?.omsScreenConfig?.is_order_multiple_disabled || false
        )
      );
    } else {
      setRclColumnConfig(rulesConstraintColDef);
    }
  }, [
    processedRulesConstraintColDef,
    showOrderMultiplePacks,
    isConstraintsFlow,
    isOMSConstraintsFlow,
    props?.isPackOrderingEnabled,
    props?.vendorConstraintsPackOrderIds,
    props?.omsScreenConfig?.is_order_multiple_disabled,
  ]);

  const fetchRulesList = async () => {
    if(props?.ruleTableData?.length)
      return
    localStorage.removeItem("rclCreatedTableName");
    let response;
    let filters = cloneDeep(props.selectedRclProductLevel);
    if (props.defaultFilters && props.defaultFilters.length) {
      filters = [...filters, ...props.defaultFilters];
      filters = uniqBy(filters, (obj) => obj.attribute_name);
      props.setRclSelectedProductLevel(filters);
    }
    try {
      let requestBody = {
        filters: filters,
      };
      let isDCNetworkFlow = props.location.state?.redirectedFromNetworkTab;

      if (!isEmpty(props?.selectedRclForAddHierarchies)) {
        response = await fetchExistingRclDetails(
          requestBody,
          props?.selectedRclForAddHierarchies?.rcl_code,
          isConstraintsFlow,
          isOMSConstraintsFlow,
          isDCNetworkFlow,
          is_po_strategy_flow
        );
      } else {
        response = await getRclRuleList(
          requestBody,
          isConstraintsFlow,
          isOMSConstraintsFlow,
          isDCNetworkFlow,
          is_po_strategy_flow
        );
      }
      if (response?.data?.data?.table_name) {
        localStorage.setItem(
          "rclCreatedTableName",
          response?.data?.data?.table_name
        );
        setRclRulesTableName(response?.data?.data?.table_name);
        agGridInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
    } catch (error) {
      if (error?.response?.status === 409) {
        handleErrorMessage(error, props);
        setTimeout(() => {
          props?.history.push(EDIT_RULES);
        }, 5000);
      } else handleErrorMessage({}, props);
    }
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const fetchTableDataRCLTable = async (manualbody, pageIndex, params) => {
    if (rclRulesTableName) {
      props?.setCreateRulesTableManualBody({
        meta: {
          ...manualbody,
          limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
        },
      });
      let l0_name = undefined;
      let l1_name = undefined;
      props?.selectedRclProductLevel.forEach((thisLevel) => {
        if (thisLevel?.attribute_name === "l0_name") {
          l0_name = thisLevel?.values[0];
        }
        if (thisLevel?.attribute_name === "l1_name") {
          l1_name = thisLevel?.values[0];
        }
      });
      try {
        props?.setRulesCreateLoader(true);
        let tempCreationBody = {
          meta: {
            ...manualbody,
            limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
          },
          filters: props?.selectedRclProductLevel,
          l0_name,
          l1_name,
          // table_name: localStorage.getItem("rclCreatedTableName"),
          table_name: rclRulesTableName,
          is_po_strategy_flow:
            JSON.parse(sessionStorage.getItem("is_po_strategy_flow")) || false,
        };
        setFiltersOfRclConstraints(tempCreationBody);
        let isDCNetworkFlow = props.location.state?.redirectedFromNetworkTab;
        if (isDCNetworkFlow) {
          delete tempCreationBody.l0_name;
          delete tempCreationBody.l1_name;
        }
        let responseFromCreation = await createRcl(
          tempCreationBody,
          isConstraintsFlow,
          isOMSConstraintsFlow,
          isDCNetworkFlow
        );
        props?.setRulesCreateLoader(false);
        if (responseFromCreation?.data?.show_message) {
          displaySnackMessages(
            responseFromCreation?.data?.detail ||
              responseFromCreation?.data?.message,
            "error",
            props
          );
        }
        let childKey = isConstraintsFlow ? "data" : "store_details";
        if (isConstraintsFlow) {
          props?.saveRclConstraintsTableData(
            responseFromCreation.data.data,
            childKey
          );
        }
        if (!responseFromCreation.data?.data?.length) {
          return {
            data: [],
            totalCount: 0,
          };
        }
        if (isConstraintsFlow && !isOMSConstraintsFlow) {
          responseFromCreation.data.data = responseFromCreation.data.data.map(
            (row) => {
              let inputData = row.data;
              inputData = inputData.map((subRow) => {
                let minDistributionType = "Configure";
                if (subRow?.min_distribution) {
                  try {
                    const parsed = JSON.parse(subRow.min_distribution);
                    minDistributionType = parsed?.distribution_type
                      ? MIN_DISTRIBUTION_MAP[parsed?.distribution_type]
                      : minDistributionType;
                  } catch (e) {
                    // If parsing fails, retain default minDistributionType
                    minDistributionType = "Configure";
                  }
                }
                subRow = {
                  ...subRow,
                  min_distribution: enableMinDistributionLink
                    ? minDistributionType
                    : "Same minimum for all sizes",
                };
                return subRow;
              });
              return { ...row, data: sortChildRowsByStartDate(inputData) };
            }
          );
        }

        let result = addUniqueKeyToSubrows(
          cloneDeep(responseFromCreation.data.data),
          childKey
        );
        if (isConstraintsFlow) {
          result = result.map((row) => {
            row.data = row.data?.map((subRow) => {
              if (subRow?.min_stock === null) {
                subRow.min_stock = props?.defaultValues?.min_stock || 0;
              }
              if (subRow?.max_stock === null) {
                subRow.max_stock = props?.defaultValues?.max_stock || 1;
              }
              return subRow;
            });
            return row;
          });
        }
        let uniqueKey = isConstraintsFlow ? "key" : "c_rule_code";

        if (isOMSConstraintsFlow) {
          uniqueKey = RULES_CONSTRAINTS_ROW_ID;
          if (props?.isPackOrderingEnabled)
            result = formatTableDataForPackOrdering(
              result,
              rclColumnConfig,
              VIEW_PACK_CONFIG_DETAILS_KEY,
              PACK_ID_STYLE_KEY,
              props?.vendorConstraintsPackOrderIds
            );
        }

        let formattedData;
        if (pageIndex) {
          formattedData = agGridRowFormatter(
            result,
            params?.api?.checkConfiguration,
            uniqueKey
          );
        } else {
          params?.api?.setCheckConfiguration([]);
          formattedData = result;
          props?.setRuleTableData(result)
        }
        setIsSizeRelated(formattedData[0]?.is_rule_size_related);
        return {
          data: formattedData,
          totalCount:
            responseFromCreation.total || responseFromCreation?.data?.total,
        };
      } catch (error) {
        props?.setRulesCreateLoader(false);
        handleErrorMessage(error, props);
        return {
          data: [],
          totalCount: 0,
        };
      }
    }
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    agGridInstance?.current?.api?.forEachNode((node) => {
      if (node?.level === 0)
        node.selected &&
          selectedRows.push({
            rule_code: node.data?.rule_code,
            psa_code: node?.data?.psa_code,
            store_code: node?.data?.store_code,
          });
    });
    props?.setSelectedRCLFromTable(selectedRows);
    //get the deselected nodes
    let deSelections = event.api
      ?.getRenderedNodes()
      ?.filter(
        (node) =>
          node.level === 0 &&
          !node.selected &&
          node.data?.rule_code &&
          node.data?.psa_code
      )
      ?.map((rowNode) => {
        return {
          rule_code: rowNode.data.rule_code,
          psa_code: rowNode.data.psa_code,
          ...(rowNode.data?.store_code && {
            store_code: rowNode.data.store_code,
          }),
        };
      });
    setDeselectedRows(deSelections);
  };

  const saveRclEditedValue = (params) => {
    if (params.column.colId === "rule_name") {
      return;
    }
    let { oldValue, newValue, data } = params;
    if (!isOMSConstraintsFlow) {
      if (oldValue !== newValue && !isNull(newValue) && newValue !== "") {
        let tempDateValidation = false;
        params?.node?.setDataValue(params?.colDef?.id, newValue);
        const parentNode = params.node.parent;
        if (parentNode && parentNode?.data) {
          const parentData = { ...parentNode.data };
          const childIndex = parentData.data.findIndex(
            (row) => row.key === params.node.data.key
          );
          if (childIndex !== -1) {
            parentData.data[childIndex] = { ...params.node.data };
            parentNode.setData(parentData);
          }
        }
        if (params?.colDef?.type === "datetime") {
          if (!moment(newValue).isValid()) {
            displaySnackMessages(
              t("inventorysmart.rclValidDateFormat", {
                format: tenantDateFormat,
              }),
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
              t("inventorysmart.rclEndDateLessThanStart"),
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
              t("inventorysmart.rclSameDateRange", {
                label: params?.colDef?.label,
              }),
              "error",
              props
            );
            return params?.node?.setDataValue(params?.colDef?.id, null);
          } else {
            addDataToEditableState(params, data);
          }
        } else {
          if (oldValue !== newValue && newValue === "" && isNull(newValue)) {
            displaySnackMessages(
              t("inventorysmart.rclNullValuesInColumn", {
                label: params?.colDef?.label,
              }),
              "error",
              props
            );
            return params?.node?.setDataValue(params?.colDef?.id, oldValue);
          } else addDataToEditableState(params, data);
        }
      } else if (oldValue !== newValue && newValue === "" && isNull(newValue)) {
        displaySnackMessages(
          t("inventorysmart.rclNullValuesInColumn", {
            label: params?.colDef?.label,
          }),
          "error",
          props
        );
        return params?.node?.setDataValue(params?.colDef?.id, oldValue);
      }
    } else {
      if (props?.isPackOrderingEnabled) {
        if (params?.colDef?.column_name === "pack_selection") {
          const rowData = params?.node?.data || data;
          let isEditedBefore = false;
          rulesConstraintsEditPayload.current = rulesConstraintsEditPayload.current.map(
            (editedRow) => {
              if (
                editedRow[RULES_CONSTRAINTS_ROW_ID] ===
                rowData?.[RULES_CONSTRAINTS_ROW_ID]
              ) {
                isEditedBefore = true;
                return {
                  ...createPayloadItem(
                    rowData,
                    RULES_CONSTRAINTS_ROW_ID,
                    SETALL_MAPPING
                  ),
                  pack_selection: newValue,
                };
              }
              return editedRow;
            }
          );
          if (!isEditedBefore) {
            rulesConstraintsEditPayload.current.push({
              ...createPayloadItem(rowData, RULES_CONSTRAINTS_ROW_ID, SETALL_MAPPING),
              pack_selection: newValue,
            });
          }
          props?.saveEditedRCL([...rulesConstraintsEditPayload.current]);
        }
      }
    }
  };

  const onBlur = async (_e, data, column, isChanged) => {
    if (isOMSConstraintsFlow) {
      onOMSGridFieldsChange(
        _e,
        data,
        column,
        isChanged,
        agGridInstance,
        props?.omsScreenConfig,
        rulesConstraintsEditPayload,
        displaySnackMessages
      );
      props?.saveEditedRCL([...rulesConstraintsEditPayload.current]);
    }
    if (isConstraintsFlow) {
      if (column?.colId === "rule_name" && isChanged) {
        const { rule_name, rule_code } = data;
        try {
          const response = await saveRuleName(
            {
              rule_name: rule_name || "",
              rule_code: rule_code,
              table_name: rclRulesTableName,
            },
            isOMSConstraintsFlow
          );
          if (response?.status && response?.data?.message) {
            displaySnackMessages(response?.data?.message, "success", props);
            agGridInstance.current.api.refreshServerSideStore({ purge: true });
          }
        } catch (e) {
          handleErrorMessage(e, props);
        }
      }
    }
  };

  const addChildRow = (params) => {
    let tempValidation = validateForNullValues(
      params?.data?.data,
      agGridInstance,
      displaySnackMessages,
      props
    );
    if (tempValidation?.length <= 0) {
      let newRowData = childNewRowData(params);
      let newRowAdded = Object.assign(params.data, {
        data: [...params.data?.data, newRowData],
      });
      addDataToEditableState(params, newRowData);
      params.node.setExpanded(false);
      params.node.setData(newRowAdded);
      params.node.setExpanded(true);
    }
  };

  const onDeleteClick = (params) => {
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
    addDataToEditableState(params, updated_data);
    parentNode.setExpanded(true);
  };

  const addDataToEditableState = (params, data) => {
    let filterDependencies = props?.selectedRclProductLevel;
    let clonedRclsList = cloneDeep(props?.savedEditedRcls);
    let editableColumns = agGridInstance?.current?.api.columnModel
      .getAllGridColumns()
      ?.filter((col) => col?.colDef?.is_editable && col?.colId !== "rule_name");
    let constraints = [];
    if (props?.constraintsConfigs?.showSingleMergedRows) {
      editableColumns?.forEach((attri) => {
        if (attri?.colId !== "x_units_per_size") {
          constraints.push({
            attribute_name: attri?.colId,
            attribute_value:
              attri?.colDef?.type === "datetime"
                ? moment(data?.[attri?.colId]).format("YYYY-MM-DD")
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
                  : attri.colId === "min_distribution"
                  ? {
                      distribution_type:
                        subRows?.min_distribution === "Configure"
                          ? "same_min"
                          : getMinDistributionKey(subRows?.min_distribution),
                      x_units_per_size: subRows?.x_units_per_size
                        ? subRows?.x_units_per_size
                        : {},
                    }
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
          rule_code:
            params?.data?.rule_code || params?.node?.parent?.data?.rule_code,
          psa_code:
            params?.data?.psa_code || params?.node?.parent?.data?.psa_code,
          store_code:
            data?.store_code || params?.node?.parent?.data?.store_code,
          key: props?.constraintsConfigs?.showSingleMergedRows
            ? data?.key
            : params?.data?.uniqueParentKey || params?.node?.data?.key,
        },
      ],
      table_name: localStorage.getItem("rclCreatedTableName"),
      meta: {
        ...tableConfigurationMetaData.meta,
        limit: {
          limit: props.pageSize || 10,
          page: 1,
        },
      },
      excluded_rows: [],
      is_all_records_selected: false,
    };
    let payloadIndex = clonedRclsList?.findIndex(
      (savedExceptions) =>
        savedExceptions?.row_update?.[0]?.key === data?.uniqueParentKey
    );
    if (payloadIndex > -1) {
      clonedRclsList[payloadIndex] = {
        ...clonedRclsList[payloadIndex],
        ...payload,
      };
    } else {
      clonedRclsList.push(payload);
    }
    props?.saveEditedRCL([...clonedRclsList]);
  };

  const onDelete = async () => {
    let filterDependencies = props?.selectedRclProductLevel;
    try {
      let response = await deleteRcl(
        {
          table_name: localStorage.getItem("rclCreatedTableName"),
          row_delete: props?.selectedPlan,
          meta: filterDependencies?.meta
            ? filterDependencies.meta
            : {
                ...tableConfigurationMetaData.meta,
                limit: { limit: props.pageSize || 10, page: 1 },
              },
        },
        isOMSConstraintsFlow
      );
      props?.setSelectedRCLFromTable([]);
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
      agGridInstance?.current?.api?.deselectAll();
      displaySnackMessages(response?.data?.message, "success", props);
    } catch (error) {
      handleErrorMessage(error, props);
    }
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
      INVENTORY_SUBMODULES_NAMES.INVENTORY_CREATE_RULES_CONSTRAINT,
      "edit"
    );
    if (isOMSConstraintsFlow) {
      editEnabled = canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.OMS_RULES_CONSTRAINTS,
        "edit"
      );
    }
    return editEnabled;
  };

  const getCustomLabel = (cellProps) => {
    try {
      const dropDownOptions = cellProps?.colDef?.extra?.options || [];
      if (dropDownOptions?.length) {
        const selectedOption = dropDownOptions.filter(
          (option) => option.value === cellProps?.value
        );
        return (
          <p>
            {selectedOption[0]?.label || t("inventorysmart.rclApplicableToAll")}
          </p>
        );
      }
      return <p style={{ textAlign: "right" }}>{cellProps?.value}</p>;
    } catch (error) {
      console.log("Error in getting Label", error);
    }
  };

  return (
    <div style={{ marginTop: "24px" }}>
      <Loader loader={props.createRulesTableLoader || !rclRulesTableName}>
        <div style={{ minHeight: "380px" }}>
          {isConstraintsFlow &&
            isOMSConstraintsFlow &&
            props?.isSetAllModalVisible && (
              <VendorConstraintsSetAllPopUp
                setShowSetAllModal={props?.setAllModalVisibility}
                agGridInstance={agGridInstance?.current}
                ruleRowId={RULES_CONSTRAINTS_ROW_ID}
                SETALL_MAPPING={SETALL_MAPPING}
                SETALL_FORMDATA_FIELDS={SETALL_FORMDATA_FIELDS}
                displaySnackMessages={displaySnackMessages}
                selectedRows={props?.selectedPlan}
                isCalledFromRCLCreation={true}
                savedSetAllModalData={props?.savedSetAllModalData}
                saveSetAllModalData={saveSetAllDataForRCL}
                setAllModalData={props?.setAllModalData}
                createRulesTableManualBody={props?.createRulesTableManualBody}
                resetSelectedPlan={() => {
                  rulesConstraintsEditPayload.current = [];
                  props.saveEditedRCL([]);
                }}
                isSizeRelated={isSizeRelated}
                isPOStrategyFlow={is_po_strategy_flow}
                showOrderMultiplePacks={showOrderMultiplePacks}
              />
            )}

          {isConstraintsFlow && !isOMSConstraintsFlow && (
            <SetAllModalComponent
              localstoreKeyTableName="rclCreatedTableName"
              useTableName={true}
              showSetAllModal={props?.isSetAllModalVisible}
              setAllModalVisible={props?.setAllModalVisibility}
              filterDependencies={props?.selectedRclProductLevel}
              savedSetAllModalData={props?.savedSetAllModalData}
              setAllModalData={props?.setAllModalData}
              saveSetAllModalData={saveSetAllDataForRCL}
              resetSelectedPlan={() => {
                props?.setSelectedRCLFromTable([]);
                props.saveEditedRCL([]);
              }}
              selectedPlan={props?.selectedPlan}
              agGridInstance={agGridInstance}
              addSnack={props?.addSnack}
              filtersWithSearch={filtersOfRclConstraints}
              setDeselectedRows={setDeselectedRows}
              deSelectedRows={deSelectedRows}
              excludeDeselections={true}
              disableRelativeWos={true}
              enableMinDistribution={enableMinDistributionLink}
              isPOStrategyFlow={is_po_strategy_flow}
            />
          )}

          <MinDistributionModal
            isModalOpen={minDistributionModalStatus}
            setIsModalOpen={setMinDistributionModalStatus}
            rowData={minDistributionRowData}
            addDataToEditableState={addDataToEditableState}
            filters={props.selectedRclProductLevel}
            flow={"set_rcl_constraints"}
          />

          {isConstraintsFlow &&
            rclRulesTableName &&
            (isOMSConstraintsFlow ? rclColumnConfig?.length > 0 : true) && (
              <AgGridComponent
                customClass={actionColumnClasses.grid}
                loadTableInstance={loadTableInstance}
                manualCallBack={(body, pageIndex, params) =>
                  fetchTableDataRCLTable(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                uniqueRowId={
                  isOMSConstraintsFlow ? RULES_CONSTRAINTS_ROW_ID : "key"
                }
                columns={rclColumnConfig}
                selectAllHeaderComponent={enableEdit()}
                hideSelectCurrentPageRecords={
                  props.createRulesConfigs?.setConstraints
                    ?.hideCurrentPageSelection ?? false
                }
                onSelectionChanged={(event) => onSelectionChanged(event)}
                onCellValueChanged={(params) => {
                  saveRclEditedValue(params);
                }}
                onBlur={onBlur}
                cacheBlockSize={props.pageSize || 10}
                paginationPageSize={props.pageSize}
                disablePaginationForSinglePage={true}
                skipAutoSizeColumn={true}
                childKey={"data"}
                treeData={true}
                purgeClosedRowNodes={true}
                hideChildSelection={true}
                groupDisplayType={"custom"}
                topRightOptions={
                  isConstraintsFlow ? (
                    <>
                      {enableEdit() &&
                        (props?.selectedPlan?.length > 0 ||
                          agGridInstance?.current?.api?.isSelectAllRecords) && (
                          <DeleteActionButton
                            className={useStyles.delete}
                            onClick={() => onDelete()}
                            disabled={!enableEdit()}
                          />
                        )}
                      {props?.selectedPlan?.length > 0 && (
                        <Button
                          id="set-all-exception"
                          variant="tertiary"
                          onClick={() => props?.setAllModalVisibility(true)}
                          disabled={
                            !enableEdit() || isUndefined(props?.selectedPlan)
                          }
                        >
                          {t("inventorysmart.rclSetAllButton")}
                        </Button>
                      )}
                    </>
                  ) : null
                }
                customCellRenderer={(cellProps) => {
                  if (
                    isOMSConstraintsFlow &&
                    cellProps?.column?.colId === "level_of_application" &&
                    cellProps?.data?.is_rule_size_related
                  ) {
                    const label = getCustomLabel(cellProps);
                    return label;
                  }
                }}
              />
            )}
          {!isConstraintsFlow && (
            props.inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown?.showStoreSourceColumn ? (
              <StoreStrategyMasterDetailTable
                selectedDependencyValue={props?.selectedRclProductLevel}
                history={props?.history}
                isManageRclFlow={true}
                fetchTableDataRCLTable={(body, pageIndex, params) =>
                  fetchTableDataRCLTable(body, pageIndex, params)
                }
                rclRulesTableName={rclRulesTableName}
                module={"inventorysmart_add_rules"}
                is_po_strategy_flow={is_po_strategy_flow}
                filtersWithSearch={filtersOfRclConstraints}
                setShowConfigure={props?.setShowConfigure}
                setRuleCode={props?.setRuleCode}
                setIsSetAll={props?.setIsSetAll}
              />
            ) : (
              <DCStoreStrategytListTable
                selectedDependencyValue={props?.selectedRclProductLevel}
                history={props?.history}
                isManageRclFlow={true}
                fetchTableDataRCLTable={(body, pageIndex, params) =>
                  fetchTableDataRCLTable(body, pageIndex, params)
                }
                rclRulesTableName={rclRulesTableName}
                module={"inventorysmart_add_rules"}
                is_po_strategy_flow={is_po_strategy_flow}
                filtersWithSearch={filtersOfRclConstraints}
              />
            )
          )}

          {openPackConfigDetailSheet && (
            <PackConfigBottomSheet
              screenName={"vendor_constraints"}
              l1DisplayName={t("inventorysmart.rclStyleLabel")}
              activeChildHierarchyKey={activeChildHierarchyKey}
              packConfigDetailsPayloadData={packConfigDetailsPayloadData}
              openPackConfigDetailSheet={openPackConfigDetailSheet}
              setOpenPackConfigDetailSheet={setOpenPackConfigDetailSheet}
            />
          )}
        </div>
      </Loader>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    configurationByRuleCode:
      inventorysmartReducer?.inventorySmartConfigurationService?.configureData,
    constraintsConfigs:
      inventorysmartReducer.inventorySmartConstraints.constraintsConfigs,
    selectedRclLevel:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclLevel,
    selectedRclProductLevel:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclProductLevel,
    setRclConstraints:
      inventorysmartReducer?.rulesConstraintsReducer?.setRclConstraints,
    createRulesTableLoader:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesTableLoader,
    selectedPlan:
      inventorysmartReducer?.rulesConstraintsReducer?.selectedRclFromTable,
    isSetAllModalVisible:
      inventorysmartReducer?.rulesConstraintsReducer.isSetAllModalVisible,
    savedEditedRcls:
      inventorysmartReducer?.rulesConstraintsReducer?.savedEditedRcls,
    savedSetAllModalData:
      inventorysmartReducer?.rulesConstraintsReducer?.rulesSetAllModalData,
    selectedRclForAddHierarchies:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.selectedRclForAddHierarchies,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService?.inventorysmartScreenConfig,
    defaultFilters:
      inventorysmartReducer?.rulesConstraintsReducer?.createRulesConfigs
        ?.default_filters,
    createRulesTableManualBody:
      inventorysmartReducer?.rulesConstraintsReducer
        ?.createRulesTableManualBody,
    defaultValues:
      inventorysmartReducer?.rulesConstraintsReducer?.createRulesConfigs
        ?.setConstraints?.default_values,
    hierarchyList:
      inventorysmartReducer?.rulesConstraintsReducer?.hierarchyList,

    //OMS RCL Creation
    omsScreenConfig:
      store.omsReducer?.orderingCommonService.orderingScreensConfig?.constraints
        ?.vendor_constraints,
    isPackOrderingEnabled:
      store.omsReducer.orderingCommonService.orderingPackOrderConfig
        ?.pack_ordering,
    vendorConstraintsPackOrderIds:
      store.omsReducer.orderingConstraintsService.vendorConstraintsPackOrderIds,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setRulesCreateLoader: (payload) => dispatch(setRulesTableLoader(payload)),
    setSelectedRCLFromTable: (payload) =>
      dispatch(setSelectedRCLFromTable(payload)),
    setAllModalVisibility: (body) => dispatch(setAllModalVisibility(body)),
    setAllModalData: (data) => dispatch(setAllModalData(data)),
    saveEditedRCL: (body) => dispatch(saveEditedRCL(body)),
    saveRclConstraintsTableData: (body) =>
      dispatch(saveRclConstraintsTableData(body)),
    setRclSelectedProductLevel: (payload) =>
      dispatch(setRclSelectedProductLevel(payload)),
    setCreateRulesTableManualBody: (payload) =>
      dispatch(setCreateRulesTableManualBody(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SetRclConstraint);
