import React, { useEffect, useState, useRef, useCallback } from "react";
import { connect } from "react-redux";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import AgGridComponent from "core/Utils/agGrid";
import SetAllPopUp from "../setAllPopUp";
import { Button } from "impact-ui-v3";
import {
  updateShipmentConstraints,
  resetConstraintsState,
  getShipmentConstraintsTableData,
  getShipmentConstraintsTableConfig,
} from "modules/oms/services-oms/Constraints/constraints-services";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, debounce, isEmpty, isNumber } from "lodash";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  filtersPayload,
  scrollIntoView,
} from "modules/oms/utils-oms/oms-utility";
import globalStyles from "core/Styles/globalStyles";
import {
  CONSTRAINTS_OMS_SHIPMENT_STATUS,
  OMS_CONSTRAINTS_SCREENNAME_KEY,
  OMS_SHIPMENT_CONSTRAINTS_SCREENNAME,
  OMS_SHIPMENT_CONSTRAINTS_FILTER_CONFIG_KEY,
} from "modules/oms/constants-oms/stringConstants";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { resetSelectedOmsFilters } from "modules/oms/services-oms/Constraints/constraints-services";
import { getValidCheckConfiguration } from "../utils";
import {
  getValidationConstants,
  validateShipmentConstraintsData,
  validateUserInputThreshold,
} from "../utils/validationUtils.js";

