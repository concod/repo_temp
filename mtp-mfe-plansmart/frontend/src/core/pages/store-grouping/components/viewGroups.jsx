import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import { Button, Container, IconButton, Typography, Grid } from "@mui/material";
import Fade from "@mui/material/Fade";
import Tooltip from "@mui/material/Tooltip";
import globalStyles from "core/Styles/globalStyles";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { setFilterConfiguration } from "core/actions/filterAction";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import {
  getColumnsAg,
  resetTableRecentChanges,
} from "core/actions/tableColumnActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formattedFilterConfiguration,
  isDependencyValid,
} from "core/commonComponents/coreComponentScreen/utils";
import { storeGrouping } from "config/routes";
import { cloneDeep, isEmpty, isNull } from "lodash";
import { forwardRef, useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import LoadingOverlay from "../../../Utils/Loader/loader";
import { addSnack } from "../../../actions/snackbarActions";
import {
  ToggleLoader,
  deleteStoreGroup,
  deleteStoresFromGroups,
  fetchStoreGroups,
  fetchGroupStores,
  setGroupsCols,
  setSelectedGroupToEdit,
  setStoreGroups,
  setViewGrpFilterValues,
  setHandleGoBack,
  setSelectedFilters,
  setTenantUploadConfig,
  uploadStoreGroups,
} from "../services-store-grouping/custom-store-group-service";
import { fetchStoreFilters, renderGroupTypeCell } from "./common-functions";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { Modal, Prompt, Button as IAButton } from "impact-ui";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Close from "@mui/icons-material/Close";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import UploadHandler from "../../../commonComponents/uploadHandler";
import {
  FILE_UPLOAD_INSTRUCTIONS,
  CSV_CONFIG,
} from "../grouping-contants/stringConstants";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";

const ViewGroups = (props) => {
  const [columns, setcolumns] = useState([]);
  const navigate = useNavigate();
  let location = useLocation();
  const [opendialog, setopen] = useState(false);
  const [sg_id, setsgid] = useState([]);
  const tableInstance = useRef(null);
  const storeTableInstance = useRef(null);
  const onFilterDependency = useRef(null);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [editPopup, setEditPopup] = useState(false);
  const [originalFiltersLoaded, setOriginalFiltersLoaded] = useState(false);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [viewStoreTableColumns, setViewStoreTableColumns] = useState([]);
  const [storeLoader, setStoreLoader] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [uniqueCol, setUniqueCol] = useState(null);
  const [editAction, setEditAction] = useState("");

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
    //This will refresh the table data on mount if we navigate back from edit screen
    //TODO: the below will trigger only data with mandatory saved filters not the applied filters
    if (props?.location?.state?.shouldRenderTableData) {
      onClickFilter();
    }
  };

  const setNewStoreTableInstance = (params) => {
    storeTableInstance.current = params;
  };

  useEffect(() => {
    fetchData(true);
    return () => {
      props.setGroupsCols([]);
      props.setHandleGoBack(false);
    };
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [props.savedFilterDashboard]);

  useEffect(() => {
    if (
      !originalFiltersLoaded &&
      props.filterDashboardConfiguration?.filterConfig[0]
        ?.originalFilterDashboardData.length
    ) {
      setOriginalFiltersLoaded(true);
      props.filterConfigType !== "screen" && fetchData(false);
    }
  }, [
    [
      props.filterDashboardConfiguration?.filterConfig[0]
        ?.originalFilterDashboardData,
    ],
  ]);

  const fetchData = async (firstLoad) => {
    props.ToggleLoader(true);
    const from = location?.state?.from;
    const savedDependency = props.savedFilterDashboard.filter((config) => {
      return config.name === props.savedSelectedFilter;
    });
    // Update the dependency variable based on global or local filerConfigType
    let dependency =
      props.handleGoBack ||
      from?.includes("store-eligibility-grouping") ||
      from?.includes("store-grouping")
        ? props.filterConfigType === "screen"
          ? savedDependency[0]?.saved_filter_preference
          : props.savedFilterSelection
        : [];
    const isValidDependency = isDependencyValid(
      props.filterDashboardConfiguration?.filterConfig[0]
        ?.originalFilterDashboardData,
      dependency
    );
    if (!isValidDependency) {
      dependency = [];
    }
    props.setHandleGoBack(
      Boolean(
        from?.includes("store-eligibility-grouping") ||
          from?.includes("store-grouping")
      )
    );
    if (props.groupCols.length === 0 && firstLoad) {
      let cols = await props.getColumnsAg("table_name=store_group");
      props.setGroupsCols(cols);
    }
    // Assign all the filter dependency
    onFilterDependency.current = dependency;
    if (!isEmpty(onFilterDependency.current)) {
      //If the filter dependency is not empty, we are triggering the manualcallback for
      //the filters related data
      tableInstance?.current?.api?.refreshServerSideStore({ purge: false });
    }

    if (firstLoad) {
      // returns filter data
      const storeGroupFilters = await fetchStoreFilters(
        dependency,
        true,
        props.application_name,
        props.screenName
      );
      props.setViewGrpFilterValues(storeGroupFilters);
      if (isEmpty(props.filterDashboardConfiguration)) {
        let filterConfigData = [
          {
            filterDashboardData: storeGroupFilters,
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "storeGroupingFilterConfiguration",
          filterConfigData,
          "Store Grouping View"
        );
        props.setFilterConfiguration(filterConfig);
      }

      const groupColumns = await props.getColumnsAg(
        "table_name=store_group_filter"
      );
      groupColumns.forEach((item) => {
        if (item.extra?.is_unique || item.extra?.is_unique === "true") {
          setUniqueCol(item.column_name);
        }
      });
      setViewStoreTableColumns(groupColumns);
      let tenantData = await props.getTenantConfigApplicationLevel(1, {
        attribute_name: "store_group_upload_instructions",
      });
      props.setTenantUploadConfig(tenantData.data?.data[0]?.attribute_value);
    }
    props.ToggleLoader(false);
  };

  const deletestoregrp = async (ids) => {
    setsgid(ids);
    setopen(true);
  };

  /**
   * @func
   * @desc Always format columns when store groupCols changes before rendering.
   */
  useEffect(() => {
    let cols = cloneDeep(props.groupCols);
    cols = cols.map((col) => {
      switch (col.accessor) {
        case "special_classification":
          col = renderGroupTypeCell(col);
          break;
        default:
          return col;
      }
      return col;
    });
    let editEnabled = actionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GROUPING,
      "edit"
    );
    let deletedEnabled = actionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GROUPING,
      "delete"
    );

    if (!props.enableMultiEdit) {
      cols.push({
        headerName: "Action",
        disableSortBy: true,
        isFixed: true,
        cellRenderer: (params, extraProps) => {
          return (
            <>
              <IconButton
                onClick={() => {
                  props.setSelectedFilters([...onFilterDependency.current]);
                  let modifyRoute = props.parentRoute
                    ? `${props.parentRoute}/view`
                    : storeGrouping.viewGroup;
                  props.setSelectedGroupToEdit(params.data.name);
                  navigate(`${modifyRoute}/${params.data.sg_code}`, {
                    ...(props.prevScr
                      ? {
                          state: {
                            prevScr: props.prevScr,
                          },
                        }
                      : null),
                  });
                }}
                disabled={
                  params.data.is_accessible &&
                  (!params?.node?.data?.checkbox_disabled ||
                    props.isSuperUser) &&
                  editEnabled
                    ? false
                    : true
                }
                size="large"
              >
                <EditIcon />
              </IconButton>
              <IconButton
                onClick={() => deletestoregrp([params.data.sg_code])}
                disabled={
                  params.data.is_accessible &&
                  (!params?.node?.data?.checkbox_disabled ||
                    props.isSuperUser) &&
                  deletedEnabled
                    ? false
                    : true
                }
                size="large"
              >
                <DeleteIcon />
              </IconButton>
            </>
          );
        },
        suppressMenu: true,
        lockPosition: "right",
      });
    } else {
      cols = agGridColumnFormatter(cols, null, {
        store_count: toggleStoreModal,
      });
    }
    setcolumns(cols);
  }, [props.groupCols, props?.inventorysmartModulesPermission]);

  const toggleStoreModal = (data, columnName) => {
    const groupCode = data?.sg_code;
    setSelectedGroup(groupCode);
    setShowStoreModal(true);
  };

  const handleModalClose = () => {
    setShowStoreModal(false);
    setSelectedGroup(null);
  };

  const handleClose = () => {
    setopen(false);
  };

  const deleteStoreGroup = async () => {
    props.ToggleLoader(true);
    setopen(false);
    try {
      const payload = {
        sg_codes: sg_id,
        store_codes: [],
        delete_store_groups: true,
      };
      if (props.enableMultiEdit) {
        await props.deleteStoresFromGroups(payload);
      } else {
        await props.deleteStoreGroup(sg_id[0]);
      }
      handleClose();
      displaySnackMessages("Deleted successfully", "success");
      // retrigger grid manual callback to fetch table data
      setsgid([]);
      setSelectedGroups([]);
      refreshTableData();
      props.ToggleLoader(false);
    } catch (error) {
      props.ToggleLoader(false);
      displaySnackMessages(
        error?.response?.data?.message || "Delete failed",
        "error"
      );
    }
  };

  const manualCallBack = async (manualbody, pageIndex, pageSize) => {
    if (
      isNull(onFilterDependency.current) ||
      isEmpty(onFilterDependency.current)
    ) {
      return {
        data: [],
        totalCount: 0,
      }; // returning for server side pagination on ag grid
    }
    props.ToggleLoader(true);
    let body = {
      filters: onFilterDependency.current,
      meta: { ...manualbody },
      application_code: props.application_code,
    };
    try {
      const res = await props.fetchStoreGroups(body, "", pageIndex + 1);
      props.setStoreGroups({
        groupsData: res.data.data,
        count: res.data.total,
      });
      props.ToggleLoader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    } catch (error) {
      props.ToggleLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onClickFilter = (dependencyData) => {
    onFilterDependency.current = dependencyData;
    refreshTableData();
  };

  const refreshTableData = () => {
    props.resetTableRecentChanges();
    tableInstance.current?.api?.setFilterModel(null);
    tableInstance.current?.api?.refreshServerSideStore({ purge: true });
  };

  const actionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    tableInstance?.current?.api?.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data, is_selected: true });
    });
    setSelectedGroups(selectedRows);
  };

  const manualStoreCallBack = async (body, pageIndex, _params) => {
    setStoreLoader(true);
    let res = {
      data: {
        data: [],
        total: 0,
      },
    };
    let manualbody = {
      meta: {
        ...body,
      },
    };
    try {
      res = await props.fetchGroupStores(
        selectedGroup,
        manualbody,
        pageIndex,
        10
      );
      setStoreLoader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    } catch (error) {
      setStoreLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  return (
    <Container maxWidth={false}>
      <CoreComponentScreen
        pageLabel={`${dynamicLabelsBasedOnTenant("Store", "core")} Group`}
        showPageRoute={false}
        showPageHeader={true}
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"storeGroupingFilterConfiguration"}
        onApplyFilter={onClickFilter}
        hideNoDataFound
      >
        {props.enableMultiEdit ? (
          <Header
            prevScr={props.prevScr}
            selectedGroups={selectedGroups}
            setEditPopup={setEditPopup}
            handleDelete={deletestoregrp}
            {...props}
          />
        ) : (
          <Header prevScr={props.prevScr} {...props} />
        )}
        <LoadingOverlay loader={props.isLoading} spinner>
          <Prompt
            isOpen={opendialog}
            title= {`Delete ${dynamicLabelsBasedOnTenant("Store", "core")} Group`}
            subHeading="Are you sure you want to delete the group?"
            infoList={[]}
            primaryButtonProps={{
              children: "Confirm",
              onClick: () => {
                deleteStoreGroup();
                setopen(false);
              },
            }}
            tertiaryButtonProps={{
              children: "Cancel",
              onClick: () => setopen(false),
            }}
            variant="error"
          />
          <EditPopup
            setEditAction={setEditAction}
            setEditPopup={setEditPopup}
            open={editPopup}
            selectedGroups={selectedGroups}
            prevScr={props.prevScr}
            setSelectedGroups={props.setSelectedGroups}
            parentRoute={props.parentRoute}
            displaySnackMessages={displaySnackMessages}
          />

          {columns.length > 0 && (
            <AgGridComponent
              columns={columns}
              selectAllHeaderComponent={props.enableMultiEdit}
              onSelectionChanged={onSelectionChanged}
              hideSelectAllRecords={true}
              sizeColumnsToFitFlag
              onGridChanged
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              rowModelType="serverSide"
              serverSideStoreType="partial"
              cacheBlockSize={10}
              uniqueRowId={"sg_code"}
              loadTableInstance={setNewTableInstance}
              suppressClickEdit={true}
            />
          )}
        </LoadingOverlay>
      </CoreComponentScreen>
      <Modal
        size="large"
        heading="Stores"
        isOpen={showStoreModal}
        aria-labelledby="view-store-codes"
        aria-describedby="view-store-codes-description"
        onClose={() => handleModalClose()}
        primaryButtonProps={{
          children: "Cancel",
          onClick: () => handleModalClose(),
        }}
      >
        <LoadingOverlay loader={storeLoader} spinner>
          <AgGridComponent
            columns={viewStoreTableColumns}
            sizeColumnsToFitFlag
            onGridChanged
            manualCallBack={(body, pageIndex, params) =>
              manualStoreCallBack(body, pageIndex, params)
            }
            rowModelType="serverSide"
            serverSideStoreType="partial"
            cacheBlockSize={10}
            uniqueRowId={uniqueCol ? uniqueCol : "store_code"}
            loadTableInstance={setNewStoreTableInstance}
            suppressClickEdit={true}
          />
        </LoadingOverlay>
      </Modal>
    </Container>
  );
};

