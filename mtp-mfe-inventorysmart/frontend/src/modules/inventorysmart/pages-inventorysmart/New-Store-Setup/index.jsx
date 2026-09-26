import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import { Button, Prompt, Badge, useTranslation } from "impact-ui-v3";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import DeleteActionButton from "modules/inventorysmart/components/ui-actions/DeleteActionButton";
import EditActionButton from "modules/inventorysmart/components/ui-actions/EditActionButton";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { cloneDeep, isEmpty } from "lodash";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { alignStoreCodeColumnsRight } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import "../Common/styles/storeCodeColumn.scss";
import {
  ADD_NEW_STORE,
  NEW_STORE_RELEASE_FLOW,
  NEW_STORE_APPROVAL_FLOW,
} from "../../constants-inventorysmart/routesConstants";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  NEW_STORE_APPROVE_PERMISSION_MSG,
  NO_TABLE_DATA_MESSAGE,
  NEW_STORE_SETUP_USER_ACTION_REQUIRED_MESSAGE,
  NEW_STORE_SETUP_PROJECTIONS_VALIDATION,
  NEW_STORE_NO_FURTHER_ACTION_REQUIRED_MESSAGE,
} from "../../constants-inventorysmart/stringConstants";
import {
  clearNewStoreDashboard,
  deleteNewStore,
  editNewStore,
  fetchNewStoreDashboardList,
  setEditNewStoreData,
  setNewStoreDashboardLoader,
  setNewStoreModuleConfig,
  setDisableEditStoreDetails,
  setStoreStatusValue,
} from "../../services-inventorysmart/New-Store/new-store-dashboard";
import { saveStepOneFinalValues ,setNewStoreListItems} from "../../services-inventorysmart/New-Store/new-store-details";
import { isActionAllowedOnSubModule } from "../inventorysmart-utility";
import { getModuleBasedTenantConfig } from "../../services-inventorysmart/common/inventory-smart-common-services";
import { setKeyValueInCache } from "../../services-inventorysmart/active-module-common-service";
import AddIcon from "@mui/icons-material/Add";
import ProjectionsTable from "./components/ProjectionsTable";