const ShipmentConstraints = (props) => {
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [updatedRows, setUpdatedRows] = useState({});
  const [showSetAll, setShowSetAll] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [defaultFilterDependency, setDefaultFilterDependency] = useState([]);
  const [isFiltersValid, updateIsFiltersValid] = useState(false);
  const [updateSetAllChanges, setUpdateSetAllChanges] = useState(false);
  const [applySetAllChanges, setApplySetAllChanges] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);
  const debouncedSaveRef = useRef(null);
  const saveFuncRef = useRef(null);
  const tableRef = useRef(null);
  const tableContainerRef = useRef();
  const globalClasses = globalStyles();
  const filterDependencyRef = useRef([]);
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(true);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);
  const [isUserHasEditAccess, setIsUserHasEditAccess] = useState(true);
  const [ishide, setIsHide] = useState(true);

  // Get validation constants from shared utils
  const validationConstants = getValidationConstants(
    CONSTRAINTS_OMS_SHIPMENT_STATUS
  );

  // user access for shipment constraints
  const constraintsAccess = props.userAccess?.find(
    (item) =>
      item.module === "shipment_constraints" &&
      item.screen === OMS_CONSTRAINTS_SCREENNAME_KEY
  );
  const canEdit = constraintsAccess?.isEditButton || false;
  const canSetAll = constraintsAccess?.isSetAllButton || false;

  const checkForEditability = (columns) => {
    // If userAccess exists, use canEdit flag; otherwise fall back to orderingAccessControl
    const shouldDisableEdit = !isEmpty(props?.userAccess)
      ? !canEdit
      : !props?.orderingAccessControl?.isEditButton?.isVisible;

    if (shouldDisableEdit) {
      columns.map((col) => {
        col.is_editable = false;
        if (col.type === "list") col.type = "str";
      });
    }
    return columns;
  };

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      // Use new userAccess flags
      setIsUserHasEditAccess(canEdit);
      setIsUserHasSetAllAccess(canSetAll);
      setIsUserHasViewOnlyAccess(false);
    } else if (props?.orderingAccessControl) {
      // Fall back to old access control
      setIsUserHasViewOnlyAccess(
        !props?.orderingAccessControl?.isEditButton?.isVisible
      );
      setIsUserHasEditAccess(true);
      setIsUserHasSetAllAccess(true);
    }
  }, [props?.userAccess, props?.orderingAccessControl, canEdit, canSetAll]);

  // Update styles when there are conflicts in the Minimum and Maximum Values
  const styleConfig = {
    rowStyles: [
      {
        styleFunction: (params) => {
          return (
            !Number(params.data?.min_replenishment_quantity) ||
            !Number(params.data?.max_replenishment_quantity) ||
            !Number(params.data?.order_multiple) ||
            Number(params.data?.min_replenishment_quantity) >
              Number(params.data?.max_replenishment_quantity)
          );
        },
        style: {
          backgroundColor: "#FFE2E2",
        },
        applyStylesFromFunction: false,
      },
    ],
  };

  /**
   * @function
   * @description Create payload and update backend with the update rows if all rows have valid data
   */
  const saveEdits = async () => {
    setIsLoading(true);

    // Enhanced validation using dynamic config
    const validationResults = Object.keys(updatedRows).map((rowId) => {
      const row = updatedRows[rowId];
      return validateShipmentConstraintsData(
        row,
        CONSTRAINTS_OMS_SHIPMENT_STATUS
      );
    });

    const invalidRows = validationResults.filter((result) => !result.isValid);
    if (invalidRows.length > 0) {
      setIsLoading(false);
      displaySnackMessages(invalidRows[0].message, "error");
      return;
    }

    try {
      const constraints = [];
      const rowUpdateIds = [];

      // Get number type columns for rounding
      let numberTypeColumns = [];
      CONSTRAINTS_OMS_SHIPMENT_STATUS.map((field) => {
        if (
          field.value_type === "number" ||
          field.value_type === "percentage"
        ) {
          numberTypeColumns.push(field.accessor);
        }
      });

      Object.keys(updatedRows).forEach((id) => {
        const requiredKeys = [
          "min_replenishment_quantity",
          "max_replenishment_quantity",
          "order_multiple",
          "moq_tolerance",
        ];
        const row = updatedRows[id];
        const constraintArr = [];

        requiredKeys.forEach((key) => {
          if (row[key] !== undefined) {
            let value = row[key];

            if (numberTypeColumns.includes(key)) {
              // Convert to number first (form inputs are strings)
              const numericValue = Number(value);
              if (isNaN(numericValue) || !isNumber(numericValue)) {
                displaySnackMessages(`Invalid value for ${key}`, "error");
                return;
              } else {
                value = Math.round(numericValue);
              }
            }

            // Special handling for moq_tolerance
            if (key === "moq_tolerance") {
              value = validateUserInputThreshold(
                row,
                CONSTRAINTS_OMS_SHIPMENT_STATUS,
                displaySnackMessages
              );
            }

            constraintArr.push({
              attribute_name: `${key}`,
              attribute_value: value,
            });
          }
        });

        // Always include id
        constraintArr.push({
          attribute_name: "id",
          attribute_value: row.shipment_id,
        });

        constraints.push(constraintArr);
        rowUpdateIds.push({
          id: updatedRows[id].shipment_id,
        });
      });
      const payload = {
        filters: filterDependency,
        constraint: constraints,
        row_update: rowUpdateIds,
        meta: {
          search: [],
          sort: [],
          range: [],
          limit: {
            limit: 10,
            page: 1,
          },
        },
      };
      const response = await props.updateShipmentConstraints(payload);
      if (response.data.status) {
        setUpdatedRows({});
        displaySnackMessages(
          response.data.message || "Constraints updated succesfully",
          "success"
        );
      }
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
    } finally {
      tableRef.current?.api?.refreshServerSideStore({ purge: true });
      setIsLoading(false);
      setUpdateSetAllChanges(false);
      setApplySetAllChanges(false);
      setIsHide(true);
    }
  };

  if (!debouncedSaveRef.current) {
    debouncedSaveRef.current = debounce(() => {
      saveFuncRef.current();
    }, 3000);
  }

  // Load Filters and Column Configurations
  useEffect(() => {
    loadFilters();
    fetchColumnConfig();

    return () => {
      props.resetConstraintsState([]);
    };
  }, []);

  useEffect(() => {
    isFiltersValid && refreshTableData();
  }, [filterDependency]);

  useEffect(() => {
    return () => {
      props.setFilterConfiguration({
        [OMS_SHIPMENT_CONSTRAINTS_FILTER_CONFIG_KEY]: undefined,
      });
      props.resetSelectedOmsFilters();
    };
  }, []);

  useEffect(() => {
    if (applySetAllChanges && updateSetAllChanges) {
      Boolean(Object.keys(updatedRows).length) && debouncedSaveRef.current();
      saveFuncRef.current = saveEdits;
    }
  }, [applySetAllChanges, updatedRows]);

  const loadTableInstance = (tableInstance) => {
    tableRef.current = tableInstance;
  };

  /**
   * @function
   * @description Load Column Configuration for Shipment Constraint table
   */
  const fetchColumnConfig = async () => {
    setIsLoading(true);
    try {
      const tableColumns = await props.getShipmentConstraintsTableConfig({});
      const columns = checkForEditability(tableColumns?.data?.data);
      const formattedColumns = agGridColumnFormatter(
        columns,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );
      setColumns(formattedColumns);
      scrollIntoView(tableContainerRef);
      setIsLoading(false);
    } catch (error) {
      props.addSnack({
        message: "Error fetching Table Config",
        options: {
          variant: "error",
        },
      });
      setIsLoading(false);
    }
  };

  /**
   * @function
   * @description Fetch all associated filters and their options
   */
  const loadFilters = async () => {
    setIsLoading(true);
    try {
      const response = await fetchFilterFieldValues(
        OMS_SHIPMENT_CONSTRAINTS_SCREENNAME,
        props.savedFilterSelection,
        props.screenName
      );
      if (isEmpty(props.filterDashboardConfiguration)) {
        let filterConfigData = [
          {
            filterDashboardData: response,
            isCrossDimensionFilter: false,
            screen_name: props.screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          OMS_SHIPMENT_CONSTRAINTS_FILTER_CONFIG_KEY,
          filterConfigData,
          OMS_SHIPMENT_CONSTRAINTS_SCREENNAME
        );
        props.setFilterConfiguration(filterConfig);
      }
    } catch (error) {
      displaySnackMessages("Error fetching filter Configuration");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * @function
   * @description Callback function to the table to fetch table date
   * @param {Object} manualbody
   * @param {Number} pageIndex
   * @param {Object} _params
   * @returns {Object} returns the table data with their total rows
   */
  const manualCallBack = async (manualbody, pageIndex, _params) => {
    if (manualbody?.sort?.length === 0) {
      manualbody.sort = [
        {
          column: "shipment_id",
          order: "asc",
        },
      ];
    }
    const selection = {
      data: getValidCheckConfiguration(
        tableRef?.current?.api?.checkConfiguration
      ),
      unique_columns: ["shipment_id"],
    };

    setIsLoading(true);
    try {
      let body = {
        filters: filterDependencyRef.current,
        meta: {
          ...manualbody,
          limit: { limit: 10, page: pageIndex + 1 },
        },
        selection,
      };
      let response = await props.getShipmentConstraintsTableData(body);
      setIsLoading(false);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          getValidCheckConfiguration(_params?.api?.checkConfiguration),
          "shipment_id"
        );
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(
          response.data.message || "Something went wrong",
          "error"
        );
        return {
          data: [],
          total: 0,
        };
      }
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
      setIsLoading(false);
      return {
        data: [],
        total: 0,
      };
    }
  };

  /**
   * @function
   * @description Handle Row Selections and update local state
   */
  const onSelectionChanged = (event) => {
    let currentSelectedRows = [];
    tableRef?.current.api.forEachNode((node) => {
      node.selected && currentSelectedRows.push({ ...node.data });
    });
    setSelectedRows(currentSelectedRows);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  /**
   * @function
   * @description On applying filters verify if the options selected are valid and update
   * local state with the updated dependency options and validity
   * @param {Object} dependencyData
   * @param {Object} filterData
   */
  const onFilterDashboardClick = (dependencyData, filterData) => {
    const payload = filtersPayload(filterData, dependencyData, true);
    updateIsFiltersValid(payload.isValid);
    if (payload.isValid) {
      filterDependencyRef.current = cloneDeep(payload.reqBody);
      setFilterDependency(payload.reqBody);
    }
  };

  /**
   * @function
   * @description Refetch table data and update table as new
   */
  const refreshTableData = () => {
    tableRef.current?.api?.setFilterModel(null);
    tableRef.current?.api?.refreshServerSideStore({ purge: true });
  };

  /**
   * @function
   * @description Handle data once cell value is change and record the changed value for the respective rowID
   * Also, return with processing if the older value is same as new
   * @param {Object} event
   */
  const onCellValueChanged = (event) => {
    const { data, colDef } = event;
    if (data && colDef) {
      setUpdatedRows((prev) => ({
        ...prev,
        [data.shipment_id]: {
          ...prev[data.shipment_id],
          ...data,
        },
      }));
    }
  };

  const onBlur = (_e, data, column) => {
    setIsHide(false);

    // Validation for moq_tolerance
    if (column.colId === "moq_tolerance") {
      let validatedMoqTolerance = validateUserInputThreshold(
        data,
        CONSTRAINTS_OMS_SHIPMENT_STATUS,
        displaySnackMessages
      );

      // Update the grid cell immediately
      tableRef.current?.api?.forEachNode((node) => {
        if (node.data.shipment_id === data.shipment_id) {
          if (node.data.moq_tolerance !== validatedMoqTolerance) {
            node.data.moq_tolerance = validatedMoqTolerance;
            // Update the updatedRows state
            setUpdatedRows((prev) => ({
              ...prev,
              [data.shipment_id]: {
                ...prev[data.shipment_id],
                ...data,
                moq_tolerance: validatedMoqTolerance,
              },
            }));
          }
        }
      });

      tableRef.current?.api?.refreshCells({
        force: true,
        suppressFlash: false,
        columns: [column.colId],
      });
    }
    // Validation for order_multiple
    else if (column.colId === "order_multiple") {
      let validatedOrderMultiple = data.order_multiple;
      let validationMessage = "";

      // Apply bounds validation
      if (
        !validatedOrderMultiple ||
        validatedOrderMultiple < validationConstants.ORDER_MULTIPLE_MIN_VALUE
      ) {
        validatedOrderMultiple = validationConstants.ORDER_MULTIPLE_MIN_VALUE;
        validationMessage =
          "Order multiple must be at least " +
          validationConstants.ORDER_MULTIPLE_MIN_VALUE;
      } else if (
        validatedOrderMultiple > validationConstants.ORDER_MULTIPLE_MAX_VALUE
      ) {
        validatedOrderMultiple = validationConstants.ORDER_MULTIPLE_MAX_VALUE;
        validationMessage =
          "Order multiple must be at most " +
          validationConstants.ORDER_MULTIPLE_MAX_VALUE;
      }

      // Show single message if there are validation issues
      if (validationMessage) {
        displaySnackMessages(validationMessage, "info");
      }

      // Update the grid cell immediately
      tableRef.current?.api?.forEachNode((node) => {
        if (node.data.shipment_id === data.shipment_id) {
          if (node.data.order_multiple !== validatedOrderMultiple) {
            node.data.order_multiple = validatedOrderMultiple;
            // Update the updatedRows state
            setUpdatedRows((prev) => ({
              ...prev,
              [data.shipment_id]: {
                ...prev[data.shipment_id],
                ...data,
                order_multiple: validatedOrderMultiple,
              },
            }));
          }
        }
      });

      tableRef.current?.api?.refreshCells({
        force: true,
        suppressFlash: false,
        columns: [column.colId],
      });
    }
    // Validation for min/max replenishment quantities
    else if (
      column.colId === "min_replenishment_quantity" ||
      column.colId === "max_replenishment_quantity"
    ) {
      let isInputValueValid = true;
      let validatedInputValue;
      let validationMessage = "";

      // Collect all validation issues and determine the final corrected value
      let correctedMin = data?.min_replenishment_quantity;
      let correctedMax = data?.max_replenishment_quantity;

      // Apply bounds validation first
      if (
        data?.min_replenishment_quantity < validationConstants.MIN_QTY_MIN_VALUE
      ) {
        correctedMin = validationConstants.MIN_QTY_MIN_VALUE;
        isInputValueValid = false;
        validationMessage =
          "Min quantity must be at least " +
          validationConstants.MIN_QTY_MIN_VALUE;
      } else if (
        data?.min_replenishment_quantity > validationConstants.MIN_QTY_MAX_VALUE
      ) {
        correctedMin = validationConstants.MIN_QTY_MAX_VALUE;
        isInputValueValid = false;
        validationMessage =
          "Min quantity must be at most " +
          validationConstants.MIN_QTY_MAX_VALUE;
      }

      if (
        data?.max_replenishment_quantity > validationConstants.MAX_QTY_MAX_VALUE
      ) {
        correctedMax = validationConstants.MAX_QTY_MAX_VALUE;
        isInputValueValid = false;
        validationMessage =
          "Max quantity must be at most " +
          validationConstants.MAX_QTY_MAX_VALUE;
      }

      // Then check min/max relationship with corrected values
      if (correctedMax < correctedMin) {
        isInputValueValid = false;

        if (column.colId === "max_replenishment_quantity") {
          validatedInputValue = correctedMin;
          validationMessage =
            "Max quantity must be at least equal to min quantity";
        } else {
          // For min quantity
          const newMin = Math.max(
            validationConstants.MIN_QTY_MIN_VALUE,
            correctedMax
          );
          validatedInputValue = newMin;
          validationMessage =
            "Min quantity must be less than or equal to max quantity";
        }
      } else {
        // If min/max relationship is valid, use the bounds-corrected value
        validatedInputValue =
          column.colId === "min_replenishment_quantity"
            ? correctedMin
            : correctedMax;
      }

      // Show single comprehensive message if there are validation issues
      if (!isInputValueValid && validationMessage) {
        displaySnackMessages(validationMessage, "info");
      }

      // Update the grid cell immediately
      if (!isInputValueValid) {
        tableRef.current?.api?.forEachNode((node) => {
          if (node.data.shipment_id === data.shipment_id) {
            node.data[column.colId] = validatedInputValue;
            // Update the updatedRows state
            setUpdatedRows((prev) => ({
              ...prev,
              [data.shipment_id]: {
                ...prev[data.shipment_id],
                ...data,
                [column.colId]: validatedInputValue,
              },
            }));
          }
        });

        tableRef.current?.api?.refreshCells({
          force: true,
          suppressFlash: false,
          columns: [column.colId],
        });
      }
    }
  };

  /**
   * @function
   * @description Apply the data to the table row with respected rowIDs
   * @param {Object} update
   */
  const updateSetAllData = async (update) => {
    const selection = {
      data: getValidCheckConfiguration(
        tableRef?.current?.api?.checkConfiguration
      ),
      unique_columns: ["shipment_id"],
    };

    const rowsToUpdate = [];
    try {
      const constraints = [];
      const rowUpdateIds = [];

      // Get number type columns for rounding
      let numberTypeColumns = [];
      CONSTRAINTS_OMS_SHIPMENT_STATUS.map((field) => {
        if (
          field.value_type === "number" ||
          field.value_type === "percentage"
        ) {
          numberTypeColumns.push(field.accessor);
        }
      });

      Object.keys(update).forEach((id) => {
        const constraintItems = [];

        // Process each field with proper rounding
        const fields = [
          {
            key: "min_replenishment_quantity",
            value: update[id].min_replenishment_quantity,
          },
          {
            key: "max_replenishment_quantity",
            value: update[id].max_replenishment_quantity,
          },
          { key: "order_multiple", value: update[id].order_multiple },
          { key: "moq_tolerance", value: update[id].moq_tolerance },
        ];

        fields.forEach((field) => {
          if (field.value !== undefined) {
            let value = field.value;

            // Round numeric fields
            if (numberTypeColumns.includes(field.key)) {
              // Convert to number first (form inputs are strings)
              const numericValue = Number(value);
              if (isNaN(numericValue) || !isNumber(numericValue)) {
                displaySnackMessages(`Invalid value for ${field.key}`, "error");
                return;
              } else {
                value = Math.round(numericValue);
              }
            }

            // Special handling for moq_tolerance
            if (field.key === "moq_tolerance") {
              value = validateUserInputThreshold(
                { moq_tolerance: value },
                CONSTRAINTS_OMS_SHIPMENT_STATUS,
                displaySnackMessages
              );
            }

            constraintItems.push({
              attribute_name: field.key,
              attribute_value: value,
            });
          }
        });

        // Always include id
        constraintItems.push({
          attribute_name: "id",
          attribute_value: update[id].id,
        });

        constraints.push(constraintItems);
        rowUpdateIds.push({
          id: update[id].id,
        });
      });

      const payload = {
        filters: filterDependency,
        constraint: constraints,
        row_update: tableRef?.current?.api?.isSelectAllRecords
          ? []
          : rowUpdateIds,
        meta: {
          search: [],
          sort: [],
          range: [],
          limit: {
            limit: 10,
            page: 1,
          },
        },
        selection,
        isSelectAllRecords: tableRef?.current?.api?.isSelectAllRecords,
      };
      const response = await props.updateShipmentConstraints(payload);
      if (response.data.status) {
        setUpdatedRows({});
        displaySnackMessages(
          response.data.message || "Constraints updated succesfully",
          "success"
        );
        tableRef.current?.api?.refreshServerSideStore({ purge: true });
        tableRef.current?.api?.deselectAll();
        setIsLoading(false);
        setUpdateSetAllChanges(false);
        setApplySetAllChanges(false);
        setSelectedRows([]);
      }
    } catch (error) {
      displaySnackMessages(
        error.response?.data?.message || "Something went wrong",
        "error"
      );
    }
  };

  const getTopRightOptions = () => {
    let options = [];

    // Determine if Set All should be disabled
    const isSetAllDisabled = !isEmpty(props?.userAccess)
      ? !isUserHasSetAllAccess || isLoading || !selectedRows.length
      : isUserHasViewOnlyAccess || isLoading || !selectedRows.length;

    // Determine if Update should be disabled
    const isUpdateDisabled = !isEmpty(props?.userAccess)
      ? !isUserHasEditAccess || isLoading || ishide
      : isUserHasViewOnlyAccess || isLoading || ishide;

    if (selectedRows?.length > 0) {
      options.push(
        <div>
          <Button
            variant="tertiary"
            color="primary"
            id="productSetAllBtn"
            onClick={() => setShowSetAll(true)}
            disabled={isSetAllDisabled}
          >
            Set All
          </Button>
        </div>
      );
    }

    options.push(
      <div>
        <Button
          variant="secondary"
          color="primary"
          id="productSetAllBtn"
          onClick={saveEdits}
          disabled={isUpdateDisabled}
        >
          Update
        </Button>
      </div>
    );

    return options;
  };

  return (
    <>
      <CoreComponentScreen
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        filterConfigKey={OMS_SHIPMENT_CONSTRAINTS_FILTER_CONFIG_KEY}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
      />
      {isFiltersValid && (
        <div ref={tableContainerRef}>
          <AgGridComponent
            columns={columns}
            selectAllHeaderComponent={true}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            loadTableInstance={loadTableInstance}
            onSelectionChanged={onSelectionChanged}
            onCellValueChanged={onCellValueChanged}
            onBlur={onBlur}
            pagination={true}
            cacheBlockSize={10}
            serverSideStoreType="partial"
            rowModelType="serverSide"
            uniqueRowId={"shipment_id"}
            rowSelection="multiple"
            onRowSelected
            styleConfig={styleConfig}
            tableHeader={`Details`}
            topRightOptions={getTopRightOptions()}
          />
        </div>
      )}
      {showSetAll && (
        <SetAllPopUp
          feildsData={CONSTRAINTS_OMS_SHIPMENT_STATUS}
          setShowSetAllModal={setShowSetAll}
          screenName={props.screenName}
          rowsData={selectedRows}
          setAll={updateSetAllData}
          setCheckAllSetAllRequest={setCheckAllSetAllRequest}
          agGridInstance={tableRef?.current}
          displaySnackMessages={displaySnackMessages}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    constraintsLoader:
      store.omsReducer.orderingConstraintsService.constraintsLoader,
    constraintsOmsFilterDependency:
      store.omsReducer.orderingConstraintsService
        .constraintsOmsFilterDependency,

    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        OMS_SHIPMENT_CONSTRAINTS_FILTER_CONFIG_KEY
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: store.filterReducer.savedFilterSelection,

    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  resetConstraintsState: (payload) => dispatch(resetConstraintsState(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  getShipmentConstraintsTableData: (payload) =>
    dispatch(getShipmentConstraintsTableData(payload)),
  getShipmentConstraintsTableConfig: () =>
    dispatch(getShipmentConstraintsTableConfig()),
  updateShipmentConstraints: (payload) =>
    dispatch(updateShipmentConstraints(payload)),
  resetSelectedOmsFilters: () => dispatch(resetSelectedOmsFilters()),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ShipmentConstraints);