const mapStateToProps = (state) => {
  return {
    isLoading: state.storeGroupReducer.isLoading,
    groupCols: state.storeGroupReducer.groupsTableCols,
    isSuperUser:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.isSuperUser,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "storeGroupingFilterConfiguration"
      ],
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    enableMultiEdit:
      state.tenantConfigReducer.coreScreenNames?.attribute_value?.storeGrouping
        ?.enableMultiEdit,
    tenantUploadConfig: state.storeGroupReducer.tenantUploadConfig,
    savedSelectedFilter: state.filterReducer.savedSelectedFilter,
    savedFilterDashboard: state.filterReducer.savedFilterDashboard,
    filterConfigType:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .filterConfigType,
    handleGoBack: state.productGroupReducer.handleGoBack,
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      fetchStoreGroups,
      fetchGroupStores,
      setStoreGroups,
      ToggleLoader,
      getColumnsAg,
      addSnack,
      deleteStoresFromGroups,
      setViewGrpFilterValues,
      setGroupsCols,
      setSelectedFilters,
      setFilterConfiguration,
      setSelectedGroupToEdit,
      setTenantUploadConfig,
      deleteStoreGroup,
      setHandleGoBack,
      getTenantConfigApplicationLevel,
      resetTableRecentChanges,
    },
    dispatch
  );
};

