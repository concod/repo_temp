import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import DeleteTrashIcon from "coreAssets/pageAssets/IS_deleteTrash.svg";
import EditPencilIcon from "coreAssets/pageAssets/IS_editPencil.svg";
import { Chip } from "@mui/material";
import { Button, Modal, Prompt, Tooltip } from "impact-ui-v3";
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
  getUAMScreenName,
  isDependencyValid,
} from "core/commonComponents/coreComponentScreen/utils";
// import { Modal, Prompt } from "impact-ui";
import { cloneDeep, isEmpty, isNull } from "lodash";
import {
  ToggleLoader,
  deleteGrp,
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
import {
  handleErrorMessage,
  renderDefinitionLink,
} from "./common-product-group-functions";
import { productGrouping } from "config/routes";
import { useLocation, useNavigate } from "react-router-dom-v5-compat";
import { STORE_ELIGIBILITY_GROUP } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";

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
      props.setHandleGoBack(false);
      props.setFilterConfiguration({ productGroupingFilterConfiguration: {} });
    };
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [props.savedFilterDashboard]);

  useEffect(() => {
    if (
      !originalFiltersLoaded &&
      props.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData?.length
    ) {
      setOriginalFiltersLoaded(true);
      props.filterConfigType !== "screen" && fetchData(false);
    }
  }, [
    props.filterDashboardConfiguration?.filterConfig?.[0]
      ?.originalFilterDashboardData,
  ]);

  const fetchData = async (firstLoad) => {
    try {
      props.ToggleLoader(true);
      props.setSelectedProductGrpType("manual");
      props.setMappedDefns([]);
      // Always fetch columns on first load to ensure fresh data
      if (firstLoad) {
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
        props.filterDashboardConfiguration?.filterConfig?.[0]
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
    } catch (error) {
      console.error(error);
      props.ToggleLoader(false);
    }
  };

  useEffect(() => {
    let cols = cloneDeep(props.groupCols);
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
        cellStyle: {
          display: "flex",
          alignItems: "center",
        },
        cellRenderer: (params) => {
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                height: "100%",
              }}
            >
              <Tooltip title="Edit" orientation="top" variant="tertiary">
                <Button
                  variant="secondary"
                  size="large"
                  disabled={
                    !editEnabled || params?.node?.data?.checkbox_disabled
                  }
                  onClick={() => {
                    props.setSelectedGroupToEdit(params.data.name);
                    navigate(
                      `${STORE_ELIGIBILITY_GROUP}/product-grouping/view/${params.data.pg_code}`,
                      {
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
                      }
                    );
                  }}
                  icon={<EditPencilIcon />}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                />
              </Tooltip>
              <Tooltip title="Delete" orientation="top" variant="tertiary">
                <Button
                  variant="secondary"
                  type="destructive"
                  size="large"
                  disabled={
                    !deletedEnabled || params?.node?.data?.checkbox_disabled
                  }
                  onClick={() => deleteproductgrp(params.data.pg_code)}
                  icon={<DeleteTrashIcon />}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                />
              </Tooltip>
            </div>
          );
        },
        suppressMenu: true,
        lockPosition: "right",
      });
    } else {
      cols = agGridColumnFormatter(cols, null, {
        product_count: toggleProductModal,
      });
    }

    cols = cols.map((col) => {
      if (col.type === "int") {
        return {
          ...col,
          cellStyle: {
            ...col.cellStyle,
            textAlign: "right",
          },
        };
      }
      return col;
    });

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
    tableInstance.current.api?.deselectAll(true);
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
      meta: { ...manualbody, limit: { limit: props.pageSizeGrouping || 20, page: pageIndex + 1 } },
      application_code:
        sessionStorage.getItem("currentApp") === "inventorysmart" ? 1 : 3,
    };
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
      return {
        data: data,
        totalCount: res.data.total,
      };
    } catch (err) {
      props.ToggleLoader(false);
      handleErrorMessage(err, displaySnackMessages);
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
                limit: props.pageSizeGrouping || 20,
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
          limit: { limit: props.pageSizeGrouping || 20, page: pageIndex + 1 },
        },
        selection: {
          data: [
            {
              searchColumns: {},
              checkAll: true,
            },
            ...params?.api?.checkConfiguration,
          ],
          unique_columns: [isStyleType ? "article" : "product_code"],
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
      handleErrorMessage(err, displaySnackMessages);
    }
  };

  // const navigate = useNavigate();
  let createRoute = props.parentRoute
    ? `${props.parentRoute}/product-grouping/create-group`
    : productGrouping.createGroup;

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props?.inventorysmartModulesPermission,
      props?.module,
      subModuleName,
      action
    );
  };

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

  const callGroupingDefinitionModal = () => {
    if (valiateProductGroup()) {
      return (
      <Button
        id="productGrpingViewDfnsBtn"
        variant="tertiary"
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
        size="large"
      >
        Grouping Definitions
      </Button>
    );
    }
    return null;
  };

  const addExtraButtons = () => {
    let extraButtons = [];
    if (props.selectedGroups?.length >= 1) {
      extraButtons.push(
        <Button
          className={globalClasses.iconButton}
          variant="primary"
          id="storeGrpingEditBtn"
          size="large"
          onClick={() => props.setEditPopup(true)}
          icon={<EditIcon />}
        />
      );
      extraButtons.push(
        <Button
          className={globalClasses.iconButton}
          variant="secondary"
          id="storeGrpingDeleteBtn"
          size="large"
          onClick={() =>
            props.handleDelete(props.selectedGroups.map((item) => item.pg_code))
          }
          title={"Edit"}
          icon={<DeleteIcon />}
        />
      );
    }
    if (valiateProductGroup()) {
      extraButtons.push(
        <Button
          id="productGrpingViewDfnsBtn"
          variant="secondary"
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
          size="large"
        >
          Grouping Definitions
        </Button>
      );
    }
    extraButtons.push(
      <Button
        className={`${globalClasses.iconButton}`}
        id="productGrpingGrpAddBtn"
        variant="primary"
        onClick={goToCreateGrpScreen}
        disabled={
          !canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_GROUPING,
            "create"
          )
        }
        size="large"
      >
        Create Product Group
      </Button>
    );
    return extraButtons;
  };

  return (
    <div style={props?.isISGrouping ? {marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT} :{}}>
      <CoreComponentScreen
       IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        pageLabel={dynamicLabelsBasedOnTenant("product_grouping", "core")}
        showPageRoute={false}
        showPageHeader={false}
        // Filter dashboard props
        showFilterDashboard={true}
        autoHideFilterButton={true}
        filterConfigKey={"productGroupingFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        emptyStateSecondaryButtonLabel="Create Product Group"
        secondaryButtonProps={{
          disabled: !canTakeActionOnModules(
            INVENTORY_SUBMODULES_NAMES.INVENTORY_PRODUCT_GROUPING,
            "create"
          ),
        }}
        emptyStateSecondaryButtonClick={goToCreateGrpScreen}
        renderCustomComponent={true}
        returnCustomComponent={callGroupingDefinitionModal}
      >
        <LoadingOverlay loader={props.isLoading} spinner>
          <Prompt
            isOpen={open}
            title="Confirm Changes"
            handleClose={() => handleClose()}
            primaryButtonLabel="Confirm"
            onPrimaryButtonClick={() => {
              onDelete();
              handleClose();
            }}
            secondaryButtonLabel="Cancel"
            onSecondaryButtonClick={() => handleClose()}
            variant="error"
          >
            Are you sure you want to delete the group?
          </Prompt>
          <div className={globalClasses.marginTop}>
            {/* {props.enableMultiEdit ? (
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
                {...props}
              />
            ) : (
              <Header
                application_code={
                  sessionStorage.getItem("currentApp") === "inventorysmart"
                    ? 1
                    : 3
                }
                prevScr={props.prevScr}
                {...props}
              />
            )} */}
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
                disablePaginationForSinglePage={true}
                cacheBlockSize={props.pageSizeGrouping || 20}
                paginationPageSize={props.pageSizeGrouping || 20}
                uniqueRowId={"pg_code"}
                loadTableInstance={setNewTableInstance}
                suppressClickEdit={true}
                selectAllHeaderComponent={props.enableMultiEdit}
                onSelectionChanged={onSelectionChanged}
                tableName={"product_group_filter_hierarchy"}
                tableHeader="Product Groups"
                topRightOptions={addExtraButtons()}
              />
            )}
          </div>
          <Modal
            size="large"
            title={`${
              isStyleType
                ? dynamicLabelsBasedOnTenant("style", "core")
                : dynamicLabelsBasedOnTenant("product", "core")
            }`}
            open={showProductModal}
            onClose={() => handleModalClose()}
            primaryButtonLabel="Cancel"
            onPrimaryButtonClick={() => handleModalClose()}
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
                cacheBlockSize={props.pageSizeGrouping || 20}
                paginationPageSize={props.pageSizeGrouping || 20}
                uniqueRowId={"store_code"}
                loadTableInstance={setNewProductTableInstance}
                suppressClickEdit={true}
                tableName={"store_group_filter"}
              />
            </LoadingOverlay>
          </Modal>
        </LoadingOverlay>
      </CoreComponentScreen>
    </div>
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
      state.inventorysmartReducer?.inventorySmartCommonService
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
    pageSizeGrouping:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.pageSizeGrouping,
  };
};

const mapActionsToProps = {
  fetchProductGroups,
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

// Not used
// const Header = (props) => {
//   const globalClasses = globalStyles();

//   return (
//     <>
//       <div
//         className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter} ${globalClasses.marginBottom}`}
//       >
//         <h6 style={{ flex: 1, margin: 0 }}>
//           Filtered Groups
//         </h6>
//       </div>
//     </>
//   );
// };

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
    <>
      <Modal
        onClose={() => handleClose()}
        onPrimaryButtonClick={() => {
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
        onSecondaryButtonClick={() => {
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
        primaryButtonLabel="Add Materials"
        primaryButtonProps={{
          disabled: true,
        }}
        secondaryButtonLabel="Delete Materials"
        size="small"
        title="Add/Delete Materials"
        open={props.open}
      >
        Please select which action to perform before proceeding:
      </Modal>
    </>
  );
};

export default connect(mapStateToProps, mapActionsToProps)(ViewGroups);
