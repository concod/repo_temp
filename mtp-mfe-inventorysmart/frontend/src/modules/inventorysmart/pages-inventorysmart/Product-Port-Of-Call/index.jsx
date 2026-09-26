import { Button, Prompt as IaPrompt, Switch, useTranslation } from "impact-ui-v3";
import SetAllMultiRow from "core/Utils/agGrid/setall-multirow-form";
import ConfirmBox from "core/Utils/confirmPrompt/confirmPopup";
import { Prompt } from "react-router";
import globalStyles from "core/Styles/globalStyles";
import {
  dynamicLabelsBasedOnTenant,
} from "core/Utils/DynamicLabels";
import AgGridComponent from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import { isEmpty, isNull } from "lodash";
import moment from "moment";
import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import {
  getProductPortOfCallList,
  unmapSetAllProductPortOfCall,
  modifyProductPortOfCallTimePeriod,
  setAllProductPortOfCall,
} from "modules/inventorysmart/services-inventorysmart/Product-Port-Of-Call/product-port-of-call-service";
import {
  getColumnsAg,
  resetTableRecentChanges,
} from "core/actions/tableColumnActions";

import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { captializeStringIfCamelCase } from "core/Utils/formatter";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { useNavigate } from "react-router-dom-v5-compat";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH, IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";