const Header = forwardRef((props) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const validationHandler = useRef();
  const globalClasses = globalStyles();
  let createRoute = props.parentRoute
    ? `${props.parentRoute}/create-group`
    : storeGrouping.createGroup;
  const navigate = useNavigate();
  const moduleCodeRef = useRef("");

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  /**
   * attachCallBacks funtions will
   * check if there is any callback
   * if there is any callback
   * then attach that call to
   * validationHandler
   * @param {function} callback
   */

  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };

  const handleUpload = async (parsedExcelData) => {
    if (parsedExcelData && parsedExcelData.length > 0) {
      try {
        const regex = /^\s*$/;
        const storeGroups = [];
        let isInValidUpload = parsedExcelData
          ?.filter((eachRow) => Object.keys(eachRow)[0] != eachRow[0])
          .some((data) => {
            const values = Object.values(data);
            let isInvalid = false;
            const groupData = {};
            let index = 0;
            CSV_CONFIG.forEach((item) => {
              if (item.key === "delete") {
                groupData[item.key] = values[index] || "";
              } else {
                groupData[item.key] =
                  typeof values[index] != "number" && item.key != "store_code"
                    ? replaceSpecialCharToCharCode(values[index] || "")
                    : String(values[index]) || "";
                isInvalid =
                  isInvalid || regex.test(values[index]) || !values[index];
              }
              index++;
            });
            props.tenantUploadConfig?.extraColumns?.forEach((key) => {
              groupData[key] = replaceSpecialCharToCharCode(
                values[index] || ""
              );
              index++;
            });
            storeGroups.push(groupData);
            return isInvalid;
          });
        if (isInValidUpload) {
          props.addSnack({
            message:
              "File contains empty cells, please re-upload files with non-empty cells.",
            options: {
              variant: "error",
            },
          });
          return;
        }
        const res = await uploadStoreGroups({
          store_groups: storeGroups,
          is_edit: isEditMode,
          file_name: fileName,
          module_code: moduleCodeRef.current,
        });
        props.addSnack({
          message:
            res.message ||
            "Please wait for notification to be received shortly",
          options: {
            variant: "success",
          },
        });
        setIsEditMode(false);
        setIsModalOpen(false);
      } catch (error) {
        if (error.response?.data?.data?.length) {
          validationHandler.current.validate(error.response?.data?.data);
        } else {
          props.addSnack({
            message: error.response?.data?.message || "Something went wrong.",
            options: {
              variant: "error",
            },
          });
          validationHandler.current.validate([]);
        }
      }
    } else {
      props.addSnack({
        message:
          "File doesn't contain any data. Please re-upload correct file.",
        options: {
          variant: "error",
        },
      });
      validationHandler.current.validate([]);
    }
  };
  return (
    <>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
      >
        <Typography id="storeGrpingTableTitle" variant="h6">
          Filtered Groups
        </Typography>
        <div className={`${globalClasses.flexRow} ${globalClasses.gap}`}>
          {props.selectedGroups?.length >= 1 ? (
            <Button
              color="primary"
              variant="contained"
              id="storeGrpingEditBtn"
              size="small"
              onClick={() => props.setEditPopup(true)}
              title={"Edit"}
              disabled={
                !canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GROUPING,
                  "edit"
                )
              }
            >
              <EditIcon />
            </Button>
          ) : null}
          {props?.tenantUploadConfig?.showGroupUpload ? (
            <>
              <IAButton
                variant="primary"
                id="uploadGroups"
                disabled={
                  !canTakeActionOnModules(
                    INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GROUPING,
                    "create"
                  )
                }
                onClick={() => setIsModalOpen(true)}
                icon={FileUploadIcon}
              />
              <UploadHandler 
                handleUpload={handleUpload}
                isModalOpen={isModalOpen}
                setIsModalOpen={(val) => {
                  setIsEditMode(val);
                  setIsModalOpen(val);
                }}
                attachCallBacks={attachCallBacks}
                jsonUpload={true}
                templateConfig={[...CSV_CONFIG]}
                macroIdPath={
                  props.inventorysmartScreenConfig?.macrosDownload?.store_group
                }
                uploadInstructions={[...FILE_UPLOAD_INSTRUCTIONS]}
                tenantUploadConfig={props.tenantUploadConfig}
                templateName="StoreGroupTemplate"
                setFileName={setFileName}
                moduleName="Store Grouping"
                moduleCodeRef={moduleCodeRef}
              />
            </>
          ) : null}
          <Tooltip
            title="Create New Group"
            placement="top-end"
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 600 }}
          >
            <Button
              color="primary"
              variant="contained"
              id="storeGrpingCreateBtn"
              size="small"
              onClick={() => {
                navigate(createRoute, {
                  ...(props.prevScr
                    ? {
                        state: {
                          prevScr: props.prevScr,
                        },
                      }
                    : {}),
                });
              }}
              disabled={
                !canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GROUPING,
                  "create"
                )
              }
            >
              <AddIcon />
            </Button>
          </Tooltip>
          {props.selectedGroups?.length ? (
            <Button
              color="primary"
              variant="contained"
              id="storeGrpingDeleteBtn"
              size="small"
              onClick={() =>
                props.handleDelete(
                  props.selectedGroups.map((item) => item.sg_code)
                )
              }
              disabled={
                !canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GROUPING,
                  "delete"
                )
              }
              title={"Edit"}
            >
              <DeleteIcon />
            </Button>
          ) : null}
        </div>
      </div>
    </>
  );
});

