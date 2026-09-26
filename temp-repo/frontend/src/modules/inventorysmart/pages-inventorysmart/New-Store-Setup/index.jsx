import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { useHistory } from "react-router-dom";

import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import Form from "core/Utils/form";
import { addSnack } from "core/actions/snackbarActions";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { Prompt, Switch } from "impact-ui";
import { cloneDeep, isEmpty } from "lodash";
import { common } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { makeStyles } from "@mui/styles";

import {
  ADD_NEW_STORE,
  NEW_STORE_ALLOCATION_FLOW,
  NEW_STORE_APPROVAL_FLOW,
  NEW_STORE_RELEASE_FLOW,
} from "../../constants-inventorysmart/routesConstants";
import {
  ERROR_MESSAGE,
  INVENTORY_SUBMODULES_NAMES,
  MAP_TO_DUMMY_STORE_FORM_FIELDS,
  NEW_STORE_ALLOCATE_VALIDATION_MSG,
  NEW_STORE_RELEASE_VALIDATION_MSG,
  NO_DUMMY_STORE_VALIDATION_MSG,
  NO_NEW_STORE_VALIDATION_MSG,
  MAP_TO_NEW_STORE_MSG,
  NEW_STORE_APPROVE_VALIDATION_MSG,
  MAP_DUMMY_STORE_SUCCESS_MSG,
} from "../../constants-inventorysmart/stringConstants";
import {
  clearNewStoreDashboard,
  deleteNewStore,
  editNewStore,
  fetchNewStoreDashboardList,
  fetchNewStoreReserveList,
  mapDummyStore,
  setEditNewStoreData,
  setNewStoreDashboardLoader,
} from "../../services-inventorysmart/New-Store/new-store-dashboard";
import { getNewStoreListDetails } from "../../services-inventorysmart/New-Store/new-store-details";
import { isActionAllowedOnSubModule } from "../inventorysmart-utility";
import DownloadReport from "../Allocation-Reporting/report-download";

export const useStyles = makeStyles(() => ({
  sizeSplitTableWidth: {
    margin: "1rem auto",
  },
}));

