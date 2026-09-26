// @ts-nocheck
import PropTypes from "prop-types";
import React, { useEffect, useState, useRef } from "react";
import AgGridComponent from "core/Utils/agGrid";
import AddActionButton from "modules/inventorysmart/components/ui-actions/AddActionButton";
import SetAllModalComponent from "../../Common/components/Set-All-Modal-Component";
import { connect } from "react-redux";
import { setDynamicRenderer } from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/common-functions";
import { cloneDeep, isEmpty, isNull, isUndefined } from "lodash";
import {
  displaySnackMessages,
  isActionAllowedOnSubModule,
} from "../../inventorysmart-utility";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  MIN_DISTRIBUTION_MAP,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Grid } from "@mui/material";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import { useExceptionStyles } from "../../Exceptions-stores/exceptionStyles";
import { deleteRules } from "../../../services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { tableConfigurationMetaData } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import {
  addChildRow,
  addDataToEditableState,
  addUniqueKeyToSubrows,
  checkRedundantDate,
  flattenJSON,
  getSizeBasedonRowHeight,
  onDeleteClick,
  sortChildRowsByStartDate,
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
import { handleErrorMessage } from "./add-rcl-component";
import { Tabs, Button, Tooltip, useTranslation } from "impact-ui-v3";
import DownloadIcon from "@mui/icons-material/Download";
import commentingColumnFormatter from "../../../../../core/Utils/agGrid/commentingColumnFormatter";
import MinDistributionModal from "./MinDistribution/MinDistributionModal";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { setStoreConstraintsConfigs } from "../../../services-inventorysmart/Rules-Contraints/rules-contraints-services";
import { applyActionColumnLayout, renderReadOnlyConstraintValue, useConstraintsActionColumnStyles } from "../landing-screen/constraintsCommonUtils";

const tenantDateFormat = localStorage.getItem("tenantDateFormat");

