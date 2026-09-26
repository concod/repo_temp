import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import Close from "@mui/icons-material/Close";
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  Grid,
  Typography,
} from "@mui/material";
import Fade from "@mui/material/Fade";
import Tooltip from "@mui/material/Tooltip";
import globalStyles from "core/Styles/globalStyles";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  dynamicLabelsBasedOnTenant,
  dynamicLabelKeysBasedOnTenant,
  fetchDynamicConfigFromTenantReducer,
} from "core/Utils/DynamicLabels";
import LoadingOverlay from "core/Utils/Loader/loader";
import AgGridComponent from "core/Utils/agGrid";
import { INVENTORY_SUBMODULES_NAMES } from "core/Utils/constants/inventorySmart-constants";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import {
  getColumnsAg,
  resetTableRecentChanges,
} from "core/actions/tableColumnActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
  getRequiredFilterList,
  getUAMScreenName,
  isDependencyValid,
} from "core/commonComponents/coreComponentScreen/utils";
import { Modal, Prompt } from "impact-ui";
import { cloneDeep, isEmpty, isNull } from "lodash";
import {
  ToggleLoader,
  deleteGrp,
  downloadProductGroups,
  fetchProductGroups,
  fetchGroupProducts,
  setGroupsCols,
  setMappedDefns,
  setProductGroups,
  setSelectedGroupToEdit,
  setSelectedProductGrpType,
  bulkDeleteProducts,
  setViewGrpFilterValues,
  setHandleGoBack,
} from "core/pages/product-grouping/product-grouping-service";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack } from "../../../../actions/snackbarActions";
import { renderDefinitionLink } from "./common-product-group-functions";
import { productGrouping } from "config/routes";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";

