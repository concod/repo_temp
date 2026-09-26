import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import { Button, Prompt, Modal, Tooltip } from "impact-ui-v3";
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
  updateFilterDimension,
} from "core/commonComponents/coreComponentScreen/utils";
import { storeGrouping } from "config/routes";
import { cloneDeep, isEmpty, isNil, isNull } from "lodash";
import { useEffect, useRef, useState } from "react";
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
  setMultiChannelStatus,
} from "../services-store-grouping/custom-store-group-service";
import {
  fetchStoreFilters,
  handleErrorMessage,
  renderGroupTypeCell,
} from "./common-functions";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import UploadHandler from "../../../commonComponents/uploadHandler";
import {
  FILE_UPLOAD_INSTRUCTIONS,
  CSV_CONFIG,
} from "../grouping-contants/stringConstants";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";

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
    <Modal
      className=""
      onClose={() => {
        handleClose;
      }}
      onPrimaryButtonClick={() => {
        () => {
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
        };
      }}
      onSecondaryButtonClick={() => {
        () => {
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
        };
      }}
      primaryButtonLabel="Add Stores"
      primaryButtonProps={{
        color: "primary",
      }}
      secondaryButtonLabel="Delete Stores"
      secondaryButtonProps={{
        color: "primary",
      }}
      size="small"
      open={props.open}
      title="Add/Delete Stores"
      height="100px"
    >
      Please select which action to perform before proceeding:
    </Modal>
  );
};
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const validationHandler = useRef(null);
  const moduleCodeRef = useRef("");
  const [uploadConfig, setUploadConfig] = useState(CSV_CONFIG); //DB-driven upload config

  // Moved variable declarations from renderTopRightOptions to top
  const globalClasses = globalStyles();
  const createRoute = props.parentRoute
    ? `${props.parentRoute}/create-group`
    : storeGrouping.createGroup;
  const extraButtonStyles = {
    marginRight: "8px",
    minWidth: "20px",
  };

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  const setNewStoreTableInstance = (params) => {
    storeTableInstance.current = params;
  };

  useEffect(() => {
    fetchData(true);
    return () => {
      props.setHandleGoBack(false);
      props.setFilterConfiguration({ storeGroupingFilterConfiguration: {} });
    };
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [props.savedFilterDashboard]);

  useEffect(() => {
    if (
      !originalFiltersLoaded &&
      props.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData.length
    ) {
      setOriginalFiltersLoaded(true);
      props.filterConfigType !== "screen" && fetchData(false);
    }
  }, [
    [
      props.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData,
    ],
  ]);

  const fetchData = async (firstLoad) => {
    try {
    props.ToggleLoader(true);
    const from = location?.state?.from;
    // Always fetch columns on first load to ensure fresh data
    if (firstLoad) {
      let cols = await props.getColumnsAg(
        "table_name=store_group",
        {},
        {},
        false,
        false,
        false
      );
      props.setGroupsCols(cols);
    }

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
    dependency = updateFilterDimension(
      dependency,
      props.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData,
      false,
      true
    );
    const isValidDependency = isDependencyValid(
      props.filterDashboardConfiguration?.filterConfig?.[0]
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

      const groupColumns = await props.getColumnsAg(
        "table_name=store_group_filter",
        {},
        {},
        false,
        false,
        true
      );
      groupColumns.forEach((item) => {
        if (item.extra?.is_unique || item.extra?.is_unique === "true") {
          setUniqueCol(item.column_name);
        }
      });
      setViewStoreTableColumns(groupColumns);
      const uploadColumns = await props.getColumnsAg(
        "table_name=upload_store_groups_template",
        {},
        {},
        false,
        false,
        true
      );
      const dynamicUploadConfig = uploadColumns
        .filter((col) => !col.is_hidden)
        .sort((a, b) => (a.order_of_display || 0) - (b.order_of_display || 0))
        .map((col) => ({
          label: col.label || col.Header || col.column_name,
          key: col.column_name,
        }));
        setUploadConfig(dynamicUploadConfig.length > 0 ? dynamicUploadConfig : CSV_CONFIG);
      const tenantAttrbCalls = [];
      tenantAttrbCalls.push(
        props.getTenantConfigApplicationLevel(1, {
          attribute_name: "store_group_upload_instructions",
        })
      );
      tenantAttrbCalls.push(
        props.getTenantConfigApplicationLevel(3, {
          attribute_name: "allow_multi_channel_flag",
        })
      );
      let result = await Promise.all(tenantAttrbCalls);
      let tenantData = result[0];
      const allowMultiFlag = Boolean(
        result[1].data?.data?.[0]?.attribute_value?.value
      );
      props.setMultiChannelStatus(allowMultiFlag);
      props.setTenantUploadConfig(tenantData.data?.data[0]?.attribute_value);
    }
    props.ToggleLoader(false);
    } catch (error) {
      console.error(error);
      props.ToggleLoader(false);
    }
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
          // params.data.is_accessible and params.data.is_default added for disable logic for MTP-22706, MTP-60404 respectively
          return (
            <>
              <Button
                variant="tertiary"
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
                  editEnabled &&
                  !params.data.is_default
                    ? false
                    : true
                }
                size="large"
                icon={<EditIcon />}
                type="default"
                sx={{
                  marginLeft: "12px",
                }}
              ></Button>
              <Button
                onClick={() => deletestoregrp([params.data.sg_code])}
                disabled={
                  params.data.is_accessible &&
                  (!params?.node?.data?.checkbox_disabled ||
                    props.isSuperUser) &&
                  deletedEnabled &&
                  !params.data.is_default
                    ? false
                    : true
                }
                size="large"
                icon={<DeleteIcon />}
                type="default"
                variant="tertiary"
                sx={{
                  marginLeft: "12px",
                }}
              ></Button>
            </>
          );
        },
        suppressMenu: true,
        lockPosition: "right",
      });
    } else {
      cols = agGridColumnFormatter(
        cols,
        null,
        {
          store_count: toggleStoreModal,
        },
        false,
        null,
        true
      );
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
      handleErrorMessage(error, displaySnackMessages);
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
      meta: { ...manualbody, limit: { limit: props.pageSizeGrouping || 20, page: pageIndex + 1 },
 },
      application_code: props.application_code,
    };
    try {
      // this is called to fetch the store groups data
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
      handleErrorMessage(error, displaySnackMessages);
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

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  /**
   * attachCallBacks functions will
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
            if (
              !props.inventorysmartScreenConfig?.macrosDownload?.store_group
            ) {
              uploadConfig.forEach((item) => {
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
            } else {
              const labels = Object.keys(data).filter(key => key !== '__rowNum__');
              labels.forEach((label) => {
                const configItem = uploadConfig.find((col) => col.label === label);
                if (configItem) {
                  const value = data[label];
                  groupData[configItem.key] =
                    typeof value != "number" && configItem.key != "store_code"
                      ? replaceSpecialCharToCharCode(value || "")
                      : String(value) || "";
                  isInvalid =
                    isInvalid || regex.test(value) || !value;
                }
              });
            }
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
          displaySnackMessages(
            "File contains empty cells, please re-upload files with non-empty cells.",
            "error"
          );
          return;
        }
        const res = await uploadStoreGroups({
          store_groups: storeGroups,
          is_edit: isEditMode,
          file_name: fileName,
          module_code: moduleCodeRef.current,
        });
        displaySnackMessages(
          res.message || "Please wait for notification to be received shortly",
          "success"
        );
        setIsEditMode(false);
        setIsModalOpen(false);
        refreshTableData();
      } catch (error) {
        if (error.response?.data?.data?.length) {
          validationHandler.current.validate(error.response?.data?.data);
        } else {
          displaySnackMessages(
            error.response?.data?.message || "Something went wrong.",
            "error"
          );
          validationHandler.current.validate([]);
        }
      }
    } else {
      displaySnackMessages(
        "File doesn't contain any data. Please re-upload correct file.",
        "error"
      );
      validationHandler.current.validate([]);
    }
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
        limit: { limit: props.pageSizeGrouping || 20, page: pageIndex + 1 },
      },
    };
    try {
      res = await props.fetchGroupStores(
        selectedGroup,
        manualbody,
        pageIndex,
        props.pageSizeGrouping || 20
      );
      setStoreLoader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    } catch (error) {
      setStoreLoader(false);
      handleErrorMessage(error, displaySnackMessages);
    }
  };

  const renderTopRightOptions = () => {
    const options = [];

    // Create New Store Group Button
    options.push(
      <Button
        key="createBtn"
        variant="primary"
        id="storeGrpingCreateBtn"
        size="large"
        sx={extraButtonStyles}
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
        Create New Store Group
      </Button>
    );

    // Upload Button and UploadHandler (conditionally)
    if (props?.tenantUploadConfig?.showGroupUpload) {
      // Add separator before upload button
      options.push(<div key="uploadSeparator" className="divider-line"></div>);
      
      // Upload button with tooltip
      options.push(
        <Tooltip
          key="uploadBtnTooltip"
          title="Upload"
          orientation="top"
          variant="tertiary"
        >
          <Button
            key="uploadBtn"
            variant="tertiary"
            id="uploadGroups"
            size="large"
            onClick={() => setIsModalOpen(true)}
            disabled={
              !canTakeActionOnModules(
                INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GROUPING,
                "create"
              )
            }
            icon={<FileUploadIcon />}
            iconPlacement="left"
          />
        </Tooltip>
      );
      const templateName = props.tenantUploadConfig?.downloadTemplate?.fileName || "StoreGroupTemplate";

      options.push(
        <UploadHandler
          key="uploadHandler"
          handleUpload={handleUpload}
          isModalOpen={isModalOpen}
          templateTableName="upload_store_groups_template"
          setIsModalOpen={(val) => {
            setIsEditMode(val);
            setIsModalOpen(val);
          }}
          attachCallBacks={attachCallBacks}
          jsonUpload={true}
          templateConfig={uploadConfig}  //Use DB-driven config
          uploadInstructions={
            Object.keys(
              isNil(props.tenantUploadConfig?.validations)
                ? []
                : props.tenantUploadConfig?.validations
            ).length
              ? []
              : [...FILE_UPLOAD_INSTRUCTIONS].filter(
                  (instruction) =>
                    instruction !==
                    (props.allowMultiChannelFlag
                      ? "Update stores from the same channel."
                      : "")
                )
          }
          tenantUploadConfig={props.tenantUploadConfig}
          templateName={templateName}
          setFileName={setFileName}
          moduleName="Store Grouping"
          moduleCodeRef={moduleCodeRef}
        />
      );
    }

    return options;
  };

  return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        // pageLabel={`${dynamicLabelsBasedOnTenant("Store", "core")} Group`}
        showPageRoute={false}
        showPageHeader={false}
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"storeGroupingFilterConfiguration"}
        onApplyFilter={onClickFilter}
        emptyStateSecondaryButtonLabel="Create New Store Group"
        emptyStateSecondaryButtonClick={() => {
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
        secondaryButtonProps={{
          disabled: !canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_GROUPING,
            "create"
          ),
        }}
      >
        <LoadingOverlay loader={props.isLoading} spinner>
          <Prompt
            isOpen={opendialog}
            title={`Delete ${dynamicLabelsBasedOnTenant(
              "Store",
              "core"
            )} Group`}
            primaryButtonLabel="Confirm"
            onPrimaryButtonClick={() => {
              deleteStoreGroup();
              setopen(false);
            }}
            secondaryButtonLabel="Cancel"
            onSecondaryButtonClick={() => setopen(false)}
            variant="error"
            handleClose={() => setopen(false)}
          >
            Are you sure you want to delete the group?
          </Prompt>
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
              cacheBlockSize={props.pageSizeGrouping || 20}
              paginationPageSize={props.pageSizeGrouping || 20}
              uniqueRowId={"sg_code"}
              loadTableInstance={setNewTableInstance}
              suppressClickEdit={true}
              tableHeader={`Filtered Groups`}
              topRightOptions={renderTopRightOptions()}
            />
          )}
        </LoadingOverlay>
      </CoreComponentScreen>
      <Modal
        size="large"
        title="Stores"
        open={showStoreModal}
        primaryButtonLabel="Cancel"
        onPrimaryButtonClick={() => handleModalClose()}
        secondaryButtonLabel="Close"
        onSecondaryButtonClick={() => handleModalClose()}
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
            cacheBlockSize={props.pageSizeGrouping || 20}
            paginationPageSize={props.pageSizeGrouping || 20}
            uniqueRowId={uniqueCol ? uniqueCol : "store_code"}
            loadTableInstance={setNewStoreTableInstance}
            suppressClickEdit={true}
          />
        </LoadingOverlay>
      </Modal>
    </div>
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
    allowMultiChannelFlag: state.storeGroupReducer.allowMultiChannelFlag,
    pageSizeGrouping:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.pageSizeGrouping,
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
      setMultiChannelStatus,
    },
    dispatch
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(ViewGroups);
