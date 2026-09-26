import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Prompt, Button, Badge, useTranslation } from "impact-ui-v3";
import DownloadIcon from "@mui/icons-material/Download";
import { cloneDeep, isEmpty } from "lodash";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  NEW_REMODEL_STORE,
  REMODEL_STORE_RELEASE_FLOW,
  REMODEL_STORE_APPROVAL_FLOW,
} from "../../constants-inventorysmart/routesConstants";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  CONFIGUTAIONS_CACHE,
  REMODEL_STORE_APPROVE_VALIDATION_MSG,
  REMODEL_STORE_RELEASE_VALIDATION_MSG,
  NEW_STORE_DELETE_VALIDATION_MSG,
  REMODEL_STORE_EDIT_VALIDATION_MSG,
  REMODEL_STORE_APPROVE_PERMISSION_MSG,
  NO_TABLE_DATA_MSG,
  REMODEL_STORE_HYPERLINK_VALIDATION,
} from "../../constants-inventorysmart/stringConstants";
import {
  deleteRemodelStore,
  editRemodelStore,
  fetchRemodelStoreDashboardList,
  setEditRemodelStoreData,
  setRemodelStoreDashboardLoader,
  setRemodelStoreModuleConfig,
  fetchRemodelStoreReserveList,
  fetchReservedInventoryList,
  saveEditFlowData,
} from "../../services-inventorysmart/Remodel-Store/remodel-store-dashboard";
import { isActionAllowedOnSubModule } from "../inventorysmart-utility";
import { getModuleBasedTenantConfig } from "../../services-inventorysmart/common/inventory-smart-common-services";
import { setKeyValueInCache } from "../../services-inventorysmart/active-module-common-service";
import Form from "../../../../core/Utils/form";
import makeStyles from "@mui/styles/makeStyles";
import { downloadReservedInventoryList } from "modules/inventorysmart/services-inventorysmart/Remodel-Store/remodel-store-dashboard";
import { color } from "highcharts";

const useStyles = makeStyles((theme) => ({
  formWrapper: {
    width: "12rem",
  },
  divider: {
    backgroundColor: theme.palette.colours.disabledBadge,
    width: theme.typography.pxToRem(1),
    height: "1.25rem",
  },
  reservedTableFormContainer: {
    columnGap: "1.25rem",
  },
  inputLabel: {
    paddingBottom: 0,
  },
  gridItem: {
    alignContent: "center",
  },
  horizontalForm: {
    "& .top-orientation": {
      flexDirection: "row !important",
      alignItems: "center !important",
    },
    "& .ia-select-label-v3": {
      whiteSpace: "nowrap",
    },
  },
}));