const RulesConstraintListTable = (props) => {
  const { t } = useTranslation();
  const isOMSConstraintsFlow =
    sessionStorage.getItem("isOMSConstraintsFlow") === "true";

  const [rulesConstraintListColumns, setRulesConstraintColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [deSelectedRows, setDeselectedRows] = useState([]);
  const [minDistributionModalStatus, setMinDistributionModalStatus] = useState(
    false
  );
  const [minDistributionRowData, setMinDistributionRowData] = useState({});
  const [isLastPage, setIsLastPage] = useState(false);
  const [
    enableSetAllMinDistribution,
    setEnableSetAllMinDistribution,
  ] = useState(true);
  const filterDependencies = useRef({});
  const agGridInstance = useRef(null);
  const useStyles = useExceptionStyles();
  const actionColumnClasses = useConstraintsActionColumnStyles();

  const isColumnEditable = (column, isOMSConstraintsFlow, isEditEnabled) => {
    if (isOMSConstraintsFlow) {
      return column?.is_editable && isEditEnabled;
    }
    return isEditEnabled;
  };

  useEffect(() => {
    fetchModuleConfigs();
  }, []);

  useEffect(() => {
    if (!props.rulesConstraintColumnsFromParent) {
      return;
    }
    let rulesConstraintColDef = cloneDeep(
      props.rulesConstraintColumnsFromParent
    );
    let isEditEnabled = enableEdit();
      rulesConstraintColDef.map((data) => {
        if (
          !props?.constraintsConfigs?.showSingleMergedRows
        ) {
          data.is_editable = data?.is_editable && isEditEnabled;
          data?.sub_headers?.map((subData) => {
            subData.is_editable = subData.is_editable && isEditEnabled;
            return subData;
          });
          if (data?.column_name === "rule_code") {
            data.cellRenderer = "agGroupCellRenderer";
            data.rowGroup = true;
          }
          if (data?.column_name === "rule_name") {
            const isColumnEditEnabled = isColumnEditable(
              data,
              isOMSConstraintsFlow,
              isEditEnabled
            );
            return (data.cellRenderer = (cellProps, extraProps) => {
              if (cellProps.node.level !== 0) return <></>;
              else
                return isColumnEditEnabled &&
                  !cellProps?.node?.data?.is_default ? (
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
            data.cellRenderer = (cellProps, extraProps) => {
              if (
                cellProps?.node?.parent?.data?.is_default &&
                data.column_name.includes("date")
              ) {
                return (
                  <div style={{ margin: "0px 1rem" }}>
                    {moment(cellProps?.value).format(
                      localStorage.getItem("tenantDateFormat") || "MM-DD-YYYY"
                    )}
                  </div>
                );
              }
              if (isEditEnabled && !cellProps?.node?.parent?.data?.is_default) {
                return setDynamicRenderer(cellProps, extraProps, data);
              } else {
                return <div>{cellProps?.value ?? ""}</div>;
              }
            };
          }
          if (data?.column_name === "end_date") {
            data.disablePast = true;
          }
          if (data?.column_name === "min_distribution") {
            data.is_aggregated = false;
            data.cellRenderer = (cellProps, extraProps) => {
              if (
                isEditEnabled &&
                !cellProps?.node?.parent?.data?.is_default &&
                cellProps?.node?.parent?.data?.is_article_level
              ) {
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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <DeleteActionButton
                      iconOnly
                      plainHover
                      onClick={() => {
                        onDeleteClick(
                          props,
                          params,
                          agGridInstance,
                          filterDependencies,
                          deSelectedRows
                        );
                      }}
                      disabled={
                        !isEditEnabled ||
                        params?.node?.parent?.data?.data?.length === 1 ||
                        params?.node?.parent?.data?.is_default
                      }
                      size={getSizeBasedonRowHeight(params)}
                    />
                  </div>
                );
              } else {
                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <AddActionButton
                      iconOnly
                      plainHover
                      onClick={() => {
                        addChildRow(
                          props,
                          params,
                          agGridInstance,
                          filterDependencies
                        );
                      }}
                      disabled={
                        !isEditEnabled ||
                        params?.node?.data?.data?.length > 2 ||
                        params?.node?.data?.is_default
                      }
                    />
                  </div>
                );
              }
            };
          }
        }
        return data;
      });
    setRulesConstraintColumns(
      commentingColumnFormatter(
        rulesConstraintColDef,
        null,
        isThreadFeatureEnabled,
        false
      )
    );
  }, [props.rulesConstraintColumnsFromParent]);

  useEffect(() => {
    if (!isEmpty(props.selectedDependencyValue)) {
      filterDependencies.current = props.selectedDependencyValue;
      agGridInstance.current?.api?.refreshServerSideStore({ purge: true });
    } else {
      // setting ref to empty
      filterDependencies.current = {};
    }
    props.setSelectedRulesList([]);
    setDeselectedRows([]);
    agGridInstance?.current?.api?.deselectAll();
  }, [props.selectedDependencyValue]);

  useEffect(() => {
    if (props?.rulesDataUpdatedState) {
      agGridInstance?.current?.api.refreshServerSideStore({ purge: true });
      agGridInstance?.current?.api?.deselectAll();
    }
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
      handleErrorMessage(e, props);
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
      response.data.data = response.data.data.map((row) => {
        let inputData = row.data;
        inputData = inputData.map((subRow) => {
          let minDistributionType = "Same minimum for all sizes";
          let sizeSelectionData = {};
          if (subRow.min_distribution) {
            try {
              const parsed = JSON.parse(subRow.min_distribution) || {};
              minDistributionType =
                MIN_DISTRIBUTION_MAP[parsed.distribution_type] ||
                "Same minimum for all sizes";
              sizeSelectionData = parsed.x_units_per_size || {};
            } catch (e) {
              // If parsing fails, keep default "Same minimum for all sizes"
              minDistributionType = "Same minimum for all sizes";
            }
          }
          let isEditEnabled = enableEdit();
          subRow = {
            ...subRow,
            min_distribution: isEditEnabled
              ? minDistributionType
              : "Same minimum for all sizes",
            x_units_per_size: sizeSelectionData,
          };
          return subRow;
        });
        return { ...row, data: sortChildRowsByStartDate(inputData) };
      });
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
        } else
          addDataToEditableState(
            props,
            params,
            data,
            agGridInstance,
            filterDependencies,
            deSelectedRows
          );
      } else {
        addDataToEditableState(
          props,
          params,
          data,
          agGridInstance,
          filterDependencies,
          deSelectedRows
        );
      }
    } else if (oldValue !== newValue && newValue === "") {
      displaySnackMessages(
        t("inventorysmart.rclNullValuesInColumn", {
          label: params?.colDef?.label,
        }),
        "error",
        props
      );
      addDataToEditableState(
        props,
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
    let selectedRows = [];
    agGridInstance?.current?.api?.forEachNode((node) => {
      if (node?.level === 0)
        node.selected &&
          selectedRows.push({
            rule_code: node.data?.rule_code,
            psa_code: node?.data?.psa_code,
            is_default: node?.data?.is_default,
            is_article_level: node?.data?.is_article_level,
          });
    });

    // Enable Min Distribution only if all selected rows are at article level
    const allSelectedAreArticles = selectedRows.every(
      (row) => row?.is_article_level === true
    );
    setEnableSetAllMinDistribution(allSelectedAreArticles);

    props?.setSelectedRulesList(selectedRows);

    //get the deselected nodes
    let deSelections = event.api
      ?.getRenderedNodes()
      ?.filter(
        (node) => !node.selected && node.data?.rule_code && node.data?.psa_code
      )
      ?.map((rowNode) => {
        return {
          rule_code: rowNode.data?.rule_code,
          psa_code: rowNode.data?.psa_code,
        };
      });
    setDeselectedRows(deSelections);
  };

  const onDelete = async (tableData) => {
    let isAllRowsSelected = agGridInstance?.current?.api?.isSelectAllRecords;
    let unCheckedRows = [];
    if (isAllRowsSelected) {
      agGridInstance.current.api.forEachNode((node) => {
        if (
          node?.level === 0 &&
          node?.data?.key &&
          (!node.selected || node?.data?.is_default)
        ) {
          unCheckedRows.push(node.data.key);
        }
      });
      unCheckedRows = [...new Set(unCheckedRows)];
    }
    let payloadToDelete = {
      filters: isUndefined(filterDependencies?.current?.filters)
        ? []
        : filterDependencies?.current?.filters,
      meta: {
        limit: { limit: props.pageSize || 10, page: 1 },
        ...(isUndefined(filterDependencies?.current?.meta)
          ? tableConfigurationMetaData.meta
          : filterDependencies?.current?.meta),
      },
      row_delete: isAllRowsSelected
        ? []
        : props?.selectedPlan?.filter((plan) => !plan.is_default),
      checkAll: isAllRowsSelected,
      unCheckedRows,
    };
    props?.setRulesTableLoader(true);
    try {
      let response = await deleteRules(payloadToDelete, isOMSConstraintsFlow);

      const defaultItems = isAllRowsSelected
        ? []
        : props?.selectedPlan?.filter((plan) => plan.is_default);
      if (defaultItems.length) {
        displaySnackMessages(
          t("inventorysmart.rclDefaultItemsNotDeleted", {
            count: defaultItems.length,
            itemLabel:
              defaultItems.length === 1
                ? t("inventorysmart.rclItemLabel")
                : t("inventorysmart.rclItemsLabel"),
          }),
          "warning",
          props
        );
      } else {
        displaySnackMessages(response?.data?.message, "success", props);
      }
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
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
    agGridInstance?.current?.api?.forEachNode((node) => {
      if (node?.level === 0)
        node.selected &&
          rowUpdate.push({
            rule_code: node.data?.rule_code,
            psa_code: node?.data?.psa_code,
            key: node?.data?.key,
          });
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
    return (
      <>
        {props.showNewConstraintFlow && (
          <Button
            id="create-new-rule-constraints-table"
            variant="primary"
            // will change to medium later
            size="large"
            onClick={props.onCreateNewRule}
            disabled={props.isUploadPending}
          >
            {t("inventorysmart.rclCreateNewRuleButton")}
          </Button>
        )}
        {(props.selectedPlan?.length > 0 || agGridInstance?.current?.api?.isSelectAllRecords)  && (
          <DeleteActionButton
            className={useStyles.delete}
            onClick={() => {
              if (checkDefaultRuleSelected()) {
                displaySnackMessages(
                    t("inventorysmart.rclSelectedRulesCannotDelete"),
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
        {props?.storeConstraintsConfigs?.revertToDefault && (
          <Button
            id="revert-to-default"
            variant="tertiary"
            size="large"
            onClick={() => {
              //Check if the selected rows contain any rules at default level. if any rule at default rule is present, display snackmessage else open the set all modal.
              if (checkDefaultRuleSelected()) {
                displaySnackMessages(
                  t("inventorysmart.rclSelectedRulesCannotEdit"),
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
            {t("inventorysmart.rclRevertToDefaultButton")}
          </Button>
        )}
        {props.selectedPlan?.length > 0 && (
          <Button
            id="set-all-exception"
            variant={"primary"}
            onClick={() => {
              //Check if the selected rows contain any rules at default level. if any rule at default rule is present, display snackmessage else open the set all modal.
              if (checkDefaultRuleSelected()) {
                displaySnackMessages(
                  t("inventorysmart.rclSelectedRulesCannotEdit"),
                  "info",
                  props
                );
              } else {
                props?.setAllModalVisibility(true);
              }
            }}
            disabled={isDisabled()}
          >
            {t("inventorysmart.rclSetAllButton")}
          </Button>
        )}
        {props?.applyButton}
      </>
    );
  };

  // const isCommentFeatureEnabled = Boolean(
  //   props?.inventorysmartScreenConfig?.inventory_smart_comment_and_thread
  //     ?.isCommentFeatureEnabled
  // );

  const isThreadFeatureEnabled = Boolean(
    props?.commentingConfig?.inventory_smart_comment_and_thread
      ?.isThreadFeatureEnabled
  );

  const handleMinDistributionSave = (params, newData) => {
    addDataToEditableState(
      props,
      params,
      newData,
      agGridInstance,
      filterDependencies,
      deSelectedRows
    );
  };

  return (
    <Grid>
      <SetAllModalComponent
        resetSelectedPlan={props?.setSelectedRulesList}
        showSetAllModal={props?.isSetAllModalVisible}
        setAllModalVisible={props?.setAllModalVisibility}
        filterDependencies={filterDependencies}
        savedSetAllModalData={props?.savedSetAllModalData}
        setAllModalData={props?.setAllModalData}
        saveSetAllModalData={saveSetAllModalData}
        selectedPlan={props?.selectedPlan}
        agGridInstance={agGridInstance}
        addSnack={props?.addSnack}
        filtersWithSearch={props.constraintRulesPayload}
        deSelectedRows={deSelectedRows}
        setDeselectedRows={setDeselectedRows}
        excludeDeselections={true} // this flag is required to add excluded_rows, is_all_records_selected keys in the save paylaod
        relativeWosMessage={[
          t("inventorysmart.rclRelativeWosMessage1"),
          t("inventorysmart.rclRelativeWosMessage2"),
        ]}
        disableRelativeWos={props?.isRelativeWOSdisabled || false}
        enableMinDistribution={enableSetAllMinDistribution}
      />
      <MinDistributionModal
        isModalOpen={minDistributionModalStatus}
        setIsModalOpen={setMinDistributionModalStatus}
        rowData={minDistributionRowData}
        filters={filterDependencies?.current?.filters}
        addDataToEditableState={addDataToEditableState}
        handleMinDistributionSave={handleMinDistributionSave}
        flow={"rules_constraint_list"}
      />
      <AgGridComponent
        customClass={actionColumnClasses.grid}
        uniqueRowId={"key"}
        rowModelType="serverSide"
        serverSideStoreType="partial"
        selectAllHeaderComponent={enableEdit()}
        columns={rulesConstraintListColumns}
        cacheBlockSize={props.pageSize || 10}
        disablePaginationForSinglePage={true}
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
        childKey={"data"}
        treeData={true}
        purgeClosedRowNodes={true}
        paginationPageSize={props.pageSize}
        showDownloadButton={true}
        onDownloadButtonClick={props?.downloadStoreConstraints}
        topRightOptions={renderTopRightOptions()}
        enableCellComment={false}
        tableName={"rules_constraint_table"}
        requestUrl={"/inventory-smart/constraint/rule/list"}
        appliedFilters={filterDependencies?.current?.filters}
        selectedRowsIDs={props.selectedPlan}
        isChatEnabled={isThreadFeatureEnabled}
        enableCellComment={false}
      />
    </Grid>
  );
};

RulesConstraintListTable.propTypes = {
  rulesConstraintColumnsFromParent: PropTypes.array,
  addSnack: PropTypes.any,
  history: PropTypes.shape({
    push: PropTypes.func,
  }),
  inventorysmartScreenConfig: PropTypes.shape({
    inventorysmart_constraints: PropTypes.shape({
      drillDown: PropTypes.shape({
        hidden: PropTypes.shape({
          indexOf: PropTypes.func,
        }),
        showSingleMergedRows: PropTypes.any,
      }),
    }),
  }),
  isSetAllModalVisible: PropTypes.any,
  rulesDataUpdatedState: PropTypes.any,
  savedSetAllModalData: PropTypes.any,
  selectedDependencyValue: PropTypes.any,
  selectedPlan: PropTypes.shape({
    length: PropTypes.number,
  }),
  setAllModalData: PropTypes.any,
  setAllModalVisibility: PropTypes.func,
  setRulesTableData: PropTypes.func,
  setRulesTableLoader: PropTypes.func,
  setSelectedRulesList: PropTypes.func,
  showNewConstraintFlow: PropTypes.bool,
  onCreateNewRule: PropTypes.func,
  isUploadPending: PropTypes.bool,
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
    storeConstraintsConfigs:
      inventorysmartReducer?.rulesConstraintsReducer?.storeConstraintsConfigs,
    isRelativeWOSdisabled:
      inventorysmartReducer?.inventorySmartConstraints?.constraintsConfigs
        ?.isRelativeWOSdisabled,
    commentingConfig: store?.tenantConfigReducer?.commentingConfig,
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
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RulesConstraintListTable);