const ViewGroups = (props) => {
  const screenName = "product grouping";
  const [columns, setcolumns] = useState([]);
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  let location = useLocation();
  const [open, setOpen] = useState(false);
  const [deletedId, setdeletedId] = useState("");
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [editPopup, setEditPopup] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [productLoader, setProductLoader] = useState(false);
  const [viewProductTableColumns, setViewProductTableColumns] = useState([]);
  const [hasAggregatedConfig, setHasAggregatedConfig] = useState(false);
  const [isStyleType, setIsStyleType] = useState(false);
  const [originalFiltersLoaded, setOriginalFiltersLoaded] = useState(false);
  const [showDownloadLoader, setShowDownloadLoader] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [metaPayload, setMetaPayload] = useState({});
  const tableInstance = useRef({});
  const productTableInstance = useRef(null);
  const onFilterDependency = useRef(null);

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  const setNewProductTableInstance = (params) => {
    productTableInstance.current = params;
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
    props.filterDashboardConfiguration?.filterConfig[0]
      ?.originalFilterDashboardData,
  ]);

  const fetchData = async (firstLoad) => {
    props.ToggleLoader(true);
    props.setSelectedProductGrpType("manual");
    props.setMappedDefns([]);
    if (props.groupCols.length === 0 && firstLoad) {
      let cols = await props.getColumnsAg("table_name=product_group");
      props.setGroupsCols(cols);
    }
    const from = location?.state?.from;
    const savedDependency = props.savedFilterDashboard.filter((config) => {
      return config.name === props.savedSelectedFilter;
    });
    // Update the dependency variable based on global or local filerConfigType
    let dependency =
      props.handleGoBack || from?.includes("product-grouping")
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
    props.setHandleGoBack(Boolean(from?.includes("product-grouping")));
    let data;
    if (firstLoad) {
      data = await fetchFilterFieldValues(
        screenName,
        dependency,
        getUAMScreenName(
          sessionStorage.getItem("currentApp") === "inventorysmart"
            ? "Inventorysmart Store Eligibility Group"
            : props.screenName
        )
      );
    }

    //Assign only the required filters present in the filters data
    //to the filter dependency ref
    onFilterDependency.current = dependency;
    if (!isEmpty(onFilterDependency.current)) {
      //If the filter dependency is not empty, we are triggering the manualcallback for
      //the filters related data
      tableInstance.current.api?.refreshServerSideStore({ purge: false });
    }

    if (firstLoad) {
      if (isEmpty(props.filterDashboardConfiguration)) {
        let filterConfigData = [
          {
            filterDashboardData: data,
            isCrossDimensionFilter: false,
            screen_name: getUAMScreenName(props.screenName),
          },
        ];
        if (sessionStorage.getItem("currentApp") === "inventorysmart") {
          filterConfigData[0]["saved_filter_screen_name"] =
            "Inventorysmart Product Eligibility Group";
        }
        const filterConfig = formattedFilterConfiguration(
          "productGroupingFilterConfiguration",
          filterConfigData,
          "Product Grouping"
        );
        props.setFilterConfiguration(filterConfig);
      }

      const displayLevelsResp = await props.getTenantConfigApplicationLevel(3, {
        attribute_name: "display_levels",
      });
      let hasGroupingConfig = Boolean(
        displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
          "productGrouping"
        ]
      );
      setHasAggregatedConfig(hasGroupingConfig);
      const requiredConfig = hasGroupingConfig
        ? displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
            "productGrouping"
          ]
        : displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
            "product"
          ];
      const type = requiredConfig?.["default"] !== "product";
      setIsStyleType(type);
      const groupColumns = await props.getColumnsAg(
        type
          ? "table_name=product_group_filter_hierarchy"
          : "table_name=product_group_filter"
      );
      setViewProductTableColumns(groupColumns);
      props.setViewGrpFilterValues(data);
    }
    props.ToggleLoader(false);
  };

  useEffect(() => {
    let cols = cloneDeep(props.groupCols);
    if (props.enableMultiEdit) {
      cols = agGridColumnFormatter(cols, null, {
        product_count: toggleProductModal,
      });
    }
    cols = cols.map((col) => {
      if (col.accessor === "group_type") {
        col.accessor = "special_classification";
        col.field = "special_classification";
        col.cellRenderer = (params, extraProps) => {
          const getChipColor = () => {
            switch (params.data.special_classification) {
              case "manual":
                return "#49C6C3";
              case "objective":
                return "#F3A82F";
              case "custom":
                return "#F280A8";
              default:
            }
          };
          return (
            <Chip
              label={
                params.data.special_classification[0].toUpperCase() +
                params.data.special_classification.slice(1)
              }
              style={{ backgroundColor: getChipColor(), color: "white" }}
            />
          );
        };
      }

      if (
        col.accessor === "defintion_ids" ||
        col.accessor === "product_group_definitions"
      ) {
        // To do - ask about this screen's permissions
        col.cellRenderer = (params) => {
          return params.data.special_classification !== "manual" ||
            !params.data.product_group_definitions ||
            params.data.product_group_definitions === 0
            ? "-"
            : params.data.product_group_definitions[0].name;
        };
        col.tooltipField = "definitions";
      }
      if (col.accessor === "groups") {
        col.cellRenderer = (tableInfo) => {
          return !tableInfo.value ? "-" : tableInfo.value;
        };
      }
      if (col.accessor === "time_period") {
        col.cellRenderer = (params, extraProps) => {
          if (params.data.special_classification === "manual") {
            return "-";
          } else {
            return (
              params.data.selection_metadata.objective_metrics.start_date +
              " to " +
              params.data.selection_metadata.objective_metrics.end_date
            );
          }
        };
      }
      if (col.column_name === "products") {
        col.accessor = "product_count";
      }
      return col;
    });

    let editEnabled = actionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_GROUPING,
      "edit"
    );

    let deletedEnabled = actionOnModules(
      INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_GROUPING,
      "delete"
    );

    if (!props.enableMultiEdit) {
      cols.push({
        headerName: "Action",
        sticky: "right",
        isFixed: true,
        disableSortBy: true,
        cellRenderer: (params, extraProps) => {
          return (
            <>
              <IconButton
                onClick={() => {
                  props.setSelectedGroupToEdit(params.data.name);
                  navigate(`/product-grouping/view/${params.data.pg_code}`, {
                    ...(props.application_code === 1
                      ? {
                          state: {
                            application_code: 1,
                            prevScr: props.prevScr,
                          },
                        }
                      : {
                          state: {
                            prevScr: props.prevScr,
                          },
                        }),
                  });
                }}
                size="large"
                disabled={!editEnabled || params?.node?.data?.checkbox_disabled}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                onClick={() => deleteproductgrp(params.data.pg_code)}
                size="large"
                disabled={!deletedEnabled}
              >
                <DeleteIcon />
              </IconButton>
            </>
          );
        },
        suppressMenu: true,
        lockPosition: "right",
      });
    }

    setcolumns(cols);
  }, [props.groupCols, props?.inventorysmartModulesPermission]);

  const actionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  const toggleProductModal = (data, columnName) => {
    const groupCode = data?.pg_code;
    setSelectedGroup(groupCode);
    setShowProductModal(true);
  };

  const handleModalClose = () => {
    setShowProductModal(false);
    setSelectedGroup(null);
  };

  const deleteproductgrp = async (ids) => {
    setOpen(true);
    setdeletedId(ids);
  };

  const getType = async () => {
    const displayLevelsResp = await props.getTenantConfigApplicationLevel(3, {
      attribute_name: "display_levels",
    });
    let hasGroupingConfig = Boolean(
      displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
        "productGrouping"
      ]
    );
    const requiredConfig = hasGroupingConfig
      ? displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.[
          "productGrouping"
        ]
      : displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
          "product"
        ];
    const type = requiredConfig?.["default"] !== "product";
    return type;
  };

  const onFilter = async () => {
    props.ToggleLoader(true);
    props.resetTableRecentChanges();
    tableInstance.current?.api?.setFilterModel(null);
    tableInstance.current.api?.refreshServerSideStore({ purge: true });
    tableInstance.current.api.deselectAll(true);
  };

  const viewGroupsManualCallBack = async (manualbody, pageIndex, params) => {
    if (
      isNull(onFilterDependency.current) ||
      isEmpty(onFilterDependency.current)
    ) {
      return {
        data: [],
        totalCount: 0,
      }; // returning for server side pagination on ag grid
    }
    const reqBody = onFilterDependency.current.map((filter) => {
      return {
        ...filter,
        column_name: filter.attribute_name,
        dimension: "product",
      };
    });
    let body = {
      filters: reqBody,
      meta: { ...manualbody, limit: { limit: 10, page: pageIndex + 1 } },
      application_code:
        sessionStorage.getItem("currentApp") === "inventorysmart" ? 1 : 3,
    };
    setMetaPayload(manualbody);
    props.ToggleLoader(true);
    try {
      const style = await getType();
      const res = await props.fetchProductGroups(
        body,
        "",
        pageIndex + 1,
        style ? "aggregation" : null
      );
      props.setProductGroups({ groups: res.data.data, count: res.data.total });
      props.ToggleLoader(false);
      const data = res.data.data.map((item) => {
        return item.product_group_definitions
          ? {
              ...item,
              definitions: item.product_group_definitions
                .map((def) => def.name)
                .join(","),
            }
          : item;
      });
      setTotalCount(res?.data?.total || 0);
      return {
        data: data,
        totalCount: res.data.total,
      };
    } catch (err) {
      props.ToggleLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  const handleClose = () => {
    props.ToggleLoader(false);
    setOpen(false);
  };

  const onDelete = async () => {
    props.ToggleLoader(true);
    setOpen(false);
    try {
      if (props.enableMultiEdit) {
        const payload = {
          product_ids: {
            filters: onFilterDependency.current,
            meta: {
              search: [],
              range: [],
              sort: [],
              limit: {
                limit: 10,
                page: 1,
              },
            },
            definitions: [],
            metrics: [],
            selection: {
              data: [{ searchColumns: {}, checkAll: true }],
              unique_columns: [
                isStyleType
                  ? dynamicLabelKeysBasedOnTenant("style", "core")
                  : dynamicLabelKeysBasedOnTenant("product", "core"),
              ],
            },
          },
          pg_codes: deletedId,
          delete_product_groups: true,
        };
        await props.bulkDeleteProducts(payload);
      } else {
        await props.deleteGrp(deletedId);
      }
      handleClose();
      setSelectedGroups([]);
      displaySnackMessages("Deleted successfully", "success");
      tableInstance.current.api?.refreshServerSideStore({ purge: true });
    } catch (error) {
      props.ToggleLoader(false);
      displaySnackMessages(
        error?.response?.data?.message || "Delete failed",
        "error"
      );
    }
    return null;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onFilterDashboardClick = (dependencyData) => {
    onFilterDependency.current = dependencyData;
    onFilter();
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    tableInstance?.current?.api?.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data, is_selected: true });
    });
    setSelectedGroups(selectedRows);
  };

  const manualProductsCallBack = async (body, pageIndex, params) => {
    setProductLoader(true);
    try {
      const level = hasAggregatedConfig ? "aggregation" : null;
      let res = {
        data: {
          data: [],
          total: 0,
        },
      };
      let manualBody = {
        meta: {
          ...body,
          limit: { limit: 10, page: pageIndex + 1 },
        },
      };
      res = await props.fetchGroupProducts(
        selectedGroup,
        manualBody,
        level,
        pageIndex + 1,
        10
      );
      setProductLoader(false);
      return {
        data: res.data.data,
        totalCount: res.data.total,
      };
    } catch (err) {
      setProductLoader(false);
      displaySnackMessages("Something went wrong", "error");
    }
  };

  /**
   * @function
   * @description Process applied filters and create payload to hit download Product group api
   */
  const downloadGroups = async () => {
    if (totalCount < 100000) {
      const reqBody = onFilterDependency.current.map((filter) => {
        return {
          ...filter,
          column_name: filter.attribute_name,
          dimension: "product",
        };
      });
      setShowDownloadLoader(true);
      try {
        const origin = window.location.origin;
        const style = await getType();
        let body = {
          table_payload: {
            total_count: Number(totalCount),
            columns: [],
            filters: reqBody,
            meta: {   ...(props?.inventorysmartScreenConfig?.dashboard?.downloadAllOnTableSearch 
              ? { 
                  ...metaPayload,    
                  search: []        
                }
              : metaPayload),
              
              limit: { limit: -1, page: 0 } },
            application_code:
              sessionStorage.getItem("currentApp") === "inventorysmart" ? 1 : 3,
            params: { level: style ? "aggregation" : null },
          },
          table_api: `${origin}/api/v2/core/group/product`,
        };
        const response = await props.downloadProductGroups(body);
        if (response.data.status) {
          displaySnackMessages(
            "Please wait for download notification to be received shortly",
            "success"
          );
        } else throw response.data.status;
        setShowDownloadLoader(false);
      } catch (err) {
        setShowDownloadLoader(false);
        displaySnackMessages("Something went wrong", "error");
      }
    } else {
      props.displaySnackMessages(
        "Total product limit exceeds from filtered product groups.",
        "error"
      );
    }
  };

  return (
    <>
      <CoreComponentScreen
        pageLabel={dynamicLabelsBasedOnTenant("product_grouping", "core")}
        showPageRoute={false}
        showPageHeader={true}
        // Filter dashboard props
        showFilterDashboard={true}
        filterConfigKey={"productGroupingFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        hideNoDataFound
      >
        <LoadingOverlay loader={props.isLoading} spinner>
          <Prompt
            isOpen={open}
            title="Confirm Changes"
            subHeading="Are you sure want to delete the group?"
            infoList={[]}
            primaryButtonProps={{
              children: "Confirm",
              onClick: () => {
                onDelete();
                handleClose();
              },
            }}
            tertiaryButtonProps={{
              children: "Cancel",
              onClick: () => handleClose(),
            }}
            variant="error"
          />
          <div className={globalClasses.marginTop}>
            {props.enableMultiEdit ? (
              <Header
                prevScr={props.prevScr}
                application_code={
                  sessionStorage.getItem("currentApp") === "inventorysmart"
                    ? 1
                    : 3
                }
                selectedGroups={selectedGroups}
                setEditPopup={setEditPopup}
                handleDelete={deleteproductgrp}
                downloadGroups={downloadGroups}
                isDownloadDisabled={!Boolean(totalCount) || showDownloadLoader}
                {...props}
              />
            ) : (
              <Header
                application_code={
                  sessionStorage.getItem("currentApp") === "inventorysmart"
                    ? 1
                    : 3
                }
                downloadGroups={downloadGroups}
                isDownloadDisabled={!Boolean(totalCount) || showDownloadLoader}
                prevScr={props.prevScr}
                {...props}
              />
            )}
            <EditPopup
              setEditPopup={setEditPopup}
              open={editPopup}
              selectedGroups={selectedGroups}
              prevScr={props.prevScr}
              setSelectedGroups={props.setSelectedGroups}
              parentRoute={props.parentRoute}
              displaySnackMessages={displaySnackMessages}
              filterDependency={onFilterDependency}
              isStyleType={isStyleType}
            />
            {props.groupCols.length > 0 && (
              <AgGridComponent
                columns={columns}
                sizeColumnsToFitFlag
                onGridChanged
                manualCallBack={(body, pageIndex, params) =>
                  viewGroupsManualCallBack(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                uniqueRowId={"pg_code"}
                loadTableInstance={setNewTableInstance}
                suppressClickEdit={true}
                selectAllHeaderComponent={props.enableMultiEdit}
                onSelectionChanged={onSelectionChanged}
              />
            )}
          </div>
          <Modal
            size="large"
            heading={
              isStyleType
                ? dynamicLabelsBasedOnTenant("style", "core")
                : dynamicLabelsBasedOnTenant("product", "core")
            }
            isOpen={showProductModal}
            aria-labelledby="view-store-codes"
            aria-describedby="view-store-codes-description"
            onClose={() => handleModalClose()}
            primaryButtonProps={{
              children: "Cancel",
              onClick: () => handleModalClose(),
            }}
          >
            <LoadingOverlay loader={productLoader} spinner>
              <AgGridComponent
                columns={viewProductTableColumns}
                sizeColumnsToFitFlag
                onGridChanged
                manualCallBack={(body, pageIndex, params) =>
                  manualProductsCallBack(body, pageIndex, params)
                }
                rowModelType="serverSide"
                serverSideStoreType="partial"
                cacheBlockSize={10}
                ignoreClearSelectionOnSearchandSort={true}
                uniqueRowId={"store_code"}
                loadTableInstance={setNewProductTableInstance}
                suppressClickEdit={true}
              />
            </LoadingOverlay>
          </Modal>
        </LoadingOverlay>
      </CoreComponentScreen>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    productGroups: state.productGroupReducer.productGroups,
    productGroupsCount: state.productGroupReducer.productGroupsCount,
    isLoading: state.productGroupReducer.isLoading,
    groupCols: state.productGroupReducer.groupsTableCols,
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "productGroupingFilterConfiguration"
      ],
    filters: state.productGroupReducer.viewGrpFilterValues,
    handleGoBack: state.productGroupReducer.handleGoBack,
    isSuperUser:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.isSuperUser,
    inventorysmartModulesPermission:
      state.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    savedSelectedFilter: state.filterReducer.savedSelectedFilter,
    savedFilterDashboard: state.filterReducer.savedFilterDashboard,
    filterConfigType:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .filterConfigType,
    enableMultiEdit:
      state.tenantConfigReducer.coreScreenNames?.attribute_value
        ?.productGrouping?.enableMultiEdit,
        inventorysmartScreenConfig: state.inventorysmartReducer?.inventorySmartCommonService?.inventorysmartScreenConfig,
      };
};

const mapActionsToProps = {
  fetchProductGroups,
  downloadProductGroups,
  setProductGroups,
  ToggleLoader,
  getColumnsAg,
  setGroupsCols,
  deleteGrp,
  addSnack,
  setViewGrpFilterValues,
  setMappedDefns,
  setSelectedProductGrpType,
  setFilterConfiguration,
  setSelectedGroupToEdit,
  fetchGroupProducts,
  bulkDeleteProducts,
  getTenantConfigApplicationLevel,
  setHandleGoBack,
  resetTableRecentChanges,
};

const Header = (props) => {
  const [showDownloadBtn, setShowDownloadBtn] = useState(false);
  const navigate = useNavigate();
  let createRoute = props.parentRoute
    ? `${props.parentRoute}/product-grouping/create-group`
    : productGrouping.createGroup;
  const globalClasses = globalStyles();
  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

  useEffect(() => {
    const productGroupingConfig = fetchDynamicConfigFromTenantReducer(
      "core",
      "productGrouping"
    );
    setShowDownloadBtn(Boolean(productGroupingConfig?.grouping_download_csv));
  });

  /**
   * @function
   * @desc Return false if there are any hidden modules prest in the provided config
   * @returns {Boolean}
   */
  const valiateProductGroup = () => {
    const productGroupingConfig = fetchDynamicConfigFromTenantReducer(
      "core",
      "productGrouping"
    );
    const flag = !(
      productGroupingConfig &&
      productGroupingConfig["hiddenModules"]?.includes("grouping_definitions")
    );
    return flag;
  };

  const goToCreateGrpScreen = () => {
    //If application-code is 1, we send the information in state to create group screen
    //This information is needed to let the cross filters know that the create group screen
    //is being accessed from inventory smart application
    navigate(createRoute, {
      ...(props.application_code === 1
        ? {
            state: {
              application_code: 1,
              prevScr: props.prevScr,
            },
          }
        : {
            state: {
              prevScr: props.prevScr,
            },
          }),
    });
  };

  return (
    <>
      <div
        className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
      >
        <Typography style={{ flex: 1 }} variant="h6" gutterBottom>
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
            >
              <EditIcon />
            </Button>
          ) : null}
          {showDownloadBtn ? (
            <Button
              color="primary"
              variant="contained"
              id="storeGrpingDownloadBtn"
              size="small"
              onClick={() => props.downloadGroups()}
              title={"Download"}
              disabled={props.isDownloadDisabled}
            >
              <DownloadIcon />
            </Button>
          ) : null}
          {props.selectedGroups?.length ? (
            <Button
              color="primary"
              variant="contained"
              id="storeGrpingDeleteBtn"
              size="small"
              onClick={() =>
                props.handleDelete(
                  props.selectedGroups.map((item) => item.pg_code)
                )
              }
              title={"Delete"}
            >
              <DeleteIcon />
            </Button>
          ) : null}
          <Tooltip
            title="Create New Group"
            placement="top-end"
            TransitionComponent={Fade}
            TransitionProps={{ timeout: 600 }}
          >
            <Button
              id="productGrpingGrpAddBtn"
              color="primary"
              variant="contained"
              onClick={goToCreateGrpScreen}
              disabled={
                !canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_GROUPING,
                  "create"
                )
              }
            >
              <AddIcon />
            </Button>
          </Tooltip>
          {valiateProductGroup() && (
            <Tooltip
              title="view/create/modify definitions"
              placement="top-start"
              TransitionComponent={Fade}
              TransitionProps={{ timeout: 600 }}
            >
              <Button
                color="primary"
                id="productGrpingViewDfnsBtn"
                variant="contained"
                className={globalClasses.marginLeft1rem}
                onClick={() => {
                  const defRoute = props.parentRoute
                    ? `${props.parentRoute}/product-grouping/group-definitions`
                    : productGrouping.defRoute;
                    navigate(defRoute);
                }}
                disabled={
                  !canTakeActionOnModules(
                    INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_GROUPING,
                    "create"
                  )
                }
              >
                Grouping Defintions
              </Button>
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
};

const EditPopup = (props) => {
  const navigate = useNavigate();
  let addRoute = props.parentRoute
    ? `${props.parentRoute}${productGrouping.addRoute}`
    : productGrouping.addRoute;
  let editRoute = props.parentRoute
    ? `${props.parentRoute}${productGrouping.editRoute}`
    : productGrouping.editRoute;
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
      id="productGrpingEditPopup"
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
          Add/Delete Materials
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
          id="productGrpingAddBtn"
          onClick={() => {
            if (isChannelValid(props.selectedGroups)) {
              navigate(addRoute, {
                ...(props.prevScr
                  ? {
                      state: {
                        ...(props.application_code === 1 && {
                          application_code: 1,
                        }),
                        selectedProductGroups: props.selectedGroups,
                        prevScr: props.prevScr,
                      },
                    }
                  : {
                      state: {
                        ...(props.application_code === 1 && {
                          application_code: 1,
                        }),
                        selectedProductGroups: props.selectedGroups,
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
          Add Materials
        </Button>
        <Button
          id="productGroupingEditBtn"
          onClick={() => {
            if (isChannelValid(props.selectedGroups)) {
              navigate(editRoute, {
                ...(props.prevScr
                  ? {
                      state: {
                        ...(props.application_code === 1 && {
                          application_code: 1,
                        }),
                        filterDependency: props.filterDependency?.current,
                        selectedProductGroups: props.selectedGroups,
                        prevScr: props.prevScr,
                        isStyleType: props.isStyleType,
                      },
                    }
                  : {
                      state: {
                        ...(props.application_code === 1 && {
                          application_code: 1,
                        }),
                        selectedProductGroups: props.selectedGroups,
                        filterDependency: props.filterDependency?.current,
                        isStyleType: props.isStyleType,
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
          Delete Materials
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default connect(mapStateToProps, mapActionsToProps)(ViewGroups);