const RemodelStoreSetupComponent = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [detailsTableColumnConfig, setDetailsTableColumnConfig] = useState([]);
  const [detailsTableRowData, setDetailsTableRowData] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInstance, setDeleteInstance] = useState("");
  const [remodelStoreLoader, setRemodelStoreLoader] = useState(false);
  const [remodelStoreDetailsLoader, setRemodelStoreDetailsLoader] = useState(
    false
  );
  const [reservedInvData, setReservedInvData] = useState([]);
  const [remodelStoreInvData, setRemodelStoreInvData] = useState([]);
  const [reservedInvCols, setReservedInvCols] = useState([]);
  const [remodelStoreCols, setRemodelStoreCols] = useState([]);
  const [mountReservedInvTable, setMountReservedInvTable] = useState(false);
  const [
    mountRemodelStoresDetailsTable,
    setMountRemodelStoresDetailsTable,
  ] = useState(false);
  const globalClasses = globalStyles();
  const reservedTableTableInstance = useRef({});
  const remodelStoreDashboardTableInstance = useRef({});
  const permissionsRef = useRef([]);
  const classes = useStyles();
  const storeCodeRef = useRef({});

  const formFields = props?.remodelStoreConfig?.formFields || [];
  const viewByRef = useRef(formFields?.[0]?.value?.value);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
    props.setRemodelStoreDashboardLoader(false);
  };

  useEffect(() => {
    const fetchModuleConfigs = async () => {
      try {
        props.setRemodelStoreDashboardLoader(true);
        let reqBody = {
          module_name: "New Remodel Store",
          screen_name: "Inventorysmart Configurations Remodel Store",
        };
        let response = await props.getModuleBasedTenantConfig(reqBody);
        props.setRemodelStoreModuleConfig(response);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    fetchModuleConfigs();
  }, []);

  const navigateToAddRemodelStore = (id) => {
    navigate(NEW_REMODEL_STORE, { state: id, props: props });
  };

  const enableApprove = () => {
    let enableApproveVal = canTakeActionOnModules(
      permissionsRef.current,
      INVENTORY_SUBMODULES_NAMES.INVENTORY_REMODEL_STORE_SETUP,
      "approve"
    );
    return enableApproveVal;
  };

  const goToApprovalFlow = (data) => {
    let permissionToApprove = enableApprove();
    if (!permissionToApprove)
      displaySnackMessages(REMODEL_STORE_APPROVE_PERMISSION_MSG, "warning");
    else if (!data.editable)
      displaySnackMessages(REMODEL_STORE_APPROVE_VALIDATION_MSG, "warning");
    else {
      if (data?.approval_bool === true) {
        navigate(REMODEL_STORE_APPROVAL_FLOW, { state: data });
      } else {
        displaySnackMessages(REMODEL_STORE_APPROVE_VALIDATION_MSG, "warning");
      }
    }
  };
  const releaseFlow = (data) => {
    if (data?.release_bool === true) {
      navigate(REMODEL_STORE_RELEASE_FLOW, { state: data });
    } else
      displaySnackMessages(REMODEL_STORE_RELEASE_VALIDATION_MSG, "warning");
  };

  const viewRemodelStoresDetails = async (data) => {
    setMountRemodelStoresDetailsTable(true);
    try {
      setRemodelStoreDetailsLoader(true);
      let cols = [];
      cols = await getColumnsAg("table_name=remodelled_store_details")();
      let colActions = agGridColumnFormatter(
        cloneDeep(cols),
        null,
        remodelStoreTableActions
      );
      let remodelStoreData = await props.fetchRemodelStoreReserveList(
        data.remodel_store_code
      );

      setRemodelStoreInvData(remodelStoreData.data?.data);
      setRemodelStoreCols(colActions);
      setRemodelStoreDetailsLoader(false);
    } catch (e) {
      handleErrorMessage(e);
      setRemodelStoreDetailsLoader(false);
    }
  };

  const viewReservedInv = async (data) => {
    if (new Date() < new Date(data.remodel_effective_date)) {
      displaySnackMessages(REMODEL_STORE_HYPERLINK_VALIDATION, "warning");
      return;
    }
    storeCodeRef.current = data;
    setMountReservedInvTable(true);
    try {
      props.setRemodelStoreDashboardLoader(true);
      let cols = [];
      cols = await getColumnsAg(
        "table_name=remodelled_store_reserved_inventory"
      )();
      //row grouping
      let clonedColumns = cloneDeep(cols);
      clonedColumns = clonedColumns.reduce((acc, col) => {
        if (
          col.extra?.is_grouping_key &&
          col.column_name !== viewByRef.current
        ) {
          return acc; // Exclude other hierarchy level column from clonedColumns
        }

        if (col.column_name === viewByRef.current) {
          acc.push({
            ...col,
            cellRenderer: "agGroupCellRenderer",
            rowGroup: true,
          });
        } else {
          acc.push(col);
        }

        return acc;
      }, []);
      clonedColumns = agGridColumnFormatter(clonedColumns);

      let reservedData = await props.fetchReservedInventoryList(
        data.store_code,
        viewByRef.current
      );

      setReservedInvData(reservedData?.data?.data);
      setReservedInvCols(clonedColumns);
      props.setRemodelStoreDashboardLoader(false);
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const detailsTableActions = {
    store_code: viewRemodelStoresDetails,
  };

  const remodelStoreTableActions = {
    go_to_approve: goToApprovalFlow,
    go_to_release: releaseFlow,
    store_code: viewReservedInv,
  };

  const getRemodelStoreDashboardData = async () => {
    setRemodelStoreLoader(true);
    try {
      let cols = [];
      cols = await getColumnsAg("table_name=remodelled_details")();
      let colActions = agGridColumnFormatter(
        cloneDeep(cols),
        null,
        detailsTableActions
      );
      setDetailsTableColumnConfig(colActions);
      let response = await props.fetchRemodelStoreDashboardList();
      setDetailsTableRowData(response?.data?.data);
      setRemodelStoreLoader(false);
    } catch (e) {
      handleErrorMessage(e);
      setRemodelStoreLoader(false);
    }
  };

  useEffect(() => {
    getRemodelStoreDashboardData();
  }, []);

  useEffect(() => {
    if (!isEmpty(props.inventorysmartModulesPermission)) {
      permissionsRef.current = cloneDeep(props.inventorysmartModulesPermission);
      remodelStoreDashboardTableInstance.current?.api?.redrawRows();
    }
  }, [props.inventorysmartModulesPermission]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const onDeleteClick = (rowData) => {
    if (rowData.editable) {
      setDeleteInstance(rowData.remodel_store_code);
      setShowDeleteDialog(true);
    } else {
      displaySnackMessages(NEW_STORE_DELETE_VALIDATION_MSG, "warning");
    }
  };

  const responseFormatter = (response = {}) => {
    const otherAttributes = response?.other_attributes ?? {};

    const remodelStoreDetailsForEditFlow = {
      legacy_store_details: {
        ...(otherAttributes.other_form_config ?? {}),
        ...(otherAttributes.legacy_store_form_config ?? {}),
      },
      temp_store_details: {
        ...(otherAttributes.other_form_config ?? {}),
        ...(otherAttributes.temp_store_form_config ?? {}),
      },
      remodel_store_details: {
        ...(otherAttributes.other_form_config ?? {}),
        ...(otherAttributes.remodel_store_form_config ?? {}),
      },
      table_row_attributes_temp: response?.table_row_attributes_temp ?? {},
      table_row_attributes_remodel:
        response?.table_row_attributes_remodel ?? {},
      temp_store_mapping_time_period: response?.temp_store_mapping_time_period,
      remodel_store_mapping_time_period:
        response?.remodel_store_mapping_time_period,
    };

    return remodelStoreDetailsForEditFlow || {};
  };

  const editRowData = async (rowData) => {
    if (rowData.editable) {
      try {
        let editRemodelStoreResponse = await props.editRemodelStore(
          rowData.store_code
        );
        const remodelStoreDetailsForEditFlow = responseFormatter(
          editRemodelStoreResponse?.data?.data
        );
        await props.saveEditFlowData(remodelStoreDetailsForEditFlow);
        await props.setEditRemodelStoreData(true);
        navigateToAddRemodelStore(rowData.store_code);
      } catch (e) {
        handleErrorMessage(e);
      }
    } else {
      displaySnackMessages(REMODEL_STORE_EDIT_VALIDATION_MSG, "warning");
    }
  };

  const callDelete = async () => {
    try {
      props.setRemodelStoreDashboardLoader(true);
      let response = await props.deleteRemodelStore(deleteInstance);
      displaySnackMessages(response.data?.message, "success");
      props.setRemodelStoreDashboardLoader(false);
      getRemodelStoreDashboardData();
      reservedTableTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    } catch (e) {
      handleErrorMessage(e);
    }
  };

  const canTakeActionOnModules = (module, subModuleName, action) => {
    return isActionAllowedOnSubModule(
      module,
      "inventorysmart_configuration",
      subModuleName,
      action
    );
  };

  const enableEdit = () => {
    let editEnabled = canTakeActionOnModules(
      permissionsRef.current,
      INVENTORY_SUBMODULES_NAMES.INVENTORY_REMODEL_STORE_SETUP,
      "edit"
    );
    return !editEnabled;
  };

  const disabledEdit = () => {
    let deletedEnabled = canTakeActionOnModules(
      permissionsRef.current,
      INVENTORY_SUBMODULES_NAMES.INVENTORY_REMODEL_STORE_SETUP,
      "delete"
    );
    return !deletedEnabled;
  };

  const loadRemodelStoreDashboardInstance = (params) => {
    remodelStoreDashboardTableInstance.current = params;
  };

  const disableCreate = () => {
    let enableCreate = canTakeActionOnModules(
      permissionsRef.current,
      INVENTORY_SUBMODULES_NAMES.INVENTORY_REMODEL_STORE_SETUP,
      "create"
    );
    return !enableCreate;
  };

  const handleChange = (value) => {
    viewByRef.current = value?.selectSources;
    viewReservedInv(storeCodeRef.current);
  };

  const customStyles = {
    inputLabel: classes.inputLabel,
    gridItem: classes.gridItem,
  };

  const reservedInventoryManualCallBack = async (
    manualbody,
    pageIndex,
    params
  ) => {
    props.setRemodelStoreDashboardLoader(true);
    // let body = {
    //   meta: {
    //     ...manualbody,
    //     search: manualbody.search,
    //     limit: { limit: 10, page: pageIndex + 1 },
    //   },
    // };
    try {
      let response = await props.fetchReservedInventoryList(
        storeCodeRef.current.store_code,
        viewByRef.current
      );
      if (response?.data?.status) {
        props.setRemodelStoreDashboardLoader(false);
        setReservedInvData(response?.data?.data);
        return {
          data: response?.data?.data,
          totalCount: response?.data?.length,
        };
      } else {
        props.setRemodelStoreDashboardLoader(false);
        return { data: [], totalCount: 0 };
      }
    } catch (err) {
      handleErrorMessage(err);
    }
  };

  const handleDownload = async () => {
    let body = {
      meta: {
        range: [],
        search: [],
        sort: [],
      },
      filters: [],
    };

    try {
      const storeCode = storeCodeRef.current.store_code;
      const hierarchyLevel = viewByRef.current;
      let response = await props.downloadReservedInventoryList(
        storeCode,
        hierarchyLevel,
        body
      );
      displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      handleErrorMessage(err);
    }
  };

  const renderBadge = (cellProps) => {
    const { colDef, data } = cellProps || {};
    const accessor = colDef?.accessor;
    const statusText = data?.status;

    // Map of status to badge props
    const badgeMap = {
      status: {
        Reserve: { color: "info", label: "Reserve" },
        Release: { color: "warning", label: "Release" },
        Complete: { color: "success", label: "Complete" },
        Setup: { color: "default", label: "Setup" },
      },
    };

    const badgeProps = badgeMap[accessor]?.[statusText];

    if (!badgeProps) return null;

    return (
      <div>
        <Badge
          color={badgeProps.color}
          label={badgeProps.label}
          onClick={() => {}} // no action required
          size="default"
          variant="filled"
        />
      </div>
    );
  };
  const topRightOptions = () => {
    let options = [];
    options.push(
      <Button
        id="remodel-store-button"
        variant="primary"
        onClick={() => navigateToAddRemodelStore()}
        className={globalClasses.iconButton}
        disabled={disableCreate()}
        size="large"
      >
        Add
      </Button>
    );
    return options;
  };
  const topLeftOptions = () => {
    let options = [];
    options.push(
      <>
        <div className={classes.divider} />
        <div className={`${classes.formWrapper} ${classes.horizontalForm}`}>
          <Form
            layout={"horizontal"}
            updateDefaultValue={true}
            maxFieldsInRow={1}
            handleChange={handleChange}
            fields={formFields}
            customStyles={customStyles}
            defaultValues={{
              [formFields?.[0]?.accessor]: viewByRef.current,
            }}
            spacing={2}
          />
        </div>
      </>
    );
    return options;
  };
  return (
    <>
      <div>
        <Loader loader={remodelStoreLoader}>
          <AgGridComponent
            columns={detailsTableColumnConfig}
            rowdata={detailsTableRowData}
            uniqueRowId={"store_code"}
            paginationPageSize={props.pageSize}
            noRowOverlayMessage={NO_TABLE_DATA_MSG}
            loadTableInstance={loadRemodelStoreDashboardInstance}
            onEditClick={(tableInfo) => editRowData(tableInfo.data)}
            callDeleteApi={(tableInfo) => onDeleteClick(tableInfo.data)}
            isEditDisabled={enableEdit}
            isDeleteDisabled={disabledEdit}
            tableHeader="Remodelled Stores"
            topRightOptions={topRightOptions()}
            noEditableCustomCellRender={(cellProps) => renderBadge(cellProps)}
            nestedTable={mountRemodelStoresDetailsTable}
            nestedTableComponent={
              <Loader loader={remodelStoreDetailsLoader} minHeight={160}>
                <div className={globalClasses.marginVertical1rem}>
                  <AgGridComponent
                    columns={remodelStoreCols}
                    rowdata={remodelStoreInvData}
                    uniqueRowId={"store_code"}
                    tableHeader="Remodelled Stores Details"
                    paginationPageSize={props.pageSize || 10}
                    closeButton={true}
                    sizeColumnsToFitFlag={true}
                    handleCloseButtonClick={() => {
                      setMountRemodelStoresDetailsTable(false);
                    }}
                  />
                </div>
              </Loader>
            }
          />
        </Loader>

        {mountReservedInvTable && (
          <div className={globalClasses.marginVertical1rem}>
            <div className={globalClasses.marginVertical1rem}>
              <AgGridComponent
                columns={reservedInvCols}
                rowdata={reservedInvData}
                uniqueRowId={viewByRef.current}
                manualCallBack={(body, pageIndex, params) =>
                  reservedInventoryManualCallBack(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                treeData={true}
                groupDisplayType={"custom"}
                childKey={"products"}
                purgeClosedRowNodes={true}
                tableHeader="Reserved Inventory"
                topLeftOptions={topLeftOptions()}
                showDownloadButton={true}
                onDownloadButtonClick={() => handleDownload()}
              />
            </div>
          </div>
        )}
      </div>
      <Prompt
        isOpen={showDeleteDialog}
        title={t("inventorysmart.deleteRemodelledStore")}
        primaryButtonLabel={common.__ConfirmBtnText}
        secondaryButtonLabel={common.__RejectBtnText}
        onPrimaryButtonClick={() => {
          callDelete();
          setShowDeleteDialog(false);
        }}
        onSecondaryButtonClick={() => setShowDeleteDialog(false)}
        handleClose={() => setShowDeleteDialog(false)}
        variant="error"
      >
        {"Are you sure you want to delete the remodelled store?"}
      </Prompt>
    </>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    remodelStoreDashboardLoader:
      inventorysmartReducer.inventorySmartRemodelStoreDashboardService
        .remodelStoreDashboardLoader,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    remodelStoreModuleConfig:
      inventorysmartReducer.inventorySmartRemodelStoreDashboardService
        ?.remodelStoreModuleConfig,
    cache: inventorysmartReducer?.activeModulesCacheService?.cache,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
    remodelStoreConfig:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_configuration
        ?.remodel_store,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    fetchRemodelStoreDashboardList: (body) =>
      dispatch(fetchRemodelStoreDashboardList(body)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    setRemodelStoreDashboardLoader: (body) =>
      dispatch(setRemodelStoreDashboardLoader(body)),
    deleteRemodelStore: (body) => dispatch(deleteRemodelStore(body)),
    setEditRemodelStoreData: (body) => dispatch(setEditRemodelStoreData(body)),
    editRemodelStore: (body) => dispatch(editRemodelStore(body)),
    saveEditFlowData: (body) => dispatch(saveEditFlowData(body)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setRemodelStoreModuleConfig: (body) =>
      dispatch(setRemodelStoreModuleConfig(body)),
    setKeyValueInCache: (keyValuePair) =>
      dispatch(setKeyValueInCache(keyValuePair)),
    fetchRemodelStoreReserveList: (body) =>
      dispatch(fetchRemodelStoreReserveList(body)),
    fetchReservedInventoryList: (body, hierarchy_level) =>
      dispatch(fetchReservedInventoryList(body, hierarchy_level)),
    downloadReservedInventoryList: (storeCode, hierarchy_level, body) =>
      dispatch(downloadReservedInventoryList(storeCode, hierarchy_level, body)),
  };
};
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(RemodelStoreSetupComponent);
