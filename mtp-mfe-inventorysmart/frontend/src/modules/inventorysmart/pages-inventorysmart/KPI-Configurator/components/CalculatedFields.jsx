import { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { showSnackMessage } from "core/Utils/utils";
import { fetchTableColumnData } from "core/commonComponents/coreComponentScreen/utils";
import { downloadItemRequest } from "../../../services-inventorysmart/common/inventory-smart-common-services";
import {
  getCalculatedFields,
  deleteDerivedField,
} from "../../../services-inventorysmart/KPI-Configurator/kpi-configurator-service";
import { KPI_CONFIG_DOWNLOAD } from "../../../constants-inventorysmart/apiConstants";
import {
  canEditKpiSubModule,
  getKpiEnvironment,
  getKpiEnvironmentMessage,
} from "../../../utils-inventorysmart/kpiConfigAccessControl";
import { getTopRightOptions } from "../utils/getTopRightOptions";
import { fetchFields } from "../utils/fetchKpiConfigData";
import { renderDataSourceBadge, renderFormatBadge, renderLimitedBadges } from "../utils/cellRenderers";
import OverflowTooltip from "core/Utils/agGrid/OverflowTooltip";
import CreateCalculatedField from "./CreateField.jsx";
import { Prompt, Panel } from "impact-ui-v3";
import {
  common,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import "../KPIConfigurator.css";

const CalculatedFields = (props) => {
  const globalClasses = globalStyles();
  const tableRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [calculatedFields, setCalculatedFields] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [showCalculatedFieldPanel, setShowCalculatedFieldPanel] = useState(false);
  const [editingCalculatedField, setEditingCalculatedField] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [itemsPanelOpen, setItemsPanelOpen] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const [panelTitle, setPanelTitle] = useState("");
  const [currentColumnName, setCurrentColumnName] = useState("");

  const currentEnvironment = getKpiEnvironment();
  const hasEditAccess = canEditKpiSubModule({
    inventorysmartModulesPermission: props.inventorysmartModulesPermission,
    inventorysmartScreenConfig: props.inventorysmartScreenConfig,
    subModuleName: INVENTORY_SUBMODULES_NAMES.INVENTORY_KPI_CALCULATED_FIELDS,
    environment: currentEnvironment,
  });

  // Handle showing all items in popup
  const handleShowAllItems = (items, columnName) => {
    setAllItems(items);
    setCurrentColumnName(columnName);
    setPanelTitle(columnName === "kpi_list" ? "All KPIs" : "All Data Sources");
    setItemsPanelOpen(true);
  };

  // Handle closing items panel
  const handleCloseItemsPanel = () => {
    setItemsPanelOpen(false);
    setAllItems([]);
    setPanelTitle("");
    setCurrentColumnName("");
  };

  // Fetch table columns from database
  const loadTableColumns = async () => {
    try {
      let columns = await fetchTableColumnData("kpi_config_calculated_fields");
      if (!columns || columns.length === 0) {
        showSnackMessage(props.addSnack, "Table configuration not found.", "warning");
        return;
      }
      columns = columns.map((col) => {
        if (col.column_name === "derived_from_sources") {
          // Create a closure to pass the callback to the cell renderer
          col.cellRenderer = (params) => {
            const modifiedParams = {
              ...params,
              api: {
                ...params.api,
                gridOptionsWrapper: {
                  ...params.api?.gridOptionsWrapper,
                  gridOptions: {
                    ...params.api?.gridOptionsWrapper?.gridOptions,
                    onShowAllItems: (items) => handleShowAllItems(items, "derived_from_sources"),
                  },
                },
              },
            };
            return renderLimitedBadges(modifiedParams);
          };
          col.cellClass = "cell-vertical-center-align";
        } else if (col.column_name === "field_type") {
          col.cellRenderer = renderFormatBadge;
        } else if (col.column_name === "kpi_list") {
          // Create a closure to pass the callback to the cell renderer
          col.cellRenderer = (params) => {
            const modifiedParams = {
              ...params,
              api: {
                ...params.api,
                gridOptionsWrapper: {
                  ...params.api?.gridOptionsWrapper,
                  gridOptions: {
                    ...params.api?.gridOptionsWrapper?.gridOptions,
                    onShowAllItems: (items) => handleShowAllItems(items, "kpi_list"),
                  },
                },
              },
            };
            return renderLimitedBadges(modifiedParams);
          };
          col.cellClass = "cell-vertical-center-align";
        } else {
          col.cellRenderer = OverflowTooltip;
        }
        return col;
      });
      setTableColumns(columns);
    } catch (error) {
      showSnackMessage(
        props.addSnack,
        error?.response?.data?.message || "Failed to load table columns",
        "error"
      );
    }
  };

  const fetchCalculatedFields = async () => {
    await fetchFields({
      setData: setCalculatedFields,
      setLoading,
      errorMessage: 'Calculated Fields',
      props,
    });
  };

  useEffect(() => {
    loadTableColumns();
    fetchCalculatedFields();

    const envMessage = getKpiEnvironmentMessage(currentEnvironment, {
      entityLabel: "Calculated fields",
    });
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

  const loadTableInstance = (params) => {
    tableRef.current = params;
  };

  // Handle Create New Calculated Field - Create flow 
  const handleCreateField = () => {
    setEditingCalculatedField(null);
    setShowCalculatedFieldPanel(true);
  };

  const handleCloseCalculatedField = (reload) => {
    setShowCalculatedFieldPanel(false);
    setEditingCalculatedField(null);
    if (reload) {
      fetchCalculatedFields();
    }
  };

  const handleEditSelected = () => {
    if (selectedRows?.[0]?.kpi_list?.length) {
      setShowPrompt("Edit");
    }
    else {
      handleEdit();
    }
  };

  const handleEdit = async () => {
    const selected = selectedRows?.[0] || null;
    if (!selected?.derived_field_id) {
      showSnackMessage(props.addSnack, "Please select a calculated field to edit", "warning");
      return;
    }

    setEditingCalculatedField(selected);
    setShowCalculatedFieldPanel(true);
  }

  //Open delete prompt
  const handleDeleteSelected = () => {
    if (selectedRows?.[0]?.kpi_list?.length) {
      setShowPrompt("Delete");
    }
    else {
      handleDelete();
    }
  };

  //Delete selected calculated field
  const handleDelete = async () => {
    try {
      setLoading(true);
      const deletedIds = selectedRows?.map((row) => row?.derived_field_id);
      
      const response = await props.deleteDerivedField(deletedIds);
      
      if (response?.data) {
        showSnackMessage(
          props.addSnack,
          response?.data?.data?.message || `Calculated field deleted successfully`,
          "success"
        );
        setSelectedRows([]);
        
        setCalculatedFields(prev => prev.filter(field => !deletedIds.includes(field.derived_field_id)));
      }
    } catch (error) {
      showSnackMessage(
        props.addSnack,
        error?.response?.data?.message || "Failed to delete field",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  const cancelPrompt = () => {
    setShowPrompt(null);
  }

  const handlePromptConfirm = () => {
    if(showPrompt === "Delete") {
      handleDelete();
    }
    else {
      handleEdit();
    }
    setShowPrompt(null);
  }

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
      showSnackMessage(props.addSnack, "Error while downloading", "error");
    }
  };

  const getTopRightOptionsForTable = () => {
    return getTopRightOptions({
      selectedRows,
      handleEditSelected,
      handleDeleteSelected,
      handleCreate: handleCreateField,
      createButtonLabel: "Create Calculated Field",
      isCalculated: true,
      canEdit: hasEditAccess
    });
  };

  // ==================== Render ====================
  return (
    <div className={globalClasses.padding}>
      <Loader loader={loading}>
        {tableColumns.length > 0 && (
          <AgGridComponent
            columns={tableColumns}
            rowdata={calculatedFields}
            pagination={true}
            paginationPageSize={10}
            uniqueRowId="derived_field_id"
            tableRef={tableRef}
            tableHeader="Calculated Fields"
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

      {/* Calculated Field Panel */}
      <CreateCalculatedField
        open={showCalculatedFieldPanel}
        onClose={handleCloseCalculatedField}
        editCalculatedField={editingCalculatedField}
      />

      <Prompt
        isOpen={showPrompt}
        title={`${showPrompt} Calculated Field`}
        children={
          <div>
            {showPrompt === "Delete" ? "Deleting" : "Editing"} {selectedRows?.length > 1 ? "these calculated fields" : "this calculated field"} will {showPrompt === "Delete" ? "inactivate" : "affect"} related KPI(s).
            Are you sure you want to continue?
          </div>
        }
        infoList={[]}
        primaryButtonLabel={common.__ConfirmBtnText}
        onPrimaryButtonClick={handlePromptConfirm}
        secondaryButtonLabel={common.__RejectBtnText}
        onSecondaryButtonClick={cancelPrompt}
      />

      <Panel
        title={panelTitle}
        size="medium"
        anchor="right"
        open={itemsPanelOpen}
        onClose={handleCloseItemsPanel}
        className="modules-panel"
      >
        <div className="modules-panel-content">
          {allItems.length > 0 ? (
            <div className="modules-list-container">
              {allItems.map((item, index) => {
                const shouldCapitalize = currentColumnName !== "kpi_list";
                const displayItem = shouldCapitalize && typeof item === "string" && item.length > 0
                  ? item.charAt(0).toUpperCase() + item.slice(1)
                  : item;
                return (
                  <div key={index} className="module-item">
                    {displayItem}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="modules-empty-state">No items available</div>
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
    getCalculatedFields: () => dispatch(getCalculatedFields()),
    deleteDerivedField: (kpiId) => dispatch(deleteDerivedField(kpiId)),
    downloadItemRequest: (screenName, body, includeExclusionFilter, excludeURLObject) =>
      dispatch(downloadItemRequest(screenName, body, includeExclusionFilter, excludeURLObject)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(CalculatedFields);