const NewStoreSetup = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [newStoreColumnConfig, setNewStoreColumnConfig] = useState([]);
  const [newStoreRowData, setNewStoreRowData] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInstance, setDeleteInstance] = useState("");
  const [newStoreLoader, setNewStoreLoader] = useState(false);
  const [mountProjectionsTable, setMountProjectionsTable] = useState(false);
  const [projectedStoreCode, setProjectedStoreCode] = useState("");
  const reservationDateLabelRef = useRef("reservation start date");

  const newStoreDashboardTableInstance = useRef({});
  const permissionsRef = useRef([]);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  useEffect(() => {
    if (props.dateValidationKey) {
      reservationDateLabelRef.current = props.dateValidationKey.toLowerCase();
    }
  }, [props.dateValidationKey]);

  useEffect(() => {
    const fetchModuleConfigs = async () => {
      try {
        props.setNewStoreDashboardLoader(true);
        let reqBody = {
          module_name: "New Store",
          screen_name: "Inventorysmart Configurations New Store",
        };
        let response = await props.getModuleBasedTenantConfig(reqBody);
        props.setNewStoreModuleConfig(response);
      } catch (e) {
        handleErrorMessage(e);
      } finally {
        props.setNewStoreDashboardLoader(false);
      }
    };
    fetchModuleConfigs();
  }, []);


  const navigateToAddNewStore = (id) => {
    navigate(ADD_NEW_STORE, {
      state: { newStoreEditId: id },
      props: props,
    });
  };
  const enableApprove = () => {
    let enableApproveVal = canTakeActionOnModules(
      permissionsRef.current,
      INVENTORY_SUBMODULES_NAMES.INVENTORY_NEW_STORE_SETUP,
      "approve"
    );
    return enableApproveVal;
  };
  const goToApprovalFlow = (data) => {
    let permissionToApprove = enableApprove();
    if (!permissionToApprove)
      displaySnackMessages(NEW_STORE_APPROVE_PERMISSION_MSG, "error");
    else if (!data.editable)
      displaySnackMessages(
        `This store cannot be reserved as ${reservationDateLabelRef.current} has crossed/updated today`,
        "warning"
      );
    else {
      navigate(NEW_STORE_APPROVAL_FLOW, { state: data });
    }
  };
  const releaseFlow = (data) => {
    if (data?.release_bool === true) {
      navigate(NEW_STORE_RELEASE_FLOW, { state: data });
    } else
      displaySnackMessages(
        `This store cannot be released as ${reservationDateLabelRef.current} has crossed/updated today`,
        "warning"
      );
  };

  const viewReservedInv = async (data) => {
    if (
      data.action_required &&
      data.action_required.toLowerCase() === "no action required"
    ) {
      setMountProjectionsTable(false);
      setProjectedStoreCode(data.store_code);
      setTimeout(() => {
        setMountProjectionsTable(true);
      }, 500);
    } else {
      displaySnackMessages(NEW_STORE_SETUP_PROJECTIONS_VALIDATION, "warning");
    }
  };

  const handleEditNewStoreFlow = async (store_code) => {
    let editNewStoreResponse = await props.editNewStore(store_code);
    let responseWithStoreCode = {
      ...editNewStoreResponse.data?.data,
      store_code: store_code,
    };
    await props.saveStepOneFinalValues(responseWithStoreCode);
    await props.setEditNewStoreData(true);
    await props.setNewStoreListItems({});
    navigateToAddNewStore(store_code);
  };

  const userActionRequired = async (data) => {
    let hasAccessToCompleteSetup = disableCreate();
    if (!hasAccessToCompleteSetup) {
      if (data.action_required === "Complete Setup") {
        props.setStoreStatusValue(data.status_text.toLowerCase());
        // this will be same as edit for Admin hence we can reuse the same function
        await handleEditNewStoreFlow(data.store_code);
      } else {
        displaySnackMessages(
          NEW_STORE_NO_FURTHER_ACTION_REQUIRED_MESSAGE,
          "warning"
        );
      }
    }
    // Regular user does not have access to complete setup
    else {
      displaySnackMessages(
        NEW_STORE_SETUP_USER_ACTION_REQUIRED_MESSAGE,
        "warning"
      );
    }
  };

  const dashboardActions = {
    go_to_approve: goToApprovalFlow,
    go_to_release: releaseFlow,
    store_code: viewReservedInv,
    action_required: userActionRequired,
  };

  const statusBadgeMap = {
    "Pending Setup": { color: "warning", label: "Pending Setup", variant: "stroke" },
    "Approval Needed": { color: "warning", label: "Approval Needed", variant: "stroke" },
    "Approved": { color: "success", label: "Approved", variant: "stroke" },
    "Reserve": { color: "info", label: "Reserve", variant: "filled" },
    "Release": { color: "warning", label: "Release", variant: "filled" },
    "Complete": { color: "success", label: "Complete", variant: "filled" },
  };

  const renderBadge = (cellProps) => {
    const { colDef, value } = cellProps || {};
    // Only render badge for status column
    if (colDef?.column_name !== "status") {
      return null;
    }
    const statusText = value?.toString().trim();
    if (!statusText) return null;
    const badgeProps = statusBadgeMap[statusText];
    if (!badgeProps) return null;
    return (
      <Badge
        color={badgeProps.color}
        label={badgeProps.label}
        onClick={() => {}}
        size="default"
        variant={badgeProps.variant}
      />
    );
  };
  const getNewStoreDashboardData = async () => {
    props.setNewStoreDashboardLoader(true);
    setNewStoreLoader(true);
    try {
      let cols = [];
      cols = await getColumnsAg("table_name=new_store_all_dashboard")();
      let colActions = agGridColumnFormatter(
        cloneDeep(cols),
        null,
        dashboardActions
      );
      // Set cellRenderer for status column to show badges
      colActions = colActions.map((col) => {
        if (col.column_name === "status") {
          col.cellRenderer = (cellProps) => {
            const badge = renderBadge(cellProps);
            return badge || cellProps.value || "-";
          };
        }
        // Keep custom handlers/visibility; visuals come from shared action buttons.
        if (
          col.type === "delete_icon" ||
          (col.column_name || "").toLowerCase() === "delete"
        ) {
          col.cellRenderer = (params) => {
            const showKey = col.extra?.showDeleteIcon;
            if (showKey && !params?.data?.[showKey]) return null;
            return (
              <DeleteActionButton
                disabled={disabledEdit()}
                onClick={() => onDeleteClick(params.data)}
              />
            );
          };
        }
        if (
          col.type === "edit_icon" ||
          (col.column_name || "").toLowerCase() === "edit"
        ) {
          col.cellRenderer = (params) => {
            const showKey = col.extra?.showEditIcon;
            if (showKey && !params?.data?.[showKey]) return null;
            return (
              <EditActionButton
                title={t("inventorysmart.edit")}
                disabled={enableEdit()}
                onClick={() => editRowData(params.data)}
              />
            );
          };
        }
        const isActionCol = [
          "delete_icon",
          "edit_icon",
          "add_icon",
          "download_icon",
        ].includes(col.type);
        if (!isActionCol) {
          col.flex = 1;
          col.suppressSizeToFit = false;
          col.extra = {
            ...col.extra,
            ignoreSuppressSizeToFit: true,
          };
        }
        return col;
      });
      setNewStoreColumnConfig(alignStoreCodeColumnsRight(colActions));
      let response = await props.fetchNewStoreDashboardList();
      if (response.data?.data) setNewStoreRowData(response.data?.data);
      else setNewStoreRowData([]);
      if (response.data?.show_message)
        displaySnackMessages(response.data?.message, "success");
      setNewStoreLoader(false);
      props.setNewStoreDashboardLoader(false);
    } catch (e) {
      handleErrorMessage(e);
      props.setNewStoreDashboardLoader(false);
      setNewStoreLoader(false);
    }
  };
  useEffect(() => {
    getNewStoreDashboardData();
    return () => {
      props.clearNewStoreDashboard();
    };
  }, []);

  useEffect(() => {
    if (!isEmpty(props.inventorysmartModulesPermission)) {
      permissionsRef.current = cloneDeep(props.inventorysmartModulesPermission);
      newStoreDashboardTableInstance.current?.api?.redrawRows();
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
      setDeleteInstance(rowData.store_code);
      setShowDeleteDialog(true);
    } else {
      displaySnackMessages(
        `This store cannot be deleted as ${reservationDateLabelRef.current} has crossed/updated today`,
        "warning"
      );
    }
  };
  const editRowData = async (rowData) => {
    if (rowData.editable) {
      try {
        await handleEditNewStoreFlow(rowData.store_code);
        if (rowData?.status_text) {
          props.setStoreStatusValue(rowData.status_text.toLowerCase());
        }
        const noAccessToEditStoreDetails = disableCreate();
        // returns true for user and false for admin
        if (noAccessToEditStoreDetails) {
          props.setDisableEditStoreDetails(true);
        } else props.setDisableEditStoreDetails(undefined);
      } catch (e) {
        handleErrorMessage(e);
      }
    } else {
      displaySnackMessages(
        `This store cannot be edited as ${reservationDateLabelRef.current} has crossed/updated today`,
        "warning"
      );
    }
  };

  const callDelete = async () => {
    try {
      props.setNewStoreDashboardLoader(true);
      let response = await props.deleteNewStore(deleteInstance);
      if (response.data?.status || response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
      props.setNewStoreDashboardLoader(false);
      getNewStoreDashboardData();
    } catch (e) {
      props.setNewStoreDashboardLoader(false);
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
      INVENTORY_SUBMODULES_NAMES.INVENTORY_NEW_STORE_SETUP,
      "edit"
    );
    return !editEnabled;
  };
  const disabledEdit = () => {
    let deletedEnabled = canTakeActionOnModules(
      permissionsRef.current,
      INVENTORY_SUBMODULES_NAMES.INVENTORY_NEW_STORE_SETUP,
      "delete"
    );
    return !deletedEnabled;
  };
  const loadNewStoreDashboardInstance = (params) => {
    newStoreDashboardTableInstance.current = params;
  };
  const disableCreate = () => {
    let enableCreate = canTakeActionOnModules(
      permissionsRef.current,
      INVENTORY_SUBMODULES_NAMES.INVENTORY_NEW_STORE_SETUP,
      "create"
    );
    return !enableCreate;
  };

  const renderCreateNewStore = () => {
    return (
      <Button
        size="large"
        type="default"
        variant="tertiary"
        id="new-store-button"
        onClick={() => navigateToAddNewStore()}
        disabled={disableCreate()}
      >
        <AddIcon />
      </Button>
    );
  };


  return (
    <Loader loader={props.newStoreDashboardLoader}>
      <Loader loader={newStoreLoader}>
        <AgGridComponent
          columns={newStoreColumnConfig}
          rowdata={newStoreRowData}
          uniqueRowId={"store_code"}
          rowSelection={"multiple"}
          onEditClick={(tableInfo) => editRowData(tableInfo.data)}
          callDeleteApi={(tableInfo) => onDeleteClick(tableInfo.data)}
          isEditDisabled={enableEdit}
          isDeleteDisabled={disabledEdit}
          loadTableInstance={loadNewStoreDashboardInstance}
          paginationPageSize={props.pageSize}
          noRowOverlayMessage={NO_TABLE_DATA_MESSAGE}
          tableHeader={t("inventorysmart.newStores")}
          topRightOptions={renderCreateNewStore()}
          sizeColumnsToFitFlag={true}
          noEditableCustomCellRender={(cellProps) => renderBadge(cellProps)}
          nestedTable={props.showProjectionsTable}
          nestedTableComponent={
            mountProjectionsTable && (
              <ProjectionsTable
                handleErrorMessage={handleErrorMessage}
                setNewStoreDashboardLoader={props.setNewStoreDashboardLoader}
                projectedStoreCode={projectedStoreCode}
                handleCloseProjectionsTable={() => {
                  setMountProjectionsTable(false);
                  setProjectedStoreCode("");
                }}
              />
            )
          }
        />
      </Loader>

      <Prompt
        isOpen={showDeleteDialog}
        title={t("inventorysmart.deleteNewStore")}
        onPrimaryButtonClick={() => {
          callDelete();
          setShowDeleteDialog(false);
        }}
        onSecondaryButtonClick={() => setShowDeleteDialog(false)}
        primaryButtonLabel={t("inventorysmart.yes")}
        secondaryButtonLabel={t("inventorysmart.no")}
        variant="warning"
      >
        {t("inventorysmart.deleteNewStoreConfirm")}
      </Prompt>
    </Loader>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    newStoreDashboardLoader:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        .newStoreDashboardLoader,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    newStoreModuleConfig:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig,
    cache: inventorysmartReducer?.activeModulesCacheService?.cache,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
    showProjectionsTable:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.showProjectionsTable,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig?.inventorysmart_page_count,
    storeOpeningLabels:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.storeOpeningLabelConstants,
    dateValidationKey:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.dateValidationKey,
  };
};
const mapDispatchToProps = (dispatch) => {
  return {
    fetchNewStoreDashboardList: (body) =>
      dispatch(fetchNewStoreDashboardList(body)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    setNewStoreDashboardLoader: (body) =>
      dispatch(setNewStoreDashboardLoader(body)),
    clearNewStoreDashboard: (body) => dispatch(clearNewStoreDashboard(body)),
    deleteNewStore: (body) => dispatch(deleteNewStore(body)),
    setEditNewStoreData: (body) => dispatch(setEditNewStoreData(body)),
    editNewStore: (body) => dispatch(editNewStore(body)),
    saveStepOneFinalValues: (body) => dispatch(saveStepOneFinalValues(body)),
    getModuleBasedTenantConfig: (module) =>
      dispatch(getModuleBasedTenantConfig(module)),
    setNewStoreModuleConfig: (body) => dispatch(setNewStoreModuleConfig(body)),
    setKeyValueInCache: (keyValuePair) =>
      dispatch(setKeyValueInCache(keyValuePair)),
    setDisableEditStoreDetails: (body) =>
      dispatch(setDisableEditStoreDetails(body)),
    setStoreStatusValue: (body) => dispatch(setStoreStatusValue(body)),
    setNewStoreListItems: (body) => dispatch(setNewStoreListItems(body)),
  };
};
export default connect(mapStateToProps, mapDispatchToProps)(NewStoreSetup);
