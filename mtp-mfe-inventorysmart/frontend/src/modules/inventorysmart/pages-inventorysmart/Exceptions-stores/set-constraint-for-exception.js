import PropTypes from "prop-types";
import React, { useState, useRef, useEffect } from "react";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import { getColumnsAg } from "core/actions/tableColumnActions";
import {
  createExceptionConstraints,
  deleteExceptionsFromTable,
  getProductStoreListData,
  saveEditedConstraints,
  saveSetAllDataConstraints,
  saveSetAllModalData,
  setAllModalData,
  setAllModalVisibility,
  setExceptionConstraintsTableData,
  setExceptionTableLoader,
  setExceptionsCreatedTableName,
  setSelectedExceptionConstraintsList,
  saveExceptionRuleName,
} from "modules/inventorysmart/services-inventorysmart/Exception-Constriants/exception-constraint-services";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  displaySnackMessages,
  isActionAllowedOnSubModule,
} from "../inventorysmart-utility";
import { cloneDeep, isEmpty, isNull, isUndefined } from "lodash";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import { addSnack } from "core/actions/snackbarActions";
import {
  addUniqueKeyToSubrows,
  checkRedundantDate,
  childNewRowData,
  flattenJSON,
  getSizeBasedonRowHeight,
  sortChildRowsByStartDate,
  validateForNullValues,
} from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { setDynamicRenderer } from "modules/inventorysmart/pages-inventorysmart/Product-Mapping/components/common-functions";
import AddActionButton from "modules/inventorysmart/components/ui-actions/AddActionButton";
import SetAllModalComponent from "../Common/components/Set-All-Modal-Component";
import {
  collectConstraintGridSelection,
  getExceptionStoreParentRowFields,
  isParentRowByLevel,
} from "../Common/components/constraintSelectionUtils";
import moment from "moment";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { handleErrorMessage } from "../Constraints/Rules-Constraints/add-rcl-component";
import { Button, Tooltip } from "impact-ui-v3";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { formattedDate } from "core/Utils/formatter";
import {
  applyActionColumnLayout,
  renderParentDash,
  renderReadOnlyConstraintValue,
  wrapColumnsWithEmptyCell,
  formatActionColumn,
  useConstraintsActionColumnStyles,
  isConstraintChildRow,
} from "../Constraints/landing-screen/constraintsCommonUtils";
import NewMinDistributionModal from "../Constraints/create-new-rule-flow/min-distribution/NewMinDistributionModal";
import {
  formatMinDistributionDisplayValue,
  buildMinDistributionAttributeValue,
} from "../Constraints/create-new-rule-flow/createNewRuleConstraintsUtils";
import { transformMinDistribution } from "../Constraints/Rule-Group-Constraints/ruleGroupUtils";
import UpViewIcon from "assets/up_view.svg";
import { hasNestedStyleSizeMinDistribution } from "../Constraints/create-new-rule-flow/createNewRuleConstraintsUtils";
import { useStyles as useInventorySmartStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";

const tenantDateFormat = localStorage.getItem("tenantDateFormat");

const SetConstraints = (props) => {
  const isOMSConstraintsFlow =
    sessionStorage.getItem("isOMSConstraintsFlow") === "true";
  const isNewConstraintsFlow =
    Boolean(props.showNewConstraintFlow) ||
    Boolean(props.isRedirectionFromCreateRclEnabled);
  const actionColumnClasses = useConstraintsActionColumnStyles();
  const agGridInstance = useRef(null);
  const [storeListColumns, setStoreListColumns] = useState([]);
  const [minDistributionModalStatus, setMinDistributionModalStatus] =
    useState(false);
  const [minDistributionRowData, setMinDistributionRowData] = useState(null);
  const [table_name, setExceptionConstraintsTableName] = useState(null);
  const [
    filtersOfExceptionConstraints,
    setFiltersOfExceptionConstraints,
  ] = useState({});
  const [deSelectedRows, setDeselectedRows] = useState([]);
  const [selectedParentAndChildRows, setSelectedParentAndChildRows] = useState([]);
  const inventorySmartClasses = useInventorySmartStyles();

  const isColumnEditable = (column, isOMSConstraintsFlow, isEditEnabled) => {
    if (isOMSConstraintsFlow) {
      return column?.is_editable && isEditEnabled;
    }
    return isEditEnabled;
  };

  const editableChildColumns = props?.exceptionConfigs?.editableChildRowInNewExceptionFlow || [
    "wos",
    "min_stock",
    "max_stock",
    "start_date",
    "end_date",
  ];

  useEffect(() => {
    const onLoad = async () => {
      localStorage.removeItem("exceptionTableName");
      let storeConstraintColDef = await getColumnsAg(
        "table_name=exception_stores_table"
      )();
      let isEditEnabled = props?.enableEdit;
      storeConstraintColDef.map((data) => {
        if (data?.column_name === "rule_code") {
          data.rowGroup = true;
        }
        if (
          !props?.constraintsConfigs?.showSingleMergedRows
        ) {
          data.is_editable = data?.is_editable && isEditEnabled;
          data?.sub_headers?.map((subData) => {
            subData.is_editable = subData.is_editable && isEditEnabled;
            //for the new RCL flow, we need to make these columns editable on child level only 
            if (props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled && (
              editableChildColumns.indexOf(subData.column_name) > -1 ||
              subData.extra?.isEditableConstraint
            )) {
              const isDateColumn = ["start_date", "end_date"].includes(subData.column_name);
              const renderValue = (cellProps) => (
                <div>
                  {isDateColumn
                    ? formattedDate(cellProps?.value, subData?.extra?.dateFormat)
                    : cellProps?.value || ""}
                </div>
              );
              subData.cellRenderer = (cellProps, extraProps) => {
                if (cellProps.node.level === 0) {
                  return renderParentDash(subData);
                }
                return isEditEnabled
                  ? setDynamicRenderer(cellProps, extraProps, subData)
                  : renderValue(cellProps);
              };
            }
            return subData;
          });
          if (data?.column_name === "rule_code") {
            data.cellRenderer = "agGroupCellRenderer";
          }
          if (data?.column_name === "exception_rule_name") {
            const isColumnEditEnabled = isColumnEditable(
              data,
              isOMSConstraintsFlow,
              isEditEnabled
            );
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
            data.cellRenderer = (cellProps, extraProps) => {
              // New RCL flow only: parent rows show "-" (same as RuleGroupExceptionsTable).
              if (
                props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled &&
                cellProps.node.level === 0
              ) {
                return renderParentDash(data);
              }
              return isEditEnabled ? (
                setDynamicRenderer(cellProps, extraProps, data)
              ) : (
                <div>{cellProps?.value || ""}</div>
              );
            };
          }
        }
        if (data?.column_name === "end_date") {
          data.disablePast = true;
        }
        if (isNewConstraintsFlow && data?.column_name === "min_distribution") {
          data.is_aggregated = false;
          data.type = "link";
          data.width = 470;
          data.minWidth = 470;
          data.extra = { ...data.extra, width: 470 };
          data.valueGetter = (params) =>
            formatMinDistributionDisplayValue(params?.data);
          data.cellRenderer = (cellProps, extraProps) => {
            if (!isConstraintChildRow(cellProps)) {
              return renderParentDash(data);
            }
            const displayValue = formatMinDistributionDisplayValue(
              cellProps?.data
            );
            const nextCellProps = { ...cellProps, value: displayValue };
            const hasDetails = hasNestedStyleSizeMinDistribution(
              cellProps?.data
            );
            if (isEditEnabled) {
              return (
                <div className={inventorySmartClasses.minDistributionCell}>
                  <div
                    className={inventorySmartClasses.minDistributionCellContent}
                  >
                    <CellRenderers
                      cellData={nextCellProps}
                      column={data}
                      extraProps={extraProps}
                    />
                  </div>
                  {hasDetails && (
                    <span
                      role="button"
                      onClick={() =>
                        minDistributionHandlersRef?.current?.openModal?.(
                          cellProps
                        )
                      }
                      className={inventorySmartClasses.minDistributionIconBtn}
                      aria-label="View style and size details"
                    >
                      <UpViewIcon
                        className={inventorySmartClasses.minDistributionIcon}
                      />
                    </span>
                  )}
                </div>
              );
            }
            return renderReadOnlyConstraintValue(nextCellProps, data);
          };
          data.onClick = (tableInfo) => {
            setMinDistributionRowData(tableInfo.cellData);
            setMinDistributionModalStatus(true);
          };
        }
        if (data?.column_name === "action") {
          applyActionColumnLayout(data);
          return (data.cellRenderer = (params, extraProps) => {
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
                    size={getSizeBasedonRowHeight(params)}
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
                      params?.node?.data?.data?.length > 4 ||
                      params?.node?.data?.is_default
                    }
                  />
                </div>
              );
            }
          });
        }
        // data.is_searchable = false;
        // data.floatingFilter = false;
        // data.filter = false;
        // data.sub_headers?.map((subHeader) => {
        //   Object.assign(subHeader, {
        //     ...subHeader,
        //     is_searchable: false,
        //     floatingFilter: false,
        //     filter: false,
        //   });
        // });
        return data;
      });
      if (props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled) {
        wrapColumnsWithEmptyCell(storeConstraintColDef);
        storeConstraintColDef = formatActionColumn(storeConstraintColDef);
      }
      setStoreListColumns(storeConstraintColDef);
      let body = {
        meta: {
          ...props?.filterDependencies?.meta,
          search: [
            ...props?.filterDependencies?.meta.search,
            ...props?.filterDependenciesOfStore?.meta.search,
          ],
        },
        rule_codes: props?.selectedProductList?.isSelectAllRecords
          ? []
          : props?.selectedProductList,
        store_codes: props?.selectedStoreList?.isSelectAllRecords
          ? []
          : props?.selectedStoreList,
        filters:
          isUndefined(props?.filterDependencies?.filters) ||
          isUndefined(props?.filterDependenciesOfStore?.filters)
            ? []
            : [
                // merge both step 1 and step 2 filters
                ...props?.filterDependencies?.filters,
                ...props?.filterDependenciesOfStore?.filters,
              ],
      };
      try {
        props?.setExceptionTableLoader(true);
        props?.setSelectedExceptionConstraintsList([]);
        let response = await getProductStoreListData(body);
        // call api on getting the table name
        if (response?.data?.data?.table_name) {
          setExceptionConstraintsTableName(response?.data?.data?.table_name);
          localStorage.setItem(
            "exceptionTableName",
            response?.data?.data?.table_name
          );
          agGridInstance?.current?.api?.refreshServerSideStore({ purge: true });
        }
      } catch (error) {
        props?.setExceptionTableLoader(false);
        handleErrorMessage(error, props);
        return {
          data: [],
          totalCount: 0,
        };
      }
    };
    onLoad();
  }, []);

  const fetchTableDataForExceptionsConstraints = async (
    manualbody,
    pageIndex,
    params
  ) => {
    if (!isNull(localStorage.getItem("exceptionTableName")))
      try {
        props?.setExceptionTableLoader(true);
        let tempCreationBody = {
          meta: {
            ...manualbody,
            limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
          },
          filters:
            isUndefined(props?.filterDependencies?.filters) ||
            isUndefined(props?.filterDependenciesOfStore?.filters)
              ? []
              : [
                  // merge both step 1 and step 2 filters
                  ...props?.filterDependencies?.filters,
                  ...props?.filterDependenciesOfStore?.filters,
                ],
          table_name: localStorage.getItem("exceptionTableName"),
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
        setFiltersOfExceptionConstraints(tempCreationBody);
        let responseFromCreation = await createExceptionConstraints(
          tempCreationBody
        );
        setDeselectedRows([]);
        props?.setExceptionTableLoader(false);
        if (responseFromCreation?.data?.show_message) {
          displaySnackMessages(
            responseFromCreation?.data?.message,
            "success",
            props
          );
        }
        if (!responseFromCreation.data?.data?.length) {
          return {
            data: [],
            totalCount: 0,
          };
        }
        // Sort child rows by start_date for each parent row
        let sortedResponseData = responseFromCreation.data.data.map(row => ({
          ...row,
          data: row.data ? sortChildRowsByStartDate(row.data) : row.data
        }));
        if (isNewConstraintsFlow) {
          sortedResponseData = transformMinDistribution(sortedResponseData, {
            isNewConstraintsFlow: true,
          });
        }
        
        let result = props?.constraintsConfigs?.showSingleMergedRows
          ? cloneDeep(flattenJSON(sortedResponseData))
          : addUniqueKeyToSubrows(cloneDeep(sortedResponseData));
        props?.setExceptionsConstraintsTableData(
          sortedResponseData
        );
        props.setExceptionsCreatedTableName(table_name);
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
          totalCount: responseFromCreation.total,
        };
      } catch (error) {
        props?.setExceptionTableLoader(false);
        handleErrorMessage(error, props);
        return {
          data: [],
          totalCount: 0,
        };
      }
  };

  const onSelectionChanged = (event) => {
    const { selectedRows, deSelections, nestedSelection } =
      collectConstraintGridSelection({
        api: agGridInstance?.current?.api,
        event,
        isParentRow: isParentRowByLevel,
        getParentRowFields: getExceptionStoreParentRowFields,
        deselectionFields: ["rule_code", "store_code"],
      });

    props?.setSelectedExceptionConstraintsList(selectedRows);
    setDeselectedRows(deSelections);
    setSelectedParentAndChildRows(nestedSelection);
  };

  const loadTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const saveConstraints = (params) => {
    if (params?.colDef?.id === "exception_rule_name") {
      return;
    }
    let { oldValue, newValue, data } = params;
    if (oldValue !== newValue && !isNull(newValue) && newValue !== "") {
      let tempDateValidation = false;
      params?.node?.setDataValue(params?.colDef?.id, newValue);
      const parentNode = params.node.parent;
      if (parentNode && parentNode.data) {
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
        } else addDataToEditableState(params, data);
      } else {
        addDataToEditableState(params, data);
      }
    } else if (isNull(newValue) || newValue === "") {
      displaySnackMessages(
        `Cannot have null values in ${params?.colDef?.label}`,
        "error",
        props
      );
      return params?.node?.setDataValue(params?.colDef?.id, 0);
    }
  };

  const onDelete = async () => {
    if (selectedParentAndChildRows?.length > 0) {
      const sharedFilters = props?.filterDependencies?.filters || [];
      const sharedMeta = props?.productFilterDependency?.meta
        ? props?.productFilterDependency?.meta
        : {
            ...tableConfigurationMetaData.meta,
            limit: { limit: props.pageSize || 10, page: 1 },
          };

      const parentsWithConstraints = selectedParentAndChildRows.filter(
        (parent) => parent?.constraint?.length > 0
      );
      const parentsWithoutConstraints = selectedParentAndChildRows.filter(
        (parent) => !(parent?.constraint?.length > 0)
      );
      const rowsToDelete = parentsWithoutConstraints;

      props?.setExceptionTableLoader(true);
      try {
        if (rowsToDelete.length > 0) {
          const payloadToDelete = {
            filters: sharedFilters,
            meta: sharedMeta,
            row_delete: rowsToDelete,
            table_name: localStorage.getItem("exceptionTableName"),
          };
          const deleteResponse = await deleteExceptionsFromTable(payloadToDelete);
          if (deleteResponse?.data?.show_message || deleteResponse?.status) {
            displaySnackMessages(
              deleteResponse?.data?.message,
              "success",
              props
            );
          }
        }
        if (parentsWithConstraints.length > 0) {
          const updatesPayload = {
            filters: sharedFilters,
            updates: parentsWithConstraints,
            meta: sharedMeta,
            table_name: localStorage.getItem("exceptionTableName"),
          };
          const setAllResponse = await saveSetAllDataConstraints(
            updatesPayload,
            false
          );
          if (setAllResponse?.data?.show_message || setAllResponse?.status) {
            displaySnackMessages(
              setAllResponse?.data?.message,
              "success",
              props
            );
          }
        }
        agGridInstance.current.api.refreshServerSideStore({ purge: true });
      } catch (error) {
        handleErrorMessage(error, props);
      } finally {
        props?.setExceptionTableLoader(false);
        props?.setSelectedExceptionConstraintsList([]);
        setDeselectedRows([]);
        setSelectedParentAndChildRows([]);
        agGridInstance?.current?.api?.deselectAll();
      }
      return;
    }

    try {
      let response = await deleteExceptionsFromTable({
        table_name: localStorage.getItem("exceptionTableName"),
        row_delete: props?.selectedPlan,
        meta: props?.productFilterDependency?.meta
          ? props?.productFilterDependency?.meta
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: props.pageSize || 10, page: 1 },
            },
      });
      props?.setSelectedExceptionConstraintsList([]);
      agGridInstance.current.api.refreshServerSideStore({ purge: true });
      agGridInstance?.current?.api?.deselectAll();
      displaySnackMessages(response?.data?.message, "success", props);
    } catch (error) {
      handleErrorMessage(error, props);
    } finally {
      setDeselectedRows([]);
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
    addDataToEditableState(params,updated_data);
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
      nextChild
    );
  };

  const addDataToEditableState = (params, data) => {
    let clonedConstraintsData = cloneDeep(props?.savedEditedConstraints);
    let editableColumns = agGridInstance?.current?.api.columnModel
      .getAllGridColumns()
      ?.filter(
        (col) =>
          col?.colId !== "exception_rule_name" &&
          (col?.colDef?.is_editable ||
            (isNewConstraintsFlow && col?.colId === "min_distribution"))
      );
    const resolveExceptionAttributeValue = (row, attri) => {
      if (attri?.colDef?.type === "datetime") {
        return moment(row?.[attri?.colId]).format("YYYY-MM-DD");
      }
      if (isNewConstraintsFlow && attri?.colId === "min_distribution") {
        return buildMinDistributionAttributeValue(row);
      }
      return row?.[attri?.colId];
    };
    let exceptions = [];
    if (
      props?.inventorysmartScreenConfig?.inventorysmart_constraints?.drillDown
        ?.showSingleMergedRows
    ) {
      editableColumns?.forEach((attri) => {
        if (attri?.colId !== "x_units_per_size") {
          exceptions.push({
            attribute_name: attri?.colId,
            attribute_value: resolveExceptionAttributeValue(data, attri),
          });
        }
      });
    } else {
      let toLoopThroughConstraints = params?.node?.parent?.data?.data
        ? params?.node?.parent?.data?.data
        : params?.data?.data;
      exceptions = toLoopThroughConstraints?.map((subRows) => {
        let constraintsWithSubrow = [];
        editableColumns?.map((attri) => {
          if (attri?.colId !== "x_units_per_size") {
            constraintsWithSubrow.push({
              attribute_name: attri?.colId,
              attribute_value: resolveExceptionAttributeValue(subRows, attri),
            });
          }
        });
        return constraintsWithSubrow;
      });
    }
    let payload = {
      constraint: [...exceptions],
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
      table_name: localStorage.getItem("exceptionTableName"),
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
    let payloadIndex = clonedConstraintsData?.findIndex(
      (savedExceptions) =>
        savedExceptions?.row_update?.[0]?.key === data?.uniqueParentKey
    );
    if (payloadIndex > -1) {
      clonedConstraintsData[payloadIndex] = {
        ...clonedConstraintsData[payloadIndex],
        ...payload,
      };
    } else {
      clonedConstraintsData.push(payload);
    }
    props?.saveEditedConstraints([...clonedConstraintsData]);
  };

  const saveRuleNameOnBlur = async (
    params,
    row,
    column,
    isChanged,
    value,
    initialValue
  ) => {
    if (
      column.colId === "exception_rule_name" &&
      isChanged &&
      value !== initialValue
    ) {
      let payload = {
        exception_rule_name: params?.target?.value,
        rule_code: row?.rule_code,
        store_code: row?.store_code,
        table_name: localStorage.getItem("exceptionTableName"),
      };
      props.setExceptionTableLoader(true);
      try {
        let response = await saveExceptionRuleName(payload);
        if (response?.data?.message)
          displaySnackMessages(response?.data?.message, "success", props);
        agGridInstance.current.api.refreshServerSideStore({ purge: true });
      } catch (error) {
        handleErrorMessage(error, props);
      } finally {
        props.setExceptionTableLoader(false);
      }
    }
  };

  return (
    <div>
      <Loader loader={props.exceptionLoader} minHeight={"500px"}>
        <SetAllModalComponent
          showSetAllModal={props?.isSetAllModalVisible}
          setAllModalVisible={props?.setAllModalVisibility}
          filterDependencies={props?.filterDependencies}
          savedSetAllModalData={props?.savedSetAllModalData}
          setAllModalData={props?.setAllModalData}
          saveSetAllModalData={saveSetAllDataConstraints}
          selectedPlan={props?.selectedPlan}
          selectedParentAndChildRows={selectedParentAndChildRows}
          useTableName={true}
          localstoreKeyTableName="exceptionTableName"
          tableName={props?.exceptionsCreatedTableName}
          agGridInstance={agGridInstance}
          resetSelectedPlan={props?.setSelectedExceptionConstraintsList}
          filtersWithSearch={filtersOfExceptionConstraints}
          flow="exceptions"
          excludeDeselections={true}
          deSelectedRows={deSelectedRows}
          setDeselectedRows={setDeselectedRows}
          relativeWosMessage={[
            "In Relative change, values will be added to/subtracted from current WOS.",
          ]}
          disableRelativeWos={props?.constrantsConfigs?.isRelativeWOSdisabled || false}
          showExceptionRuleName={true}
        />
        {isNewConstraintsFlow && (
          <NewMinDistributionModal
            isModalOpen={minDistributionModalStatus}
            setIsModalOpen={setMinDistributionModalStatus}
            rowData={minDistributionRowData}
            handleMinDistributionSave={handleMinDistributionSave}
            filters={[
              ...(props?.filterDependencies?.filters || []),
              ...(props?.filterDependenciesOfStore?.filters || []),
            ]}
            flow="exceptions"
          />
        )}
        {!isNull(table_name) && <AgGridComponent
          customClass={actionColumnClasses.grid}
          loadTableInstance={loadTableInstance}
          manualCallBack={(body, pageIndex, params) =>
            fetchTableDataForExceptionsConstraints(body, pageIndex, params)
          }
          rowModelType="serverSide"
          serverSideStoreType="partial"
          uniqueRowId={"key"}
          columns={storeListColumns}
          selectAllHeaderComponent={props?.enableEdit}
          enableChildRowSelection={props.showNewConstraintFlow}
          syncChildAndParentSelection={props.showNewConstraintFlow}
          onSelectionChanged={(event) => onSelectionChanged(event)}
          onCellValueChanged={(params) => {
            saveConstraints(params);
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
          cacheBlockSize={props.pageSize || 10}
          paginationPageSize={props.pageSize}
          skipAutoSizeColumn={true}
          groupDisplayType={"custom"}
          suppressAggFuncInHeader={true}
          childKey={"data"}
          treeData={true}
          purgeClosedRowNodes={true}
          hideChildSelection={true}
          disablePaginationForSinglePage={true}
          tableHeader={
            props.showNewConstraintFlow
              ? "Set Exception Constraints"
              : undefined
          }
          topRightOptions={
            <>
              {!props?.exceptionConfigs?.isRedirectionFromCreateRclEnabled &&
                props?.enableEdit &&
                !props?.isDataSaved &&
                (props?.selectedPlan?.length > 0 ||
                  agGridInstance?.current?.api?.isSelectAllRecords) && (
                  <DeleteActionButton
                    onClick={() => onDelete()}
                    disabled={!props?.enableEdit}
                  />
                )}
              {props?.selectedPlan?.length > 0 && <Button
                id="set-all-exception"
                variant="primary"
                onClick={() => props?.setAllModalVisibility(true)}
                disabled={
                  props?.isDataSaved ||
                  !props?.enableEdit ||
                  isUndefined(props?.selectedPlan) ||
                  props?.selectedPlan?.length === 0
                }
              >
                Set All
              </Button>}
            </>
          }
        />}
      </Loader>
    </div>
  );
};

SetConstraints.propTypes = {
  exceptionLoader: PropTypes.any,
  exceptionsCreatedTableName: PropTypes.any,
  filterDependencies: PropTypes.shape({
    current: PropTypes.shape({
      filters: PropTypes.any,
    }),
  }),
  isSetAllModalVisible: PropTypes.any,
  saveEditedConstraints: PropTypes.func,
  savedSetAllModalData: PropTypes.any,
  selectedExceptionConstraintsList: PropTypes.shape({
    length: PropTypes.number,
  }),
  selectedPlan: PropTypes.shape({
    length: PropTypes.number,
  }),
  selectedProductList: PropTypes.any,
  selectedStoreList: PropTypes.any,
  setAllModalData: PropTypes.any,
  setAllModalVisibility: PropTypes.func,
  setExceptionTableLoader: PropTypes.func,
  setExceptionsConstraintsTableData: PropTypes.func,
  setExceptionsCreatedTableName: PropTypes.func,
  setSelectedExceptionConstraintsList: PropTypes.func,
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDependencies:
      inventorysmartReducer.exceptionConstraintsReducer
        .filtersOfExceptionProdStores,
    filterDependenciesOfStore:
      inventorysmartReducer.exceptionConstraintsReducer
        .filtersOfExceptionStoreList,
    exceptionLoader:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionLoader,
    selectedStoreList:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.selectedStoreList,
    selectedProductList:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.selectedProductList,
    selectedPlan:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.selectedExceptionConstraintsList,
    isSetAllModalVisible:
      inventorysmartReducer?.exceptionConstraintsReducer?.isSetAllModalVisible,
    savedSetAllModalData:
      inventorysmartReducer?.exceptionConstraintsReducer
        ?.exceptionSetAllModalData,
    savedEditedConstraints:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState
        ?.savedEditedConstraints,
    exceptionTabState:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionTabState,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    constraintsConfigs:
      inventorysmartReducer.inventorySmartConstraints?.constraintsConfigs,
    exceptionConfigs:
      inventorysmartReducer?.exceptionConstraintsReducer?.exceptionConfigs,
    showNewConstraintFlow:
      inventorysmartReducer?.inventorySmartConstraints?.showNewConstraintFlow,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (body) => dispatch(addSnack(body)),
    setExceptionTableLoader: (body) => dispatch(setExceptionTableLoader(body)),
    setExceptionsConstraintsTableData: (body) =>
      dispatch(setExceptionConstraintsTableData(body)),
    setAllModalVisibility: (body) => dispatch(setAllModalVisibility(body)),
    setAllModalData: (data) => dispatch(setAllModalData(data)),
    setSelectedExceptionConstraintsList: (data) =>
      dispatch(setSelectedExceptionConstraintsList(data)),
    saveEditedConstraints: (body) => dispatch(saveEditedConstraints(body)),
    setExceptionsCreatedTableName: (body) =>
      dispatch(setExceptionsCreatedTableName(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(SetConstraints);