const NewStoreSetup = (props) => {
  const [newStoreColumnConfig, setNewStoreColumnConfig] = useState([]);
  const [newStoreRowData, setNewStoreRowData] = useState([]);
  const [reservedInvColumnConfig, setReservedInvColumnConfig] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteInstance, setDeleteInstance] = useState("");
  const [mapExistingStore, setMapExistingStore] = useState(false);
  const [mapExistingStoreToggle, setMapExistingStoreToggle] = useState(false);
  const [mapExistingStoreFormConfig, setMapExistingStoreFormConfig] = useState(
    MAP_TO_DUMMY_STORE_FORM_FIELDS
  );
  const [mapExistingStoreFormFields, setMapExistingStoreFormFields] = useState({
    new_store: "",
    existing_store: "",
  });
  const [newStoreDetails, setNewStoreDetails] = useState({});
  const [showMappingMessage, setShowMappingMessage] = useState(false);
  const [reservedInvDownload, setReservedInvDownload] = useState(true);
  const [requestBody, setRequestBody] = useState([]);
  const [storeGroupsColumn, setStoreGroupsColumn] = useState([]);
  const [storeGroupsData, setStoreGroupsData] = useState([]);
  const [storeGroupsPopup, setStoreGroupsPopup] = useState(false);
  const [newStoreLoader, setNewStoreLoader] = useState(false);

  const globalClasses = globalStyles();
  const history = useHistory();
  const reservedTableTableInstance = useRef({});
  const newStoreDashboardTableInstance = useRef({});
  const permissionsRef = useRef([]);

  const classes = useStyles();

  const navigateToAddNewStore = (id) => {
    history.push({ pathname: ADD_NEW_STORE, state: id, props: props });
  };

  const goToApprovalFlow = (data) => {
    let permissionToApprove = enableApprove();
    if (!permissionToApprove)
      displaySnackMessages(NEW_STORE_APPROVE_VALIDATION_MSG, "error");
    else if (!data.editable)
      displaySnackMessages("Cannot approve this store", "warning");
    else history.push({ pathname: NEW_STORE_APPROVAL_FLOW, state: data });
  };

  const releaseFlow = (data) => {
    if (data?.release_status === false)
      history.push({
        pathname: NEW_STORE_RELEASE_FLOW,
        state: data,
      });
    else displaySnackMessages(NEW_STORE_RELEASE_VALIDATION_MSG, "error");
  };

  const goToViewAllocation = (data) => {
    if (data?.release_status)
      history.push({
        pathname: NEW_STORE_ALLOCATION_FLOW,
        state: data,
      });
    else displaySnackMessages(NEW_STORE_ALLOCATE_VALIDATION_MSG, "error");
  };

  const displayStoreGroups = (data) => {
    setStoreGroupsData(data?.store_groups_names);
    setStoreGroupsPopup(true);
  };

  const dashboardActions = {
    store_groups_count: displayStoreGroups,
    go_to_approve: goToApprovalFlow,
    go_to_release: releaseFlow,
    view_allocation: goToViewAllocation,
  };

  const getNewStoreDashboardData = async () => {
    props.setNewStoreDashboardLoader(true);
    setNewStoreLoader(true);
    try {
      let cols = await getColumnsAg(
        "table_name=new_store_all_dashboard",
        null,
        dashboardActions
      )();
      setNewStoreColumnConfig(cols);
      let storeGroupCols = await getColumnsAg(
        "table_name=new_store_store_groups"
      )();
      setStoreGroupsColumn(storeGroupCols);
      let response = await props.fetchNewStoreDashboardList();
      setNewStoreRowData(response.data?.data);
      let reserveCols = await getColumnsAg(
        "table_name=new_store_all_reserve"
      )();
      setReservedInvColumnConfig(reserveCols);
      let listOfStores = await props.getNewStoreListDetails();
      setNewStoreDetails(listOfStores.data.data);
      setNewStoreLoader(false);
      props.setNewStoreDashboardLoader(false);
    } catch (e) {
      displaySnackMessages(ERROR_MESSAGE, "error");
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
    if (newStoreRowData.length && !isEmpty(newStoreDetails)) {
      MAP_TO_DUMMY_STORE_FORM_FIELDS[0].options = storeCodeDropDownList(
        newStoreDetails?.new_store_details
      );
      let baseStoreToMap = newStoreRowData?.filter((item) => item?.mappable);
      MAP_TO_DUMMY_STORE_FORM_FIELDS[1].options =
        storeCodeDropDownList(baseStoreToMap);
      setMapExistingStoreFormConfig(MAP_TO_DUMMY_STORE_FORM_FIELDS);
      setShowMappingMessage(false);
    } else {
      setShowMappingMessage(true);
    }
  }, [newStoreRowData, newStoreDetails]);

  useEffect(() => {
    if (!isEmpty(props.inventorysmartModulesPermission)) {
      permissionsRef.current = cloneDeep(props.inventorysmartModulesPermission);
      newStoreDashboardTableInstance.current?.api?.redrawRows();
    }
  }, [props.inventorysmartModulesPermission]);

  const storeCodeDropDownList = (stores) => {
    return stores?.map((obj) => {
      return {
        label: obj.store_code,
        id: obj.store_code,
        value: obj.store_code,
      };
    });
  };

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
      displaySnackMessages("Cannot delete this store", "warning");
    }
  };

  const editRowData = async (rowData) => {
    if (rowData.editable) {
      try {
        let editNewStoreResponse = await props.editNewStore({
          id: rowData.store_code,
          hierarchy: props.sisterStoreHierarchyKey,
        });
        let responseWithStoreCode = {
          ...editNewStoreResponse.data?.data,
          store_code: rowData.store_code,
        };
        await props.setEditNewStoreData(responseWithStoreCode);
        navigateToAddNewStore(rowData.store_code);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages("Cannot edit this store", "warning");
    }
  };

  const callDelete = async () => {
    try {
      props.setNewStoreDashboardLoader(true);
      let response = await props.deleteNewStore(deleteInstance);
      displaySnackMessages(response.data?.message, "success");
      props.setNewStoreDashboardLoader(false);
      getNewStoreDashboardData();
      reservedTableTableInstance.current?.api?.refreshServerSideStore({
        purge: true,
      });
    } catch (e) {
      props.setNewStoreDashboardLoader(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const mapToDummyStore = async () => {
    if (
      !mapExistingStoreFormFields.existing_store ||
      !mapExistingStoreFormFields.new_store
    ) {
      displaySnackMessages("Select mandatory fields", "error");
    } else {
      try {
        props.setNewStoreDashboardLoader(true);
        let body = {
          existing_store: mapExistingStoreFormFields.existing_store,
          new_store: mapExistingStoreFormFields.new_store,
        };
        let response = await props.mapDummyStore(body);
        if (response.data?.status) {
          displaySnackMessages(MAP_DUMMY_STORE_SUCCESS_MSG, "success");
          closeNewStoreMappingModal();
          getNewStoreDashboardData();
          reservedTableTableInstance.current?.api?.refreshServerSideStore({
            purge: true,
          });
        }
        props.setNewStoreDashboardLoader(false);
      } catch (e) {
        props.setNewStoreDashboardLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
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

  const closeNewStoreMappingModal = () => {
    setMapExistingStore(false);
    setMapExistingStoreToggle(false);
  };

  const handleChangeStoreMapping = (updatedFormData, fieldType) => {
    setMapExistingStoreFormFields(updatedFormData);
  };

  const enableApprove = () => {
    let enableApproveVal = canTakeActionOnModules(
      permissionsRef.current,
      INVENTORY_SUBMODULES_NAMES.INVENTORY_NEW_STORE_SETUP,
      "approve"
    );
    return enableApproveVal;
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

  const manualCallBackNewStoreReservedInv = async (manualbody, pageIndex) => {
    props.setNewStoreDashboardLoader(true);
    let body = {
      ...manualbody,
      limit: { limit: 10, page: pageIndex + 1 },
    };
    try {
      setRequestBody({ ...body, excludedFilterFlag: true });
      let response = await props.fetchNewStoreReserveList(body);
      props.setNewStoreDashboardLoader(false);
      if (pageIndex == 0) {
        if (response.data.data?.length) setReservedInvDownload(false);
        else setReservedInvDownload(true);
      }
      return {
        data: response.data?.data,
        totalCount: response.data?.total,
      };
    } catch (e) {
      setReservedInvDownload(true);
      props.displaySnackMessages(ERROR_MESSAGE, "error");
      props.setNewStoreDashboardLoader(false);
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const loadReservedInvTableInstance = (params) => {
    reservedTableTableInstance.current = params;
  };

  const loadNewStoreDashboardInstance = (params) => {
    newStoreDashboardTableInstance.current = params;
  };

  const renderStoreGroupPopup = () => {
    return (
      <Dialog
        maxWidth={"sm"}
        aria-labelledby="store-groups-dialog-title"
        open={true}
        fullWidth={true}
        disableEscapeKeyDown={true}
      >
        <DialogTitle id="store-groups-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5" gutterBottom>
              Store Group Information
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => setStoreGroupsPopup(false)}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <div className={classes.sizeSplitTableWidth}>
            <AgGridComponent
              columns={storeGroupsColumn}
              rowdata={storeGroupsData}
              uniqueRowId={"sg_code"}
            />
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const renderDummyStoreMappingModal = () => {
    return (
      <Dialog
        maxWidth={"sm"}
        aria-labelledby="customized-dialog-title"
        open={true}
        fullWidth={true}
        disableEscapeKeyDown={true}
      >
        <DialogTitle id="customized-dialog-title">
          <Grid
            container
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Typography variant="h5" gutterBottom>
              Add New Store
            </Typography>
            <IconButton
              aria-label="close"
              onClick={() => closeNewStoreMappingModal()}
              size="large"
            >
              <CloseIcon />
            </IconButton>
          </Grid>
        </DialogTitle>
        <DialogContent>
          <div className={globalClasses.layoutAlignSpaceBetween}>
            <Typography gutterBottom className={globalClasses.marginVertical}>
              {MAP_TO_NEW_STORE_MSG}
            </Typography>
            <Switch
              defaultChecked={mapExistingStoreToggle}
              id="storetoDcfcToggleBtn"
              onChange={(event) => {
                setMapExistingStoreToggle(event.target.checked);
              }}
              leftLabel="NO"
              rightLabel="Yes"
              disabled={showMappingMessage}
            />
          </div>
          <div>
            {showMappingMessage && (
              <Typography
                variant="h6"
                className={`${globalClasses.marginVertical}`}
                color="error"
              >
                {!newStoreRowData.length
                  ? NO_DUMMY_STORE_VALIDATION_MSG
                  : NO_NEW_STORE_VALIDATION_MSG}
              </Typography>
            )}
          </div>
          {mapExistingStoreToggle && (
            <div className={globalClasses.marginAround}>
              <Form
                layout={"vertical"}
                maxFieldsInRow={3}
                handleChange={handleChangeStoreMapping}
                fields={mapExistingStoreFormConfig}
                updateDefaultValue={false}
                defaultValues={mapExistingStoreFormFields}
                labelWidthSpan={2}
                fieldTypeWidthSpan={6}
              ></Form>
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            color="primary"
            variant="contained"
            onClick={() =>
              mapExistingStoreToggle
                ? mapToDummyStore()
                : navigateToAddNewStore()
            }
          >
            {mapExistingStoreToggle ? "Save" : "Add New Store"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const disableCreate = () => {
    let enableCreate = canTakeActionOnModules(
      permissionsRef.current,
      INVENTORY_SUBMODULES_NAMES.INVENTORY_NEW_STORE_SETUP,
      "create"
    );
    return !enableCreate;
  };

  return (
    <Loader loader={props.newStoreDashboardLoader}>
      <div className={globalClasses.marginAround}>
        <div className={globalClasses.marginVertical1rem}>
          <div className={globalClasses.layoutAlignSpaceBetween}>
            <Typography variant="h4">New Stores</Typography>
            <div>
              <Button
                title="Add New Store"
                color="primary"
                variant="contained"
                id="new-store-button"
                onClick={() => setMapExistingStore(true)}
                disabled={disableCreate()}
              >
                <AddIcon />
              </Button>
            </div>
          </div>
        </div>
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
          />

          <div className={globalClasses.marginVertical1rem}>
            <Typography
              variant="h4"
              className={globalClasses.marginVertical1rem}
            >
              Reserved Inventory
            </Typography>
            <DownloadReport
              screenName={"new_store_reserve"}
              requestBody={requestBody}
              disable={reservedInvDownload}
            ></DownloadReport>
            <AgGridComponent
              columns={reservedInvColumnConfig}
              uniqueRowId={"key"}
              manualCallBack={(body, pageIndex) =>
                manualCallBackNewStoreReservedInv(body, pageIndex)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              loadTableInstance={loadReservedInvTableInstance}
            />
          </div>
        </Loader>
      </div>
      <Prompt
        isOpen={showDeleteDialog}
        title="Delete new store"
        subHeading={"Are you sure you want to delete new store?"}
        infoList={[]}
        primaryButtonProps={{
          children: common.__ConfirmBtnText,
          onClick: () => {
            callDelete();
            setShowDeleteDialog(false);
          },
        }}
        tertiaryButtonProps={{
          children: common.__RejectBtnText,
          onClick: () => setShowDeleteDialog(false),
        }}
        variant="error"
      />
      {mapExistingStore && renderDummyStoreMappingModal()}
      {storeGroupsPopup && renderStoreGroupPopup()}
    </Loader>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer } = store;
  return {
    newStoreDashboardLoader:
      inventorysmartReducer.inventorySmartNewStoreDashboardService
        .newStoreDashboardLoader,
    sisterStoreHierarchyKey:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_new_store_setup?.drillDown
        ?.sister_store_mapping_hierarchy,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    fetchNewStoreDashboardList: (body) =>
      dispatch(fetchNewStoreDashboardList(body)),
    fetchNewStoreReserveList: (body) =>
      dispatch(fetchNewStoreReserveList(body)),
    addSnack: (snack) => dispatch(addSnack(snack)),
    setNewStoreDashboardLoader: (body) =>
      dispatch(setNewStoreDashboardLoader(body)),
    clearNewStoreDashboard: (body) => dispatch(clearNewStoreDashboard(body)),
    deleteNewStore: (body) => dispatch(deleteNewStore(body)),
    setEditNewStoreData: (body) => dispatch(setEditNewStoreData(body)),
    editNewStore: (body) => dispatch(editNewStore(body)),
    getNewStoreListDetails: (body) => dispatch(getNewStoreListDetails(body)),
    mapDummyStore: (body) => dispatch(mapDummyStore(body)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(NewStoreSetup);
