import { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { showSnackMessage } from "core/Utils/utils";
import { fetchTableColumnData } from "core/commonComponents/coreComponentScreen/utils";
import { downloadItemRequest } from "../../../services-inventorysmart/common/inventory-smart-common-services";
import {
  getKpiConfigList,
  updateKpiConfig,
  duplicateKpiConfig,
  deleteKpiConfig,
} from "../../../services-inventorysmart/KPI-Configurator/kpi-configurator-service";
import {
  canEditKpiSubModule,
  getKpiEnvironment,
  getKpiEnvironmentMessage,
} from "../../../utils-inventorysmart/kpiConfigAccessControl";
import { INVENTORY_SUBMODULES_NAMES } from "../../../constants-inventorysmart/stringConstants";
import { KPI_CONFIG_DOWNLOAD } from "../../../constants-inventorysmart/apiConstants";
import { getTopRightOptions } from "../utils/getTopRightOptions";
import { fetchKpiConfigData } from "../utils/fetchKpiConfigData";
import { renderDataSourceBadge, renderModulesBadges, getColorForValue } from "../utils/cellRenderers";
import OverflowTooltip from "core/Utils/agGrid/OverflowTooltip";
import { CREATE_KPI, EDIT_KPI } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { Panel } from "impact-ui-v3";
import "../KPIConfigurator.css";

const CustomKPIs = (props) => {
  const globalClasses = globalStyles();
  const history = useHistory();
  const tableRef = useRef(null);  
  const [loading, setLoading] = useState(false);
  const [customKPIs, setCustomKPIs] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [modulesPanelOpen, setModulesPanelOpen] = useState(false);
  const [allModules, setAllModules] = useState([]);

  const currentEnvironment = getKpiEnvironment();
  const hasEditAccess = canEditKpiSubModule({
    inventorysmartModulesPermission: props.inventorysmartModulesPermission,
    inventorysmartScreenConfig: props.inventorysmartScreenConfig,
    subModuleName: INVENTORY_SUBMODULES_NAMES.INVENTORY_KPI_CUSTOM_KPIS,
    environment: currentEnvironment,
  });

  // Handle showing all modules in popup
  const handleShowAllModules = (modules) => {
    setAllModules(modules);
    setModulesPanelOpen(true);
  };

  // Handle closing modules panel
  const handleCloseModulesPanel = () => {
    setModulesPanelOpen(false);
    setAllModules([]);
  };

  // Fetch table columns from database
  const loadTableColumns = async () => {
    try {
      let columns = await fetchTableColumnData("kpi_config_custom_kpis");
      if (!columns || columns.length === 0) {
        showSnackMessage(props.addSnack, "Table configuration not found.", "warning");
        return;
      }
      
      // Map column configurations and add custom renderers
      columns = columns.map((col) => {
        if (!col.extra) {
          col.extra = {};
        }
        const minWidth = 150;
        col.minWidth = minWidth;
        // Render data_sources column as a badge
        if (col.column_name === "data_sources") {
          col.cellRenderer = renderDataSourceBadge;
        } else if (col.column_name === "modules") {
          // Create a closure to pass the callback to the cell renderer
          col.cellRenderer = (params) => {
            // Create a modified params object with the callback in gridOptions
            const modifiedParams = {
              ...params,
              api: {
                ...params.api,
                gridOptionsWrapper: {
                  ...params.api?.gridOptionsWrapper,
                  gridOptions: {
                    ...params.api?.gridOptionsWrapper?.gridOptions,
                    onShowAllModules: handleShowAllModules,
                  },
                },
              },
            };
            return renderModulesBadges(modifiedParams);
          };
          col.cellClass = "cell-vertical-center-align";
        } else if (col.column_name === "formula") {
          col.cellRenderer = OverflowTooltip;
        } else if (col.column_name === "kpi_name") {
          col.cellRenderer = OverflowTooltip;
        }
        return col;
      });
      
      setTableColumns(columns);
    } catch (error) {
      console.error("Error fetching table columns:", error);
      showSnackMessage(
        props.addSnack,
        error?.response?.data?.message || "Failed to load table columns",
        "error"
      );
    }
  };


  const fetchCustomKPIs = async () => {
    await fetchKpiConfigData({
      setData: setCustomKPIs,
      setLoading,
      errorMessage: 'Custom KPIs',
      props,
    });
  };

  useEffect(() => {
    loadTableColumns();
    fetchCustomKPIs();

    const envMessage = getKpiEnvironmentMessage(currentEnvironment);
    if (envMessage) {
      showSnackMessage(props.addSnack, envMessage.message, envMessage.variant);
    }
  }, [currentEnvironment]);

  // Handle row selection change
  const onSelectionChanged = (event) => {
    const selectedNodes = event?.api?.getSelectedNodes?.() || [];
    const selectedData = selectedNodes?.map((node) => node?.data) || [];
    setSelectedRows(selectedData);
  };

  // Load table instance for API access
  const loadTableInstance = (params) => {
    tableRef.current = params;
  };

  // Handle Create New KPI - Create flow removed
  const handleCreateKPI = () => {
    history.push(CREATE_KPI);
  };

  const handleEditSelected = (kpi_id) => {
    history.push(`${EDIT_KPI}/${kpi_id}`);
  };

  const handleUpdateKPI = async (kpiId, updatedData) => {
    if (!hasEditAccess) {
      showSnackMessage(
        props.addSnack,
        `KPI configuration is read-only in ${currentEnvironment} environment. Changes must be made in UAT and approved before syncing to Production.`,
        "error"
      );
      return;
    }

    try {
      setLoading(true); 
      const response = await props.updateKpiConfig(kpiId, updatedData);
      if (response?.data) {
        showSnackMessage(props.addSnack, "KPI updated successfully", "success");
        await fetchCustomKPIs();
      }
    } catch (error) {
      console.error("Error updating KPI:", error);
      showSnackMessage(
        props.addSnack,
        error?.response?.data?.message || "Failed to update KPI",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateSelected = async () => {
    if (!hasEditAccess) {
      showSnackMessage(
        props.addSnack,
        `KPI configuration is read-only in ${currentEnvironment} environment. Changes must be made in UAT and approved before syncing to Production.`,
        "error"
      );
      return;
    }

    try {
      setLoading(true);
      const kpiId = selectedRows[0]?.kpi_id;
      const response = await props.duplicateKpiConfig(kpiId);
      if (response?.data) {
        showSnackMessage(
          props.addSnack,
          "KPI duplicated successfully",
          "success"
        );
        setSelectedRows([]);
        await fetchCustomKPIs();
      }
    } catch (error) {
      console.error("Error duplicating KPI:", error);
      showSnackMessage(
        props.addSnack,
        error?.response?.data?.message || "Failed to duplicate KPI",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!hasEditAccess) {
      showSnackMessage(
        props.addSnack,
        `KPI configuration is read-only in ${currentEnvironment} environment. Changes must be made in UAT and approved before syncing to Production.`,
        "error"
      );
      return;
    }

    try {
      setLoading(true);
      const kpiIds = selectedRows?.map((kpi) => kpi?.kpi_id).filter(Boolean);
      const response = await props.deleteKpiConfig(kpiIds);
      if (response?.data) {
        showSnackMessage(
          props.addSnack,
          `Successfully deleted ${selectedRows?.length} KPI(s)`,
          "success"
        );
        setSelectedRows([]);
        await fetchCustomKPIs();
      }
    } catch (error) {
      console.error("Error deleting KPIs:", error);
      showSnackMessage(
        props.addSnack,
        error?.response?.data?.message || "Failed to delete KPI(s)",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle download button click
  const handleDownload = async () => {
    try {
      await props.downloadItemRequest(
        KPI_CONFIG_DOWNLOAD,
        {},
        false,
        null
      );
      showSnackMessage(
        props.addSnack,
        "Download Request is running in background. You will get a notification once it is ready to download",
        "info"
      );
    } catch (error) {
      console.error("Error downloading data:", error);
      showSnackMessage(props.addSnack, "Error while downloading", "error");
    }
  };

  const getTopRightOptionsForTable = () => {
    const options = getTopRightOptions({
      selectedRows,
      handleEditSelected,
      handleDuplicateSelected,
      handleDeleteSelected,
      handleCreate: handleCreateKPI,
      createButtonLabel: "Create KPI",
      isCalculated: false,
      canEdit: hasEditAccess,
    });

    return options;
  };

  return (
    <div className={globalClasses.padding}>
      <Loader loader={loading}>
        {tableColumns.length > 0 && (
          <AgGridComponent
            columns={tableColumns}
            rowdata={customKPIs}
            pagination={true}
            paginationPageSize={10}
            uniqueRowId="kpi_id"
            tableRef={tableRef}
            tableHeader="Custom KPIs"
            topRightOptions={getTopRightOptionsForTable()}
            cardContainer={false}
            rowSelection="multiple"
            selectAllHeaderComponent={true}
            hideSelectAllRecords={false}
            onSelectionChanged={onSelectionChanged}
            loadTableInstance={loadTableInstance}
            suppressRowClickSelection={false}
            onDownloadButtonClick={handleDownload}
            noRowOverlayMessage="No data applicable for selected filters"
          />
        )}
      </Loader>
      <Panel
        title="All modules"
        size="medium"
        anchor="right"
        open={modulesPanelOpen}
        onClose={handleCloseModulesPanel}
        className="modules-panel"
      >
        <div className="modules-panel-content">
          {allModules.length > 0 ? (
            <div className="modules-list-container">
              {allModules.map((module, index) => (
                <div key={index} className="module-item">
                  {module}
                </div>
              ))}
            </div>
          ) : (
            <div className="modules-empty-state">No modules available</div>
          )}
        </div>
      </Panel>
    </div>
  );
};

// ==================== Redux ====================
const mapStateToProps = (store) => ({
  inventorysmartModulesPermission:
    store.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartModulesPermission,
  inventorysmartScreenConfig:
    store.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartScreenConfig,
});

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    getKpiConfigList: () => dispatch(getKpiConfigList()),
    updateKpiConfig: (kpiId, data) => dispatch(updateKpiConfig(kpiId, data)),
    duplicateKpiConfig: (kpiId) => dispatch(duplicateKpiConfig(kpiId)),
    deleteKpiConfig: (kpiId) => dispatch(deleteKpiConfig(kpiId)),
    downloadItemRequest: (screenName, body, includeExclusionFilter, excludeURLObject) =>
      dispatch(downloadItemRequest(screenName, body, includeExclusionFilter, excludeURLObject)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(CustomKPIs);