const EditPopup = (props) => {
  let addRoute = props.parentRoute
    ? `${props.parentRoute}/add-stores`
    : storeGrouping.addRoute;
  let editRoute = props.parentRoute
    ? `${props.parentRoute}/bulk-edit`
    : storeGrouping.editRoute;

  const navigate = useNavigate();

  const handleClose = () => {
    props.setEditPopup(false);
  };

  /**
   * @function
   * @description Validate all groups to have a single channel if multiple channel found then invalid
   * @param {Array} groups
   * @returns
   */
  const isChannelValid = (groups) => {
    const hasMultiple =
      Array.from(new Set(groups.map((item) => item.channel))).length > 1;
    return !hasMultiple;
  };

  return (
    <Dialog
      id="storeGrpingEditPopup"
      open={props.open}
      fullWidth={true}
      maxWidth={"sm"}
      onClose={handleClose}
      aria-labelledby="form-dialog-title"
    >
      <DialogTitle id="form-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          Add/Delete Stores
          <IconButton
            color="primary"
            aria-label="close"
            onClick={handleClose}
            size="small"
          >
            <Close />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        Please select which action to perform before proceeding:
      </DialogContent>
      <DialogActions>
        <Button
          id="storeGrpingAddBulkBtn"
          onClick={() => {
            if (isChannelValid(props.selectedGroups)) {
              navigate(addRoute, {
                ...(props.prevScr
                  ? {
                      state: {
                        selectedStoreGroups: props.selectedGroups,
                        prevScr: props.prevScr,
                      },
                    }
                  : {
                      state: {
                        selectedStoreGroups: props.selectedGroups,
                      },
                    }),
              });
            } else {
              props.displaySnackMessages(
                "Please select groups from single channel.",
                "warning"
              );
            }
          }}
          color="primary"
        >
          Add Stores
        </Button>
        <Button
          id="storeGrpingDeleteBulkBtn"
          onClick={() => {
            if (isChannelValid(props.selectedGroups)) {
              navigate(editRoute, {
                ...(props.prevScr
                  ? {
                      state: {
                        selectedStoreGroups: props.selectedGroups,
                        prevScr: props.prevScr,
                      },
                    }
                  : {
                      state: {
                        selectedStoreGroups: props.selectedGroups,
                      },
                    }),
              });
            } else {
              props.displaySnackMessages(
                "Please select groups from single channel.",
                "warning"
              );
            }
          }}
          color="primary"
        >
          Delete Stores
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewGroups);