function ProductPortOfCallScreen(props) {
  const { t } = useTranslation();
  const [showloader, setloader] = useState(true);
  const [totalRowsCount, setTotalRowsCount] = useState(0);
  const [productColumns, setProductColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [hasEditPermissions, setHasEditPermissions] = useState(false);
  
  
  // Multiple Status State for conflict resolution
  const [isMultipleStatus, setIsMultipleStatus] = useState(false);
  
  // Conflict Resolution State
  const [resolutionType, setResolutionType] = useState("hard_reset");
  
  // Unmap Confirmation Modal
  const [showUnmapModal, setShowUnmapModal] = useState(false);
  
  // Set All Modal State
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  
  // Track if data has been loaded after filter apply
  const [isFilterApplied, setIsFilterApplied] = useState(false);
  
  
  // Save functionality state (similar to Product Status)
  const [editedRows, setEditedRows] = useState({});
  const [flag_edit, setFlag_edit] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [confirmBox, showConfirmBox] = useState(false);
  const [onConfirmAction, setOnConfirmAction] = useState({ action: null });
  
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  const onFilterDependency = useRef(null);
  const tableInstance = useRef({});

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  // Track edited rows for save functionality
  const trackEditedRow = (rowData, field, newValue) => {
    const rowKey = `${rowData.article}_${rowData.store_code}_${rowData.port_code}`;
    setEditedRows((prev) => {
      const existingRow = prev[rowKey] || {
        article: rowData.article,
        store_code: rowData.store_code,
        port_code: rowData.port_code,
        status_from_date: rowData.status_from_date,
        status_to_date: rowData.status_to_date,
      };
      return {
        ...prev,
        [rowKey]: {
          ...existingRow,
          [field]: newValue,
        },
      };
    });
    setFlag_edit(true);
  };

  // Unsaved changes check
  const unsavedChangeCheck = (confirmAction) => {
    if (Object.keys(editedRows).length > 0) {
      setOnConfirmAction({ action: confirmAction });
      showConfirmBox(true);
      throw Error("Unsaved changes");
    }
  };

  // Handle confirm box action
  const handleConfirmBox = () => {
    tableInstance.current?.api?.refreshServerSideStore({ purge: false });
    tableInstance.current?.api?.deselectAll(true);
    onConfirmAction.action?.();
    setEditedRows({});
    setFlag_edit(false);
    showConfirmBox(false);
    setOnConfirmAction({ action: null });
  };



  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
        // For Product Port Of Call, make columns editable based on DB is_editable flag
        // regardless of user permissions (as requested)
        let permissionCheckToDisable = true; // Always true to allow editing
        
        // Fetch table columns from DB via API
        let cols = [];
        try {
          cols = await getColumnsAg("table_name=product_port_of_call")();
        } catch (error) {
          console.error("Error fetching columns for product_port_of_call:", error);
        }

        // Process columns for editability (similar to Product Status)
        cols = cols.map((item) => {
          // Check column_name variations for eligible column
          const colName = (item.column_name || "").toLowerCase();
          const fieldName = (item.field || "").toLowerCase();
          const labelName = (item.label || "").toLowerCase();
          const headerNameLower = (item.headerName || "").toLowerCase();
          
          const isEligibleColumn = 
            colName.includes("eligible") ||
            fieldName.includes("eligible") ||
            labelName === "eligible" ||
            headerNameLower === "eligible";
          
          // Set editable and disabled based on is_editable from DB and permissions
          if (item.is_editable && permissionCheckToDisable) {
            item.editable = true;
            item.disabled = false;
          } else {
            item.editable = false;
            item.disabled = true;
          }
          
          // Add cell renderer for date/datetime fields (Status From Date, Status To Date)
          // Always render CellRenderers for date fields - disabled prop controls editability
          if (item.type === "datetime" || item.type === "DateTimeField" || item.type === "date") {
            // Convert "date" type to "datetime" so CellRenderers can render the DatePicker
            item.type = "datetime";
            item.disablePast = false;
            // Set disabled based on is_editable and permissions
            item.disabled = !(item.is_editable && permissionCheckToDisable);
            // Add extra.dateFormat for proper date handling
            item.extra = { ...item.extra };
            item.cellRenderer = (params, extraProps) => {
              return (
                <CellRenderers
                  cellData={params}
                  column={item}
                  extraProps={extraProps}
                  actions={null}
                ></CellRenderers>
              );
            };
          }
          
          // Add toggle switch for eligible column
          if (isEligibleColumn) {
            // Set as list type for Set All popup to show dropdown
            item.type = "list";
            item.is_editable = permissionCheckToDisable;
            item.editable = permissionCheckToDisable;
            item.disabled = !permissionCheckToDisable;
            item.options = [
              { label: t("inventorysmart.map"), value: true, id: true },
              { label: t("inventorysmart.unmap"), value: false, id: false },
            ];
            // Use field or column_name as the data accessor
            const columnName = item.field || item.column_name;
            item.cellRenderer = (cellProps) => {
              // Try multiple possible field names for eligible value
              const eligibleValue = cellProps.data?.is_eligible ?? cellProps.data?.eligible ?? cellProps.data?.[columnName];
              // Render switch for boolean values or treat null/undefined as false
              const isChecked = eligibleValue === true;
              const handleToggleChange = (e) => {
                const newValue = e.target.checked;
                cellProps.node.setDataValue(columnName, newValue);
              };
              return (
                <Switch
                  value={isChecked}
                  checked={isChecked}
                  disabled={!permissionCheckToDisable}
                  onChange={handleToggleChange}
                  color="primary"
                />
              );
            };
          }
          
          return item;
        });

        
        
        // Fetch filter configuration
        const data = await fetchFilterFieldValues(
          "product-port of call",
          props.savedFilterSelection,
          props.screenName,
          [getActiveEntityFilter("product")]
        );
        
        if (isEmpty(props.filterDashboardConfiguration)) {
          let filterConfigData = [
            {
              filterDashboardData: data,
              isCrossDimensionFilter: false,
              screen_name: props.screenName,
            },
          ];
          if (sessionStorage.getItem("currentApp") === "inventorysmart") {
            filterConfigData[0]["saved_filter_screen_name"] =
              "product-port of call";
          }
          const filterConfig = formattedFilterConfiguration(
            "productPortOfCallFilterConfiguration",
            filterConfigData,
            "product_port_of_call"
          );
          props.setFilterConfiguration(filterConfig);
        }
        
        setProductColumns(cols);
        setloader(false);
        setHasEditPermissions(permissionCheckToDisable);
      } catch (error) {
        console.error("Error in getInitialData:", error);
        setloader(false);
      }
    };
    getInitialData();
  }, []);



  // Save button click handler (for in-table edits)
  const saveRequest = () => {
    if (Object.keys(editedRows).length > 0) {
      setShowSaveModal(true);
    } else {
      displaySnackMessages(t("inventorysmart.noChangeToSave"), "warning");
    }
  };

  // Save in-table edits using modifyProductPortOfCallTimePeriod API
  const onSaveConfirm = async () => {
    try {
      setloader(true);
      setShowSaveModal(false);

      // Format edited rows for API
      const body = Object.values(editedRows).map((row) => ({
        article: row.article,
        store_code: row.store_code,
        port_code: row.port_code,
        is_eligible: row.is_eligible,
        status_from_date: row.status_from_date ? moment(row.status_from_date).format("YYYY-MM-DD") : row.valid_from,
        status_to_date: row.status_to_date ? moment(row.status_to_date).format("YYYY-MM-DD") : row.valid_to,
      }));

      const payload = { body };

      const response = await modifyProductPortOfCallTimePeriod(payload)();
      const successMsg =
        response.data?.status || response.data?.show_message
          ? response.data?.message
          : t("inventorysmart.updatedSuccessfully");

      // Reset edit state
      setEditedRows({});
      setFlag_edit(false);
      tableInstance.current?.api?.deselectAll(true);
      tableInstance.current?.api?.refreshServerSideStore({ purge: false });
      displaySnackMessages(successMsg, "success");
    } catch (err) {
      const errMsg = !isEmpty(err.response?.data?.message)
        ? err.response.data.message
        : t("inventorysmart.failedToUpdateTimePeriod");
      displaySnackMessages(errMsg, "error");
    } finally {
      setloader(false);
    }
  };

  // Cancel button handler
  const handleCancel = () => {
    if (Object.keys(editedRows).length > 0) {
      try {
        unsavedChangeCheck(null);
      } catch (e) {
        // Unsaved changes modal will be shown
        return;
      }
    }
    tableInstance.current?.api?.deselectAll(true);
    displaySnackMessages(t("inventorysmart.noChangesAreMade"), "warning");
  };

  // Handle cell value change for in-table editing
  const onCellValueChanged = (params) => {
    const { colDef, newValue, oldValue, data } = params;
    
    // Check if value actually changed
    let isValueSame = false;
    if (moment.isMoment(newValue)) {
      isValueSame = moment(newValue).isSame(oldValue);
    } else {
      isValueSame = newValue === oldValue;
    }

    if (!isValueSame) {
      const fieldName = colDef.column_name || colDef.field;
      trackEditedRow(data, fieldName, newValue);
      
      // Flash the edited row
      tableInstance.current?.api?.flashCells({ rowNodes: [params.node] });
    }
  };

  // Handle Unmap Set All
  const handleUnmapSetAll = () => {
    if (selectedRows.length === 0) {
      displaySnackMessages(
        t("inventorysmart.selectAtLeastOneRowToUnmap"),
        "error"
      );
      return;
    }
    setShowUnmapModal(true);
  };

  const submitUnmapSetAll = async () => {
    setloader(true);
    setShowUnmapModal(false);

    try {
      const triples = selectedRows.map((row) => ({
        article: row.article,
        store_code: row.store_code,
        port_code: row.port_code,
      }));

      const payload = { triples };

      const response = await unmapSetAllProductPortOfCall(payload)();
      const successMsg =
        response.data?.message ||
        t("inventorysmart.unmappingCompletedSuccessfully");
      displaySnackMessages(successMsg, "success");
      refreshTable();
      tableInstance.current?.api?.deselectAll();
      setSelectedRows([]);
    } catch (err) {
      // Error handling removed - API returns success message
    } finally {
      setloader(false);
    }
  };

  // Refresh table data
  const refreshTable = () => {
    props.resetTableRecentChanges();
    // Don't clear filters when refreshing after Set All operation
    // tableInstance.current?.api?.setFilterModel(null);
    tableInstance.current?.api?.refreshServerSideStore({ purge: true });
  };

  // Set All form fields configuration
  const setAllFieldsList = React.useMemo(() => {
    return [
      {
        fields: [
          {
            label: t("inventorysmart.eligible"),
            accessor: "eligible",
            column_name: "eligible",
            type: "list",
            required: true,
            options: [
              { label: t("inventorysmart.map"), value: "map", id: "map" },
            ],
          },
          {
            label: t("inventorysmart.validFrom"),
            accessor: "valid_from",
            column_name: "start_date",
            type: "DateTimeField",
            required: true,
            disablePast: false,
          },
          {
            label: t("inventorysmart.validTo"),
            accessor: "valid_to",
            column_name: "end_date",
            type: "DateTimeField",
            required: true,
            disablePast: false,
          },
        ],
        addRowLabel: t("inventorysmart.addDateRange"),
        id: "port_of_call",
        rowCount: 0,
        hideRowLabel: true, // Hide "Add Row" since we only need one date range
      },
    ];
  }, []);

  // Handle Set All button click
  const handleSetAllClick = () => {
    if (selectedRows.length === 0) {
      displaySnackMessages(t("inventorysmart.selectAtLeastOneRow"), "error");
      return;
    }
    setShowSetAllModal(true);
  };

  // Format Set All data before submission
  const formatSetAllData = (formData, rowCount) => {
    // Extract eligible, valid_from and valid_to from form data
    // Form data keys are like: eligible_0, valid_from_0, valid_to_0
    let eligible = null;
    let validFrom = null;
    let validTo = null;

    for (let i = 0; i <= rowCount; i++) {
      const eligibleKey = `eligible_${i}`;
      const fromKey = `valid_from_${i}`;
      const toKey = `valid_to_${i}`;
      
      if (formData[eligibleKey] !== undefined && formData[eligibleKey] !== null) {
        eligible = formData[eligibleKey] === "map";
      }
      if (formData[fromKey]) {
        validFrom = moment(formData[fromKey]).format("YYYY-MM-DD");
      }
      if (formData[toKey]) {
        validTo = moment(formData[toKey]).format("YYYY-MM-DD");
      }
    }

    // Validate eligible field
    if (eligible === null || eligible === undefined) {
      displaySnackMessages(t("inventorysmart.selectEligibleOption"), "error");
      throw new Error("Missing eligible value");
    }

    // Validate dates
    if (!validFrom || !validTo) {
      displaySnackMessages(
        t("inventorysmart.enterValidFromAndToDates"),
        "error"
      );
      throw new Error("Missing dates");
    }

    if (moment(validFrom).isAfter(moment(validTo))) {
      displaySnackMessages(
        t("inventorysmart.validFromCannotBeGreaterThanValidTo"),
        "error"
      );
      throw new Error("Invalid date range");
    }

    return {
      eligible: eligible,
      valid_from: validFrom,
      valid_to: validTo,
    };
  };

  // Submit Set All changes
  const setAllChanges = async (formattedData) => {
    try {
      setloader(true);
      setShowSetAllModal(false);

      // Build triples from selected rows
      const triples = selectedRows.map((row) => ({
        article: row.article,
        store_code: row.store_code,
        port_code: row.port_code,
      }));

      // Build payload matching the API structure
      const payload = {
        triples: triples,
        eligible: formattedData.eligible,
        status_from_date: formattedData.valid_from,
        status_to_date: formattedData.valid_to,
      };

      const response = await setAllProductPortOfCall(payload)();
      const successMsg =
        response.data?.message ||
        t("inventorysmart.setAllCompletedSuccessfully");

      displaySnackMessages(successMsg, "success");

      // Reset state and refresh table
      tableInstance.current?.api?.deselectAll();
      setSelectedRows([]);
      refreshTable();
    } catch (err) {
      displaySnackMessages(errMsg, "error");
    } finally {
      setloader(false);
    }
  };

  // Manual callback for server-side pagination
  const productPortOfCallManualCallBack = async (manualbody, pageIndex, params) => {
    if (isNull(onFilterDependency.current)) {
      return {
        data: [],
        totalCount: 0,
      };
    }
    setloader(true);
    
    const body = {
      filters: onFilterDependency.current,
      selection: {},
      meta: {
        search: manualbody.search || [],
        sort: manualbody.sort || [],
        range: manualbody.range || [],
        limit: { 
          page: pageIndex + 1, 
          limit: props.pageSize || 20 
        },
      },
    };

    try {
      const response = await getProductPortOfCallList(body)();
      const rawData = response.data?.data || [];
      const data = rawData.map((row) => ({
        ...row,
        _row_id: `${row.article}_${row.store_code}_${row.port_code}`,
      }));
      const total = response.data?.total || 0;
      
      setTotalRowsCount(isNaN(Number(total)) ? 0 : total);
      setloader(false);
      
      return {
        data: data,
        totalCount: total,
      };
    } catch (err) {
      setloader(false);
      displaySnackMessages(
        err.response?.data?.message || t("inventorysmart.failedToFetchData"),
        "error"
      );
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  // Handle filter apply
  const onFilterDashboardClick = (dependencyData) => {
    onFilterDependency.current = dependencyData;
    setIsFilterApplied(true);
    refreshTable();
  };

  // Handle row selection
  const onSelectionChanged = (event) => {
    const rows = event.api?.getSelectedRows() || [];
    setSelectedRows(rows);
  };


  // Display snack messages
  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  // Get table header
  const getTableHeader = () => {
    return `Filtered ${captializeStringIfCamelCase(
      dynamicLabelsBasedOnTenant("product", "core")
    )} - ${t("inventorysmart.portOfCallMapping")}`;
  };

  // Get top right table options - Add, Set All, Unmap Set All, Cancel, and Save buttons
  const getTopRightTableOptions = () => {
    const options = [];

    // Set All button - only show when rows are selected
    if (selectedRows.length > 0) {
      options.push(
        <Button
          key="setAllBtn"
          size="large"
          variant="tertiary"
          onClick={handleSetAllClick}
        >
          {t("inventorysmart.setAll")}
        </Button>
      );
    }

    // Unmap Set All button - only show when rows are selected
    if (selectedRows.length > 0) {
      options.push(
        <Button
          key="unmapBtn"
          size="large"
          variant="tertiary"
          onClick={handleUnmapSetAll}
        >
          {t("inventorysmart.unmapSetAll")}
        </Button>
      );
    }

    // Cancel button - show when there are edits
    if (hasEditPermissions) {
      options.push(
        <Button key="cancelBtn" variant="secondary" onClick={handleCancel}>
          {t("inventorysmart.cancel")}
        </Button>
      );

      // Save button - for in-table edits
      options.push(
        <Button key="saveBtn" variant="primary" onClick={saveRequest}>
          {t("inventorysmart.save")}
        </Button>
      );
    }

    return options;
  };

  const renderContent = () => {
    return (
      <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
        <CoreComponentScreen
          IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
          showPageRoute={props.hideBreadCrumbs ? false : true}
          showPageHeader={false}
          routeOptions={[
            {
              label: `${captializeStringIfCamelCase(
                dynamicLabelsBasedOnTenant("product", "core")
              )} Port of Call`,
              id: 1,
              action: () => {
                navigate("/product-port-of-call");
              },
            },
          ]}
          showFilterDashboard={true}
          filterConfigKey={"productPortOfCallFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          contained={true}
          screenName={"product-port of call"}
          autoHideFilterButton={true}
        >
          <Loader loader={showloader}>
            <div data-testid="filterContainer">
              <Prompt when={flag_edit} message={""} />
              
              {/* Save Confirmation Modal */}
              <IaPrompt
                isOpen={showSaveModal}
                title={t("inventorysmart.confirmChanges")}
                onPrimaryButtonClick={onSaveConfirm}
                onSecondaryButtonClick={() => setShowSaveModal(false)}
                primaryButtonLabel={t("inventorysmart.update")}
                secondaryButtonLabel={t("inventorysmart.close")}
                handleClose={() => setShowSaveModal(false)}
                variant="info"
              >
                {t("inventorysmart.areYouSureToSaveAllChanges")}
              </IaPrompt>

              {/* Unsaved Changes Confirmation */}
              {confirmBox && (
                <ConfirmBox
                  onClose={() => {
                    showConfirmBox(false);
                  }}
                  onConfirm={() => handleConfirmBox()}
                />
              )}

              {/* Unmap Confirmation Modal */}
              <IaPrompt
                isOpen={showUnmapModal}
                title={t("inventorysmart.confirmUnmap")}
                onPrimaryButtonClick={submitUnmapSetAll}
                onSecondaryButtonClick={() => setShowUnmapModal(false)}
                primaryButtonLabel={t("inventorysmart.unmap")}
                secondaryButtonLabel={t("inventorysmart.cancel")}
                handleClose={() => setShowUnmapModal(false)}
                variant="warning"
              >
                <p>
                  {t("inventorysmart.areYouSureToUnmapPorts", {
                    count: selectedRows.length,
                  })}
                </p>
              </IaPrompt>

              {/* Set All Modal */}
              {showSetAllModal && (
                <SetAllMultiRow
                  updateDefaultValue={false}
                  setDefaultDateFieldValues={true}
                  onApply={setAllChanges}
                  fieldList={setAllFieldsList}
                  handleModalClose={() => setShowSetAllModal(false)}
                  formatMultiRowData={formatSetAllData}
                  isMultipleStatus={false}
                  size="large"
                  layout="vertical"
                  alignFields="end"
                />
              )}

              {productColumns.length > 0 && (
                <div>
                  <AgGridComponent
                    columns={productColumns}
                    selectAllHeaderComponent={hasEditPermissions}
                    onSelectionChanged={onSelectionChanged}
                    onGridChanged
                    manualCallBack={(body, pageIndex, params) =>
                      productPortOfCallManualCallBack(body, pageIndex, params)
                    }
                    rowModelType="serverSide"
                    serverSideStoreType="partial"
                    cacheBlockSize={props.pageSize || 10}
                    paginationPageSize={props.pageSize || 10}
                    uniqueRowId={"_row_id"}
                    hideChildSelection={true}
                    loadTableInstance={setNewTableInstance}
                    showSetAll={false}
                    purgeClosedRowNodes={true}
                    suppressAggFuncInHeader={true}
                    rowSelection={"multiple"}
                    suppressClickEdit={true}
                    onCellValueChanged={onCellValueChanged}
                    onRowSelected
                    suppressColumnVirtualisation={true}
                    tableName={"product_port_of_call"}
                    topRightOptions={getTopRightTableOptions()}
                    tableHeader={getTableHeader()}
                    appliedFilters={onFilterDependency.current}
                    selectedRowsIDs={selectedRows}
                    noRowsOverlayComponent={() => (
                      <div style={{ padding: "20px", textAlign: "center" }}>
                        <p>{t("inventorysmart.noDataAvailableForFilters")}</p>
                      </div>
                    )}
                    noRowsOverlayComponentParams={{
                      message: t("inventorysmart.noDataAvailableForFilters"),
                    }}
                  />
                </div>
              )}
            </div>
          </Loader>
        </CoreComponentScreen>
      </div>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
}

const mapDispatchToProps = {
  addSnack,
  getTenantConfigApplicationLevel,
  setFilterConfiguration,
  resetTableRecentChanges,
};

const mapStateToProps = (state) => {
  return {
    selectedFilters: state.filterReducer.selectedFilters["product-port of call"],
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "productPortOfCallFilterConfiguration"
      ],
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    pageSize: state.inventorysmartReducer?.inventorySmartCommonService?.inventorysmartScreenConfig?.inventorysmart_page_count,
    inventorysmartScreenConfig:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ProductPortOfCallScreen);
