import React, { useEffect, useState, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { useNavigate } from "react-router-dom-v5-compat";
import moment from "moment";
import { capitalize, cloneDeep, isArray, isEmpty, isNil, uniqBy } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
  getTenantTimeZoneDetails,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { mapDataToLabel } from "core/commonComponents/coreComponentScreen/utils";
import FilterChips from "core/commonComponents/filters/filterChips";
import Loader from "core/Utils/Loader/loader";
import classNames from "classnames";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import AgGridComponent from "core/Utils/agGrid";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { nonEditableCell } from "core/Utils/agGrid/table-functions";
import { Button } from "impact-ui-v3";
import { CREATE_NEW_ORDER_VENDOR_STORE_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import {
  fetchFilterConfig,
  filtersPayload,
  fetchFilterOptions,
} from "modules/oms/utils-oms/oms-utility";
import {
  setCreateNewOrderFilterLoader,
  setCreateNewOrderFilterElements,
  setCreateNewOrderFilterDependency,
  setSelectedFilters,
  setIsFiltersValid,
  resetCreateNewOrderState,
  getOmsCreateNewOrderVendorStoreTableConfiguration,
  setCreateNewOrderTableConfigLoader,
  getOmsCreateNewOrderStoreTableData,
  setCreateNewOrderTableDataLoader,
  editOmsCreateNewOrderTableData,
  setCreateNewOrderTableDataEditSuccess,
  setCreateNewOrderTableDataEditFailed,
} from "modules/oms/services-oms/Create-New-Order/create-new-order-service";
import CreateNewOrderVendorStoreSetAllPopUp from "./CreateNewOrderVendorStoreSetAllPopUp";
import VendorStoreSendApprovalButton from "./VendorStoreSendApprovalButton";
import PackConfigBottomSheet from "../../common/PackConfigBottomSheet";
import SafetyStockGraphView from "../../common/SafetyStockGraphView";
import {
  ERROR_MESSAGE,
  EXPECTED_RECEIPT_DATE_COLUMN_STORE,
  ORDER_REASON_COLUMN,
  SHIP_MODE_COLUMN,
  SIZE_COLUMN,
  INVALID_DATE,
  INVALID_ORDER_QTY,
  INVALID_ORDER_QTY_PACKSIZE,
  INVALID_RECEIPT_DATE,
  OMS_RECEIPT_DATE_MULTI_WEEK,
  NOT_AFTER_DATE_ERROR_MESSAGE,
  NOT_BEFORE_AFTER_DATE_COLUMN,
  NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE,
  OMS_EDITED_GRID_CELLS_BACKGROUND,
  ORDER_COST_COLUMN,
  ORDER_PLACEMENT_DATE_COLUMN,
  ORDER_QUANTITY_COLUMN,
  ORDER_QUANTITY_EACHES_COLUMN,
  ORDER_RETAIL_COLUMN,
  TENANT_DATE_FORMAT,
  defaultTableData,
  tableArticleFilter,
  tableConfigurationMetaData,
  EMPTY_ORDER_QTY,
  OMS_CREATE_NEW_ORDER_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";

const CreateNewOrderForVendorStore = (props) => {
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [isFiltersValid, updateIsFiltersValid] = useState(false);

  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);
  const [redirectedFilterDependency, setRedirectedFilterDependency] = useState(
    localStorage.getItem("selectedFiltersDependency")
      ? JSON.parse(localStorage.getItem("selectedFiltersDependency"))
      : []
  );
  const [customChipData, setCustomChipData] = useState(null);

  const [pageLoader, setPageLoader] = useState(false);

  const [tableColumns, setTableColumns] = useState([]);
  const [render, setRender] = useState(false);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [showButtons, setShowButtons] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedSku, setSelectedSku] = useState([]);
  const [openPopUp, setOpenPopUp] = useState(false);
  const [showSafetyStockGraph, setShowSafetyStockGraph] = useState(false);
  const [safetyStockGraphPayload, setsafetyStockGraphPayload] = useState();
  const [packConfigState, setPackConfigState] = useState({
    isOpen: false,
    selectedArticle: "",
  });
  const [isUserHasViewOnlyAccess, setIsUserHasViewOnlyAccess] = useState(null);
  const [isUserHasSetAllAccess, setIsUserHasSetAllAccess] = useState(true);
  const [isInlineEdit, setIsInlineEdit] = useState(true);
  // New state for vendor store specific functionality
  const [selectedSkuCount, setSelectedSkuCount] = useState(0);

  // user access for create new order vendor store
  const createNewOrderVendorStoreAccess = props.userAccess?.find(
    (item) => item.screen === OMS_CREATE_NEW_ORDER_SCREENNAME_KEY
  );
  const canSetAll = createNewOrderVendorStoreAccess?.isSetAllButton || false;
  const canInlineEdit = createNewOrderVendorStoreAccess?.isInlineEdit || false;

  const createNewOrderVendorStoreTableGridInstance = useRef(null);
  const focusedTableCellValue = useRef(null);
  const createNewOrderVendorStoreTableCount = useRef(null);

  const type = new URLSearchParams(window.location.search).get("type");

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];

  const uniqueRowId = props?.vendorToStoreScreenConfig?.uniqueRowId; //unique_row_id
  const isCreateNewOrderTableGrouping =
    props?.vendorToStoreScreenConfig?.isCreateNewOrderTableGrouping;
  const l1DisplayName = props?.screenConfig?.l1DisplayName || "Master SKU ID";
  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  useEffect(() => {
    if (isRedirectedFromDifferentPage) {
      if (props.isFiltersValid) setPageLoader(false);
      else setPageLoader(true);
    }
  }, [isRedirectedFromDifferentPage, props.isFiltersValid]);

  const applyFilters = (filterElements, filterDependency) => {
    const payload = filtersPayload(
      filterElements,
      filterDependency || props.createNewOrderFilterDependency,
      true
    );
    // Filter out any specific attributes if needed for vendor store
    payload.reqBody = payload.reqBody.filter(
      (item) =>
        ["sale_type", "store_capacity"].indexOf(item.attribute_name) === -1
    );
    if (!isRedirectedFromDifferentPage) {
      props.setSelectedFilters(payload.reqBody);
      props.setIsFiltersValid(payload.isValid);
      updateIsFiltersValid(payload.isValid);
    } else {
      props.setIsFiltersValid(true);
      updateIsFiltersValid(true);
      props.setSelectedFilters(redirectedFilterDependency);
    }
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setCreateNewOrderFilterLoader(true);
      const selectedFilters = isRedirectedFromDifferentPage
        ? cloneDeep(redirectedFilterDependency)
        : [];

      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: "Oms Create Order",
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);

      if (
        isRedirectedFromDifferentPage ||
        isEmpty(props.filterDashboardConfigurationVendorStore) ||
        props?.filterDashboardConfiguration?.isRedirectedFromDifferentPage
      ) {
        const filterConfigData = [
          {
            filterDashboardData: response,
            isCrossDimensionFilter: true,
            screen_name: "Oms Create Order",
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "CreateNewOrderFilterConfigurationVendorStore",
          filterConfigData,
          "Oms Create Order",
          selectedFilters
        );
        if (isRedirectedFromDifferentPage) {
          let redirectedFilters = redirectedFilterDependency?.map((item) => {
            if (item.dimension !== "custom")
              return {
                ...item,
                filter_id: item.attribute_name,
                filter_type: "cascaded",
                display_type: "dropdown",
              };
          });
          const formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "Oms Create Order",
            redirectedFilters
          );
          let filterConfigRedirected = formattedFilterConfiguration(
            "CreateNewOrderFilterConfigurationVendorStore",
            filterConfigData,
            "Create New Order",
            redirectedFilters
          );
          filterConfigRedirected[
            "CreateNewOrderFilterConfigurationVendorStore"
          ].isRedirectedFromDifferentPage = isRedirectedFromDifferentPage;

          // This code is used to explicitly set the Chip data that core components handles on applying filter.
          if (redirectedFilters) {
            let chipsDependencyData = [];
            cloneDeep(redirectedFilters)?.map((item) => {
              if (isArray(item.values)) {
                item.values = item.values.map((value) => {
                  if (typeof value === "boolean")
                    return mapDataToLabel(value.toString().toUpperCase());
                  else return mapDataToLabel(value);
                });
              } else {
                item.values = [mapDataToLabel(item.values)];
              }
              if (item.values?.length > 0) {
                chipsDependencyData.push(item);
              }
              if (!item.filter_name) {
                item.filter_name = item.label || capitalize(item.dimension);
              }
            });
            const labelMap = response.reduce((map, config) => {
              map[config.column_name] = config.label;
              return map;
            }, {});

            const chips = chipsDependencyData.map((filter) => ({
              ...filter,
              label: labelMap[filter.attribute_name] || filter?.label || null,
              filter_name:
                labelMap[filter.attribute_name] || filter?.filter_name || null,
            }));
            setCustomChipData(chips);
          }

          setFilterDependency(formattedSelectedFilters);
          onFilterDashboardClick(redirectedFilters, response);
          props?.setFilterConfiguration(filterConfigRedirected);
        }
        props.setFilterConfiguration(filterConfig);
      }
      let filterElements = cloneDeep(response);
      props.setCreateNewOrderFilterElements(filterElements);
    } catch (error) {
      console.log("Error while fetching options for Vendor Store");
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setCreateNewOrderFilterLoader(false);
    }
  };

  useEffect(() => {
    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.filterDashboardConfigurationVendorStore?.appliedFilterData
            ?.dependencyData;

    props.setCreateNewOrderFilterDependency(selectedFiltersDependency);
    localStorage.removeItem("selectedFiltersDependencyVendorStore");
    localStorage.removeItem("selectedArticlesVendorStore");
    localStorage.removeItem("storeCodesVendorStore");

    const redirectedFromDifferentPage = type && true;
    setIsRedirectedFromDifferentPage(redirectedFromDifferentPage);

    const fetchFilters = async () => {
      props.setCreateNewOrderFilterLoader(true);
      try {
        // Use same filter config for now, but you can create a separate one for vendor store
        const response = await fetchFilterConfig(
          CREATE_NEW_ORDER_VENDOR_STORE_FILTER_CONFIG
        );
        let data = response;
        setFilters(data);
        props.setCreateNewOrderFilterLoader(false);
      } catch (error) {
        props.setCreateNewOrderFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    fetchFilters();

    return () => {
      props.resetCreateNewOrderState();
    };
  }, []);

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  useEffect(() => {
    if (props.backButtonClicked) {
      setFilters([]);
      setFilterData([]);
    }
  }, [props.backButtonClicked, props.formFilters]);

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  useEffect(() => {
    return () => {
      props.setFilterConfiguration({
        CreateNewOrderFilterConfigurationVendorStore: undefined,
      });
    };
  }, []);

  const sizeColumnClickHandler = useCallback((params) => {
    const article = params?.data?.article;
    if (article) {
      setPackConfigState({
        isOpen: true,
        selectedArticle: article,
      });
    }
  }, []);

  const handlePackConfigClose = useCallback(() => {
    setPackConfigState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const refreshTableData = () => {
    createNewOrderVendorStoreTableGridInstance?.current?.api?.refreshServerSideStore(
      {
        purge: true,
      }
    );
    createNewOrderVendorStoreTableGridInstance.current.api.deselectAll();
    setSelectedOrderIds([]);
    setSelectedOrders([]);
  };

  useEffect(() => {
    if (!isEmpty(props?.userAccess)) {
      // Use new userAccess flags
      setIsUserHasSetAllAccess(canSetAll);
      setIsInlineEdit(canInlineEdit);
      setIsUserHasViewOnlyAccess(false);
    } else if (props?.orderingAccessControl) {
      // Fall back to old access control
      let canUserEdit = props?.orderingAccessControl?.isEditButton?.isVisible;
      setIsUserHasViewOnlyAccess(!canUserEdit);
      setIsUserHasSetAllAccess(true);
      setIsInlineEdit(true);
    }
  }, [
    props?.userAccess,
    props?.orderingAccessControl,
    canSetAll,
    canInlineEdit,
  ]);

  const checkForEditability = (columnsDef) => {
    try {
      let updatedColumnsDef = cloneDeep(columnsDef);

      // adding custom renderer on parent group row to aggregate status and type
      // enabling in table edit for status and date columns
      updatedColumnsDef = updatedColumnsDef.map((item) => {
        if (isCreateNewOrderTableGrouping) {
          if (item.extra?.is_grouping_key) {
            item.cellRenderer = "agGroupCellRenderer";
          }
          if (item.column_name === ORDER_QUANTITY_COLUMN) {
            item.cellStyle = (params) => {
              return params.node.data.isEdited
                ? { backgroundColor: "#0055af36" }
                : { backgroundColor: "inherit" };
            };
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                if (params.data.status_obj && params.data.status_obj.length) {
                  const value = params.data.status_obj.reduce(
                    (acc, val) => (acc += Number(val[item.column_name] || 0)),
                    0
                  );
                  params.data[item.column_name] = value;
                  return params.data[item.column_name];
                } else {
                  return "-";
                }
              } else {
                if (
                  !isEmpty(props?.userAccess)
                    ? !isInlineEdit
                    : isUserHasViewOnlyAccess
                )
                  item.disabled = true;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              }
            };
          } else if (item.column_name === ORDER_COST_COLUMN) {
            item.cellRenderer = (params, _extraProps) => {
              let noEditableCustomCellRender = params?.api?.gridOptionsWrapper
                ?.gridOptions?.noEditableCustomCellRender
                ? params?.api?.gridOptionsWrapper?.gridOptions?.noEditableCustomCellRender(
                    params
                  )
                : false;
              if (noEditableCustomCellRender) {
                return noEditableCustomCellRender;
              }
              return nonEditableCell(item, null, true)(params);
            };
          } else if (item.column_name === NOT_BEFORE_AFTER_DATE_COLUMN) {
            item.cellStyle = (params) => {
              return params.node.data.isDateEdited
                ? { backgroundColor: "#0055af36" }
                : { backgroundColor: "inherit" };
            };
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                if (
                  !isEmpty(props?.userAccess)
                    ? !isInlineEdit
                    : isUserHasViewOnlyAccess
                )
                  item.disabled = true;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                return "";
              }
            };
          } else if (item.column_name === EXPECTED_RECEIPT_DATE_COLUMN_STORE) {
            item.cellStyle = (params) => {
              return params.node.level === 0 && params.node.data.isNotValid
                ? { backgroundColor: "#F6CCCC", color: "#F6CCCC" }
                : params.node.data.isDateEdited
                ? { backgroundColor: "#0055af36" }
                : { backgroundColor: "inherit" };
            };
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                if (
                  !isEmpty(props?.userAccess)
                    ? !isInlineEdit
                    : isUserHasViewOnlyAccess
                )
                  item.disabled = true;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                // Child node - safely format the date
                const dateValue =
                  params.node.data.editable_expected_receipt_date;
                if (!dateValue) return "";

                const momentDate = moment(dateValue, TENANT_DATE_FORMAT);
                return momentDate.isValid()
                  ? momentDate.format(DATE_FORMAT)
                  : "";
              }
            };
          } else if (item.column_name === ORDER_REASON_COLUMN) {
            item.cellStyle = (params) => {
              return params.node.data.isOrderReasonEdited
                ? { backgroundColor: "#0055af36" }
                : { backgroundColor: "inherit" };
            };
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                if (
                  !isEmpty(props?.userAccess)
                    ? !isInlineEdit
                    : isUserHasViewOnlyAccess
                )
                  item.disabled = true;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                return params.node.data.order_reason || "";
              }
            };
          } else if (item.column_name === SHIP_MODE_COLUMN) {
            item.cellStyle = (params) => {
              return params.node.data.isShipModeEdited
                ? { backgroundColor: "#0055af36" }
                : { backgroundColor: "inherit" };
            };
            item.cellRenderer = (params, extraProps) => {
              if (params.node.level === 0) {
                if (
                  !isEmpty(props?.userAccess)
                    ? !isInlineEdit
                    : isUserHasViewOnlyAccess
                )
                  item.disabled = true;
                return (
                  <CellRenderers
                    cellData={params}
                    column={item}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                return params.node.data.ship_mode || "";
              }
            };
          } else if (item.column_name === SIZE_COLUMN) {
            item.cellRenderer = (params, extraProps) => {
              const cellValue = params?.value || params?.data?.size_column;
              const isPackEnabled = params?.data?.is_pack_enabled;

              if (isPackEnabled && cellValue == "View Pack Details") {
                return (
                  <Button
                    variant="url"
                    onClick={() => sizeColumnClickHandler(params)}
                  >
                    {cellValue}
                  </Button>
                );
              }

              return cellValue || "";
            };
          }
        }

        return item;
      });

      return updatedColumnsDef;
    } catch (err) {
      displaySnackMessages("Something went wrong", "error");
      return [];
    }
  };

  // Table Configuration - Fetch when filters are valid
  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setCreateNewOrderTableConfigLoader(true);
      try {
        let columns = await props.getOmsCreateNewOrderVendorStoreTableConfiguration();
        let columnsData = columns?.data?.data;

        let updatedColumns = columnsData.map((col) => {
          if (col.type === "DateTimeField")
            col.formatter = props.tenantDateFormat;
          return col;
        });

        let formattedColumns = agGridColumnFormatter(
          updatedColumns,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );

        let cols = formattedColumns.map((col) => {
          switch (col.accessor) {
            case NOT_BEFORE_AFTER_DATE_COLUMN:
              col.withPortal = true;
              col.showClearDates = false;
              col.anyDayOfWeekAllowed = true;
              col.maxOneWeekSelection = false;
              col.keepOpenOnDateSelect = false;
              col.removeWeekNumber = true;
              const ropCalendarConfig = JSON.parse(
                JSON.stringify(OMS_RECEIPT_DATE_MULTI_WEEK)
              );
              col.options = ropCalendarConfig;
              col.fiscalCalendarData = props.fiscalCalendarDetails;
            default:
              return col;
          }
        });

        setSelectedOrders([]);
        let updatedCols = checkForEditability(cols);
        setTableColumns(updatedCols);
        props.setCreateNewOrderTableConfigLoader(false);
        setSelectedSku(props.selectedCreateNewOrderSku);
        setRenderAgGrid(true);
        setRender(true);
      } catch (error) {
        props.setCreateNewOrderTableConfigLoader(false);
        displaySnackMessages(
          "Error while fetching table configuration for Vendor Store",
          "error"
        );
      }
    };

    if (
      props?.fiscalCalendarDetails?.length > 0 &&
      isUserHasViewOnlyAccess !== null
    ) {
      fetchColumnConfig();
    } else {
      props.setCreateNewOrderTableConfigLoader(true);
    }
  }, [
    props.selectedFilters,
    props.fiscalCalendarDetails,
    isUserHasViewOnlyAccess,
  ]);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      setRenderAgGrid(false);
    }
  }, [props.selectedFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    if (params?.api?.isSelectAllRecords && params.api.getPageDataFromCache) {
      const limit = 10; // Same as used in the API call
      const startRow = pageIndex * limit;
      const endRow = startRow + limit;

      const cachedData = params.api.getPageDataFromCache(
        startRow,
        endRow,
        manualbody?.sort
      );

      if (cachedData) {
        return {
          data: cachedData,
          totalCount: params.api.allRecordsTotal,
        };
      }
    }

    try {
      props.setCreateNewOrderTableDataLoader(true);
      if (props.isRedirectedFromDifferentPage) {
        var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
        skuFilter.values = [...selectedSku];
      }

      let createNewOrderFilterArray = [];
      props.selectedFilters.forEach((filter) => {
        if (filter?.values?.length > 0) {
          createNewOrderFilterArray.push(filter);
        }
      });

      let body = {
        filters: props.isRedirectedFromDifferentPage
          ? uniqBy([...redirectedFilterDependency], "attribute_name")
          : [...createNewOrderFilterArray],
        ...props.startEndDate,
        meta: manualbody
          ? {
              ...manualbody,
              limit: { limit: 10, page: pageIndex + 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
      };
      let response = await props.getOmsCreateNewOrderStoreTableData(body);
      if (response.data.status) {
        let formatedData = agGridRowFormatter(
          response.data.data,
          params?.api?.checkConfiguration,
          uniqueRowId
        );

        createNewOrderVendorStoreTableCount.current = response.data.total;

        formatedData.forEach((val) => {
          let quantity = 0;
          let cost = 0;
          val.status_obj.forEach((obj) => {
            if (isNil(obj[ORDER_QUANTITY_COLUMN])) {
              obj[ORDER_QUANTITY_COLUMN] = 0;
            }
            if (isNil(obj[ORDER_COST_COLUMN])) {
              obj[ORDER_COST_COLUMN] = 0;
            }
            quantity += isNaN(obj[ORDER_QUANTITY_COLUMN])
              ? 0
              : obj[ORDER_QUANTITY_COLUMN];
            cost += isNaN(obj[ORDER_COST_COLUMN]) ? 0 : obj[ORDER_COST_COLUMN];
          });
          val[ORDER_QUANTITY_COLUMN] = Number(quantity) || 0;
          val[ORDER_COST_COLUMN] = Number(cost) || 0;

          // Calculate order_quantity_eaches if pack ordering is enabled and column exists
          if (
            props.isPackOrderingEnabled &&
            val.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
          ) {
            // Also update for child items if grouping is enabled
            if (isCreateNewOrderTableGrouping) {
              val.status_obj.forEach((item) => {
                const itemPackConfig = item.pack_config || 1; // Use item's pack_config or default to 1
                item[ORDER_QUANTITY_EACHES_COLUMN] =
                  (item[ORDER_QUANTITY_COLUMN] || 0) * itemPackConfig;
              });
              // Calculate parent node value as sum of all children
              val[ORDER_QUANTITY_EACHES_COLUMN] = val.status_obj.reduce(
                (acc, item) => acc + (item[ORDER_QUANTITY_EACHES_COLUMN] || 0),
                0
              );
            } else {
              // When grouping is disabled, calculate directly
              const packConfig = val.pack_config || 1; // Default to 1 if pack_config is null
              val[ORDER_QUANTITY_EACHES_COLUMN] =
                val[ORDER_QUANTITY_COLUMN] * packConfig;
            }
          }

          // Calculate order_retail if pack ordering is enabled and column exists in grid
          if (props.isPackOrderingEnabled && isOrderRetailColumnPresent()) {
            if (isCreateNewOrderTableGrouping && val.status_obj) {
              val[ORDER_RETAIL_COLUMN] = val.status_obj.reduce(
                (acc, item) => acc + (item[ORDER_RETAIL_COLUMN] || 0),
                0
              );
              val.status_obj.forEach((item) => {
                item[ORDER_RETAIL_COLUMN] =
                  (item[ORDER_QUANTITY_COLUMN] || 0) * (item.price || 0);
              });
            } else {
              val[ORDER_RETAIL_COLUMN] =
                (val[ORDER_QUANTITY_COLUMN] || 0) * (val.price || 0);
            }
          }

          // Calculate order_quantity_eaches if pack ordering is enabled
          if (props.isPackOrderingEnabled) {
            // Also update for child items if grouping is enabled
            if (isCreateNewOrderTableGrouping) {
              val.status_obj.forEach((item) => {
                const itemPackConfig = item.pack_config || 1; // Use item's pack_config or default to 1
                item[ORDER_QUANTITY_EACHES_COLUMN] =
                  (item[ORDER_QUANTITY_COLUMN] || 0) * itemPackConfig;
              });
              // Calculate parent node value as sum of all children
              val[ORDER_QUANTITY_EACHES_COLUMN] = val.status_obj.reduce(
                (acc, item) => acc + (item[ORDER_QUANTITY_EACHES_COLUMN] || 0),
                0
              );
            } else {
              // When grouping is disabled, calculate directly
              const packConfig = val.pack_config || 1; // Default to 1 if pack_config is null
              val[ORDER_QUANTITY_EACHES_COLUMN] =
                val[ORDER_QUANTITY_COLUMN] * packConfig;
            }
          }

          if (val.hasOwnProperty(NOT_BEFORE_AFTER_DATE_COLUMN)) {
            val[NOT_BEFORE_AFTER_DATE_COLUMN] = {
              fiscalInfoStartDate: val.editable_not_before_date,
              fiscalInfoEndDate: val.editable_not_after_date,
            };
          }
          if (val.hasOwnProperty(EXPECTED_RECEIPT_DATE_COLUMN_STORE)) {
            val[EXPECTED_RECEIPT_DATE_COLUMN_STORE] = val.lead_time
              ? moment().add(val.lead_time, "days").format(DATE_FORMAT)
              : "";
            if (isCreateNewOrderTableGrouping) {
              val.status_obj.forEach((item) => {
                item.editable_expected_receipt_date =
                  val[EXPECTED_RECEIPT_DATE_COLUMN_STORE];
                item[ORDER_REASON_COLUMN] = val[ORDER_REASON_COLUMN];
                item[SHIP_MODE_COLUMN] = val[SHIP_MODE_COLUMN];
              });
            }
          }
        });

        props.setCreateNewOrderTableDataLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setCreateNewOrderTableDataLoader(false);
        return defaultTableData;
      }
    } catch {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setCreateNewOrderTableDataLoader(false);
      return defaultTableData;
    }
  };

  // Function to synchronize data changes across all data sources
  const synchronizeDataChanges = (changedRecords, isFromSelectAll = false) => {
    const gridApi = createNewOrderVendorStoreTableGridInstance.current.api;

    if (!changedRecords || changedRecords.length === 0) {
      return;
    }

    // Update each changed record in all data sources
    changedRecords.forEach((changedRecord) => {
      const id = changedRecord[uniqueRowId];

      // 1. Update visible nodes in the grid
      gridApi.forEachNode((node) => {
        if (node.data && node.data[uniqueRowId] === id) {
          node.setData({ ...node.data, ...changedRecord });
        }
      });

      // 2. Update cached allRecordsData (for pagination)
      if (gridApi.allRecordsData && gridApi.isSelectAllRecords) {
        const index = gridApi.allRecordsData.findIndex(
          (item) => item[uniqueRowId] === id
        );
        if (index !== -1) {
          gridApi.allRecordsData[index] = {
            ...gridApi.allRecordsData[index],
            ...changedRecord,
          };
        }
      }

      // 3. Update React state (for other components)
      setSelectedOrders((prev) => {
        const updatedOrders = [...prev];
        const stateIndex = updatedOrders.findIndex(
          (item) => item[uniqueRowId] === id
        );
        if (stateIndex !== -1) {
          updatedOrders[stateIndex] = {
            ...updatedOrders[stateIndex],
            ...changedRecord,
          };
        }
        return updatedOrders;
      });
    });

    if (isFromSelectAll) {
      createNewOrderVendorStoreTableGridInstance.current.api.refreshServerSideStore(
        {
          purge: true,
        }
      );
    } else {
      createNewOrderVendorStoreTableGridInstance.current.api.redrawRows({
        rowNodes: changedRecords,
      });
    }
  };

  const loadTableInstance = (instance) => {
    createNewOrderVendorStoreTableGridInstance.current = instance;
    // Expose synchronizeDataChanges on the grid instance for use by other components
    createNewOrderVendorStoreTableGridInstance.current.synchronizeDataChanges = synchronizeDataChanges;
  };

  // New function to handle row selection for vendor store
  const onSelectionChanged = async (event) => {
    try {
      const gridApi = createNewOrderVendorStoreTableGridInstance.current.api;
      const selectAllSelected = event.api.isSelectAllRecords;

      // Set the isSelectAllRecords flag on the gridApi early to ensure consistent state
      gridApi.isSelectAllRecords = selectAllSelected;

      // Handle case when "Select All" is first selected
      if (selectAllSelected && !gridApi.allRecordsLoaded) {
        // Show loading indicator
        props.setCreateNewOrderTableDataLoader(true);

        // Prepare filters for the API call
        let createNewOrderFilterArray = [];
        props.selectedFilters.forEach((filter) => {
          if (filter?.values?.length > 0) {
            createNewOrderFilterArray.push(filter);
          }
        });

        // Create the request body
        let body = {
          filters: props.isRedirectedFromDifferentPage
            ? uniqBy(
                [
                  ...createNewOrderFilterArray,
                  ...props.createNewOrderFilterDependency,
                ],
                "attribute_name"
              )
            : [...createNewOrderFilterArray],
          ...props.startEndDate,
          meta: {
            limit: {
              // Request all records
              limit: createNewOrderVendorStoreTableCount.current,
              page: 1,
            },
          },
        };

        // Fetch all records
        const response = await props.getOmsCreateNewOrderStoreTableData(body);

        if (response?.data?.status) {
          // Mark that we've loaded all records to prevent unnecessary refetching
          gridApi.allRecordsLoaded = true;

          // Format the data the same way manualCallBack does
          let formatedData = agGridRowFormatter(
            response.data.data,
            gridApi.checkConfiguration,
            uniqueRowId
          );

          formatedData.forEach((val) => {
            let quantity = 0;
            let cost = 0;
            val.status_obj.forEach((obj) => {
              if (isNil(obj[ORDER_QUANTITY_COLUMN])) {
                obj[ORDER_QUANTITY_COLUMN] = 0;
              }
              if (isNil(obj[ORDER_COST_COLUMN])) {
                obj[ORDER_COST_COLUMN] = 0;
              }
              quantity += isNaN(obj[ORDER_QUANTITY_COLUMN])
                ? 0
                : obj[ORDER_QUANTITY_COLUMN];
              cost += isNaN(obj[ORDER_COST_COLUMN])
                ? 0
                : obj[ORDER_COST_COLUMN];
            });
            val[ORDER_QUANTITY_COLUMN] = Number(quantity) || 0;
            val[ORDER_COST_COLUMN] = Number(cost) || 0;
            if (val.hasOwnProperty(NOT_BEFORE_AFTER_DATE_COLUMN)) {
              val[NOT_BEFORE_AFTER_DATE_COLUMN] = {
                fiscalInfoStartDate: val.editable_not_before_date,
                fiscalInfoEndDate: val.editable_not_after_date,
              };
            }
            if (val.hasOwnProperty(EXPECTED_RECEIPT_DATE_COLUMN_STORE)) {
              val[EXPECTED_RECEIPT_DATE_COLUMN_STORE] = val.lead_time
                ? moment().add(val.lead_time, "days").format(DATE_FORMAT)
                : "";
              if (isCreateNewOrderTableGrouping) {
                val.status_obj.forEach((item) => {
                  item.expected_receipt_date =
                    val[EXPECTED_RECEIPT_DATE_COLUMN_STORE];
                  item[ORDER_REASON_COLUMN] = val[ORDER_REASON_COLUMN];
                  item[SHIP_MODE_COLUMN] = val[SHIP_MODE_COLUMN];
                });
              }
            }
          });

          // Store the full dataset for reference
          gridApi.allRecordsData = formatedData;
          gridApi.allRecordsTotal = response.data.total;

          // Add helper method for getting page data without API call
          gridApi.getPageDataFromCache = function (
            startRow,
            endRow,
            sortModel
          ) {
            if (this.isSelectAllRecords && this.allRecordsData) {
              let data = [...this.allRecordsData];

              // Apply sorting if needed
              if (sortModel && sortModel.length > 0) {
                const sort = sortModel[0];
                data.sort((a, b) => {
                  let valueA = a[sort.colId];
                  let valueB = b[sort.colId];

                  // Handle nulls/undefined
                  if (valueA == null && valueB == null) return 0;
                  if (valueA == null) return -1;
                  if (valueB == null) return 1;

                  // Handle numbers
                  if (
                    typeof valueA === "number" &&
                    typeof valueB === "number"
                  ) {
                    return sort.sort === "asc"
                      ? valueA - valueB
                      : valueB - valueA;
                  }

                  // Handle strings
                  return sort.sort === "asc"
                    ? String(valueA).localeCompare(String(valueB))
                    : String(valueB).localeCompare(String(valueA));
                });
              }

              // Return requested page
              return data.slice(startRow, endRow);
            }
            return null; // Indicate we can't fulfill from cache
          };

          // Important: Override getSelectedNodes to support SetAllPopUp component
          // Always save a reference to the original method
          if (!gridApi._originalGetSelectedNodes) {
            gridApi._originalGetSelectedNodes = gridApi.getSelectedNodes;
          }

          // Create a more robust implementation
          gridApi.getSelectedNodes = function () {
            // Using function() to ensure 'this' refers to the gridApi
            // If "Select All" is active and we have all data loaded
            if (
              this.isSelectAllRecords === true &&
              this.allRecordsData &&
              this.allRecordsData.length > 0
            ) {
              // Create fully compatible fake nodes that the popup can safely use
              // Based on examining CreateNewOrderSetAllPopUp.jsx
              return this.allRecordsData.map((rowData) => {
                // Create a comprehensive node object
                return {
                  // Core data
                  data: rowData,
                  displayed: true,
                  selected: true,
                  childIndex: -1,
                  rowIndex: -1,
                  id: rowData[uniqueRowId] || rowData.id,
                  rowHeight: 48,

                  // Required node methods
                  setDataValue: function (field, value) {
                    this.data[field] = value;
                    return true;
                  },
                  setData: function (data) {
                    this.data = { ...this.data, ...data };
                    return true;
                  },
                  selectThisNode: function (select) {
                    this.selected = select;
                    return true;
                  },
                  isSelected: function () {
                    return true;
                  },

                  // Group-related properties that SetAllPopUp might need
                  group: rowData.status_obj,

                  // Additional safety methods
                  addEventListener: function () {
                    return null;
                  },
                  removeEventListener: function () {
                    return null;
                  },

                  __isVirtualNode: true,
                  __fromSelectAll: true,
                };
              });
            }
            // Otherwise use original implementation
            return this._originalGetSelectedNodes.apply(this, arguments);
          };

          // Update UI state to reflect selection
          const selectedRows = [...formatedData]; // All rows are selected
          const selectedSkuIds = formatedData.map((row) => row[uniqueRowId]);

          setSelectedOrders(selectedRows);
          setSelectedOrderIds(selectedSkuIds);

          // Hide loading indicator
          props.setCreateNewOrderTableDataLoader(false);

          // Select visible rows for UI feedback
          // Using forEachNode instead of selectAllFiltered because that's not available with serverSide row model
          setTimeout(() => {
            gridApi.forEachNode((node) => {
              if (node.displayed) {
                node.setSelected(true);
              }
            });
          }, 200);
        }
      }

      // Handle selection state update differently based on whether "Select All" is active
      if (selectAllSelected) {
        // For any subsequent "Select All" selections after the data is already loaded
        if (gridApi.allRecordsLoaded && gridApi.isSelectAllRecords) {
          // Ensure we have the original getSelectedNodes preserved
          if (!gridApi._originalGetSelectedNodes) {
            gridApi._originalGetSelectedNodes = gridApi.getSelectedNodes;

            // Reapply our custom getSelectedNodes implementation
            gridApi.getSelectedNodes = function () {
              // Using function() to ensure 'this' refers to the gridApi
              if (
                this.isSelectAllRecords === true &&
                this.allRecordsData &&
                this.allRecordsData.length > 0
              ) {
                return this.allRecordsData.map((rowData) => {
                  return {
                    data: rowData,
                    displayed: true,
                    selected: true,
                    childIndex: -1,
                    rowIndex: -1,
                    id: rowData[uniqueRowId] || rowData.id,
                    rowHeight: 48,
                    setDataValue: function (field, value) {
                      this.data[field] = value;
                      return true;
                    },
                    setData: function (data) {
                      this.data = { ...this.data, ...data };
                      return true;
                    },
                    selectThisNode: function (select) {
                      this.selected = select;
                      return true;
                    },
                    isSelected: function () {
                      return true;
                    },
                    group: rowData.status_obj,
                    addEventListener: function () {
                      return null;
                    },
                    removeEventListener: function () {
                      return null;
                    },
                    __isVirtualNode: true,
                    __fromSelectAll: true,
                  };
                });
              }
              return this._originalGetSelectedNodes.apply(this, arguments);
            };
          }

          // Update UI state to reflect selection
          const selectedRows = [...gridApi.allRecordsData];
          const selectedSkuIds = selectedRows.map((row) => row[uniqueRowId]);
          setSelectedOrders(selectedRows);
          setSelectedOrderIds(selectedSkuIds);

          // Select visible rows for UI feedback
          setTimeout(() => {
            gridApi.forEachNode((node) => {
              if (node.displayed) {
                node.setSelected(true);
              }
            });
          }, 200);

          return; // We've handled the re-selection, no need to continue to the regular selection logic
        }
      } else {
        // For regular selection (or deselection of "Select All")
        let selectedRows = [];
        let selectedSkuIds = [];

        // Check if "Select All" was just deselected
        const wasSelectAllJustTurnedOff =
          !selectAllSelected && gridApi.isSelectAllRecords === true;

        // Update the grid's state to track that Select All is now off
        gridApi.isSelectAllRecords = selectAllSelected;

        if (wasSelectAllJustTurnedOff) {
          // Don't remove the override completely - it might still be needed for subsequent "Select All" operations
          // But we'll keep the reference in place so that normal selection still works

          // We must explicitly update the selection state since deselecting "Select All"
          // means we want no rows selected (not just visible rows)
          setSelectedOrders([]);
          setSelectedOrderIds([]);

          // We're done, no need to collect any nodes as we know they should all be deselected
          return;
        }

        // For normal selection changes, collect all currently visible selected rows
        gridApi.forEachNode((node) => {
          if (node.selected && node.data) {
            selectedRows.push({ ...node.data });
            selectedSkuIds.push(node.data[uniqueRowId]);
          }
        });

        // Update selection states
        setSelectedOrders(selectedRows);
        setSelectedOrderIds(selectedSkuIds);
      }
    } catch (error) {
      console.error("Error in selection changed handler:", error);
      props.addSnack({
        message: "Error fetching all records",
        variant: "error",
      });
      props.setCreateNewOrderTableDataLoader(false);
    }
  };

  const openSetAllPopUp = () => {
    // Make sure we have the most current selection when opening the popup
    if (createNewOrderVendorStoreTableGridInstance?.current?.api) {
      // Reset the flag in case we closed the popup previously
      let gridApi = createNewOrderVendorStoreTableGridInstance.current.api;

      // Ensure we have a valid getSelectedNodes function
      if (gridApi.isSelectAllRecords && !gridApi._originalGetSelectedNodes) {
        // We lost the reference somehow, let's recreate the override
        const originalGetSelectedNodes = gridApi.getSelectedNodes;
        gridApi._originalGetSelectedNodes = originalGetSelectedNodes;
      }
    }
    setOpenPopUp(true);
  };

  const processCellForClipboard = useCallback((params) => {
    let l_cellValue = cloneDeep(params.value);
    if (
      typeof l_cellValue === "object" &&
      !Array.isArray(l_cellValue) &&
      l_cellValue !== null
    ) {
      return `${l_cellValue.fiscalInfoStartDate} - ${l_cellValue.fiscalInfoEndDate}`;
    }
    return l_cellValue;
  }, []);

  const isOrderRetailColumnPresent = () =>
    tableColumns.some((col) => col.accessor === ORDER_RETAIL_COLUMN);

  const onBlur = (_e, data, column, isChanged, value, _initialValue) => {
    const node = createNewOrderVendorStoreTableGridInstance.current.api.getRowNode(
      data.unique_row_id
    );
    if (isChanged) {
      let isOrderQtyValid = true;

      if (column.colId === "order_quantity") {
        if (value === "") {
          let validatedInputValue = parseInt(data?.min_order_quantity_sku);
          displaySnackMessages(EMPTY_ORDER_QTY, "info");
          if (isCreateNewOrderTableGrouping) {
            node.data.status_obj.forEach((item) => {
              if (data.size === item?.size) {
                item.order_quantity = validatedInputValue;
                item.order_cost = data.cost * validatedInputValue;
                // Calculate order_quantity_eaches if pack ordering is enabled
                if (
                  props.isPackOrderingEnabled &&
                  item.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
                ) {
                  const packConfig = item.pack_config || 1;
                  item[ORDER_QUANTITY_EACHES_COLUMN] =
                    validatedInputValue * packConfig;
                }
                // Calculate order_retail if pack ordering is enabled and column exists in grid
                if (
                  props.isPackOrderingEnabled &&
                  isOrderRetailColumnPresent()
                ) {
                  item[ORDER_RETAIL_COLUMN] =
                    (item.order_quantity || 0) * (item.price || 0);
                }
              }
            });
            node.data.order_cost = node.group.reduce(
              (acc, val) => (acc += Number(val.order_cost || 0)),
              0
            );
            // Calculate order_quantity_eaches for parent node if pack ordering is enabled
            if (
              props.isPackOrderingEnabled &&
              node.data.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
            ) {
              node.data[ORDER_QUANTITY_EACHES_COLUMN] = node.data.status_obj
                ? node.data.status_obj.reduce(
                    (acc, item) =>
                      acc + (item[ORDER_QUANTITY_EACHES_COLUMN] || 0),
                    0
                  )
                : 0;
            }
            // order_retail for parent node as sum of children if pack ordering is enabled and column exists in grid
            if (props.isPackOrderingEnabled && isOrderRetailColumnPresent()) {
              node.data[ORDER_RETAIL_COLUMN] = node.data.status_obj
                ? node.data.status_obj.reduce(
                    (acc, item) => acc + (item[ORDER_RETAIL_COLUMN] || 0),
                    0
                  )
                : (node.data.order_quantity || 0) * (node.data.price || 0);
            }
          } else {
            node.data.order_quantity = validatedInputValue;
            // Calculate order_quantity_eaches if pack ordering is enabled
            if (
              props.isPackOrderingEnabled &&
              node.data.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
            ) {
              const packConfig = node.data.pack_config || 1;
              node.data[ORDER_QUANTITY_EACHES_COLUMN] =
                validatedInputValue * packConfig;
            }
            // Calculate order_cost if pack ordering is enabled
            if (
              props.isPackOrderingEnabled &&
              node.data.hasOwnProperty(ORDER_COST_COLUMN)
            ) {
              node.data.order_cost =
                node.data.order_quantity_eaches * data.cost;
            } else {
              node.data.order_cost = data.cost * validatedInputValue;
            }
            // order_retail if pack ordering is enabled and column exists in grid
            if (props.isPackOrderingEnabled && isOrderRetailColumnPresent()) {
              node.data[ORDER_RETAIL_COLUMN] =
                (node.data.order_quantity_eaches || 0) * (node.data.price || 0);
            }
          }
        } else {
          let validatedInputValue = parseInt(value);
          if (data?.order_quantity) {
            let correctedValue = 0;

            if (isOrderQtyValid && !props.isPackOrderingEnabled) {
              if (
                parseInt(data?.order_quantity) %
                  parseInt(data?.order_multiple) !==
                0
              ) {
                isOrderQtyValid = false;
                correctedValue = data?.order_quantity;
                displaySnackMessages(INVALID_ORDER_QTY_PACKSIZE, "info");
              }
              if (
                parseInt(data?.order_quantity) <
                parseInt(data?.min_order_quantity_sku)
              ) {
                isOrderQtyValid = false;
                correctedValue = data?.min_order_quantity_sku;
                displaySnackMessages(INVALID_ORDER_QTY, "info");
              }
              if (
                parseInt(data?.order_quantity) >
                parseInt(data?.max_order_quantity)
              ) {
                isOrderQtyValid = false;
                correctedValue = data?.max_order_quantity;
                displaySnackMessages(INVALID_ORDER_QTY, "info");
              }
            }

            if (isOrderQtyValid) {
              validatedInputValue = parseInt(value);
            } else {
              var reminder =
                parseInt(data?.order_quantity) % parseInt(data?.order_multiple);
              if (reminder >= data?.order_multiple / 2) {
                validatedInputValue = parseInt(
                  Math.ceil(correctedValue / data?.order_multiple) *
                    data?.order_multiple
                );
              } else {
                validatedInputValue = parseInt(
                  Math.floor(correctedValue / data?.order_multiple) *
                    data?.order_multiple
                );
                if (validatedInputValue < data?.min_order_quantity_sku) {
                  validatedInputValue = parseInt(
                    Math.ceil(correctedValue / data?.order_multiple) *
                      data?.order_multiple
                  );
                }
              }
            }
          }
          if (isCreateNewOrderTableGrouping) {
            node.data.status_obj.forEach((item) => {
              if (data.size === item?.size) {
                item.order_quantity = validatedInputValue;
                // Calculate order_quantity_eaches if pack ordering is enabled
                if (
                  props.isPackOrderingEnabled &&
                  item.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
                ) {
                  const packConfig = item.pack_config || 1;
                  item[ORDER_QUANTITY_EACHES_COLUMN] =
                    validatedInputValue * packConfig;
                }
                // Calculate order_cost if pack ordering is enabled
                if (
                  props.isPackOrderingEnabled &&
                  item.hasOwnProperty(ORDER_COST_COLUMN)
                ) {
                  item.order_cost = item.order_quantity_eaches * data.cost;
                } else {
                  item.order_cost = data.cost * validatedInputValue;
                }
                // order_retail if pack ordering is enabled and column exists in grid
                if (
                  props.isPackOrderingEnabled &&
                  isOrderRetailColumnPresent()
                ) {
                  item[ORDER_RETAIL_COLUMN] =
                    (item.order_quantity_eaches || 0) * (item.price || 0);
                }
              }
            });
            node.data.order_cost = node.group.reduce(
              (acc, val) => (acc += Number(val.order_cost || 0)),
              0
            );
            // Calculate order_quantity_eaches for parent node if pack ordering is enabled
            if (
              props.isPackOrderingEnabled &&
              node.data.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
            ) {
              node.data[ORDER_QUANTITY_EACHES_COLUMN] = node.data.status_obj
                ? node.data.status_obj.reduce(
                    (acc, item) =>
                      acc + (item[ORDER_QUANTITY_EACHES_COLUMN] || 0),
                    0
                  )
                : 0;
            }
            // order_retail for parent node as sum of children if pack ordering is enabled and column exists in grid
            if (props.isPackOrderingEnabled && isOrderRetailColumnPresent()) {
              node.data[ORDER_RETAIL_COLUMN] = node.data.status_obj
                ? node.data.status_obj.reduce(
                    (acc, item) => acc + (item[ORDER_RETAIL_COLUMN] || 0),
                    0
                  )
                : (node.data.order_quantity || 0) * (node.data.price || 0);
            }
          } else {
            node.data.order_quantity = validatedInputValue;
            // Calculate order_quantity_eaches if pack ordering is enabled
            if (
              props.isPackOrderingEnabled &&
              node.data.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
            ) {
              const packConfig = node.data.pack_config || 1;
              node.data[ORDER_QUANTITY_EACHES_COLUMN] =
                validatedInputValue * packConfig;
            }
            // Calculate order_cost if pack ordering is enabled
            if (
              props.isPackOrderingEnabled &&
              node.data.hasOwnProperty(ORDER_COST_COLUMN)
            ) {
              node.data.order_cost =
                node.data.order_quantity_eaches * data.cost;
            } else {
              node.data.order_cost = data.cost * validatedInputValue;
            }
            // Calculate order_retail if pack ordering is enabled and column exists in grid
            if (props.isPackOrderingEnabled && isOrderRetailColumnPresent()) {
              node.data[ORDER_RETAIL_COLUMN] =
                (node.data.order_quantity_eaches || 0) * (node.data.price || 0);
            }
          }
        }
        createNewOrderVendorStoreTableGridInstance.current.api.forEachNode(
          (node) => {
            if (node.data.unique_row_id === data.unique_row_id) {
              if (!node.data.size || node.data.size === data.size) {
                node.data.isEdited = true;
                const columnsToRefresh = ["order_quantity", "order_cost"];
                // Add order_quantity_eaches to refresh if pack ordering is enabled and column exists
                if (
                  props.isPackOrderingEnabled &&
                  node.data.hasOwnProperty(ORDER_QUANTITY_EACHES_COLUMN)
                ) {
                  columnsToRefresh.push(ORDER_QUANTITY_EACHES_COLUMN);
                }
                // Add order_retail to refresh if pack ordering is enabled and column exists in grid
                if (
                  props.isPackOrderingEnabled &&
                  isOrderRetailColumnPresent()
                ) {
                  columnsToRefresh.push(ORDER_RETAIL_COLUMN);
                }
                createNewOrderVendorStoreTableGridInstance.current.api.refreshCells(
                  {
                    force: true,
                    suppressFlash: false,
                    rowNodes: [node],
                    columns: columnsToRefresh,
                  }
                );
              }
            }
          }
        );
      }
    }
  };

  const onCellFocused = (_e) => {
    let selectedCol = _e.column.colId;
    let selectedVal = null;
    let selectedRowIndex = _e.rowIndex;
    createNewOrderVendorStoreTableGridInstance.current.api.forEachNode(
      (node, index) => {
        if (index === selectedRowIndex) {
          selectedVal = node.data[selectedCol];
          focusedTableCellValue.current = selectedVal;
        }
      }
    );
  };

  const onCellValueChanged = (params) => {
    try {
      const { colDef, node } = params;
      if (colDef.column_name === NOT_BEFORE_AFTER_DATE_COLUMN) {
        let isValueError = false;
        let columnValue = node?.data?.[NOT_BEFORE_AFTER_DATE_COLUMN];
        let notBeforeDate = moment(columnValue.fiscalInfoStartDate).format(
          DATE_FORMAT
        );
        let notAfterDate = moment(columnValue.fiscalInfoEndDate).format(
          DATE_FORMAT
        );
        let orderPlacementDate = moment(
          node?.data?.[ORDER_PLACEMENT_DATE_COLUMN]
        ).format(DATE_FORMAT);

        //Valid [Not Before Date] Value must be between than [Order Placement Date] and [Not After Date]
        //Valid [Not After Date] Value must be greater than [Not Before Date] and [Order Placement Date]

        if (notBeforeDate !== INVALID_DATE && notAfterDate !== INVALID_DATE) {
          node.data.isDateEdited = true;

          if (
            moment(notBeforeDate).isAfter(orderPlacementDate) &&
            moment(notAfterDate).isAfter(orderPlacementDate)
          ) {
            isValueError = false;
          } else {
            isValueError = true;
          }
        }

        if (isValueError)
          displaySnackMessages(NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE, "error");

        params.api.refreshCells({
          force: true,
          suppressFlash: false,
          columns: [NOT_BEFORE_AFTER_DATE_COLUMN],
          rowNodes: [node],
        });
      }

      if (colDef.column_name === EXPECTED_RECEIPT_DATE_COLUMN_STORE) {
        let isValueError = false;
        let columnValue = node?.data?.[EXPECTED_RECEIPT_DATE_COLUMN_STORE];
        let selectedDate = moment(columnValue).format(DATE_FORMAT);
        let orderPlacementDate = moment(
          node?.data?.[ORDER_PLACEMENT_DATE_COLUMN]
        ).format(DATE_FORMAT);

        //Valid [Not Before Date] Value must be between than [Order Placement Date] and [Not After Date]
        //Valid [Not After Date] Value must be greater than [Not Before Date] and [Order Placement Date]

        if (selectedDate !== INVALID_DATE) {
          node.data.isDateEdited = true;

          if (
            moment(selectedDate, DATE_FORMAT).isAfter(
              moment(orderPlacementDate, DATE_FORMAT)
            )
          ) {
            isValueError = false;
          } else {
            isValueError = true;
          }
        }

        if (isValueError) {
          node.data.isNotValid = true;
          displaySnackMessages(INVALID_RECEIPT_DATE, "error");
        }

        if (isCreateNewOrderTableGrouping && !isValueError) {
          const calculatedDate = moment(columnValue, DATE_FORMAT).format(
            DATE_FORMAT
          );
          node.data.status_obj.forEach((item) => {
            item.isDateEdited = true;
            item.editable_expected_receipt_date = calculatedDate;
          });
          node.data.isNotValid = false;
        }

        params.api.forEachNode((currentNode) => {
          if (currentNode.data.unique_row_id === node.data.unique_row_id) {
            params.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [currentNode],
              columns: [EXPECTED_RECEIPT_DATE_COLUMN_STORE],
            });
          }
        });
      }

      if (colDef.column_name === ORDER_REASON_COLUMN) {
        const columnValue = node?.data?.[ORDER_REASON_COLUMN];
        node.data.isOrderReasonEdited = true;

        if (isCreateNewOrderTableGrouping) {
          node.data.order_reason = columnValue;
          node.data.status_obj.forEach((childItem) => {
            childItem.isOrderReasonEdited = true;
            childItem.order_reason = columnValue;
          });
        }

        params.api.forEachNode((currentNode) => {
          if (currentNode.data.unique_row_id === node.data.unique_row_id) {
            params.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [currentNode],
              columns: [ORDER_REASON_COLUMN],
            });
          }
        });
      }

      if (colDef.column_name === SHIP_MODE_COLUMN) {
        const columnValue = node?.data?.[SHIP_MODE_COLUMN];
        node.data.isShipModeEdited = true;

        if (isCreateNewOrderTableGrouping) {
          node.data.ship_mode = columnValue;
          node.data.status_obj.forEach((childItem) => {
            childItem.isShipModeEdited = true;
            childItem.ship_mode = columnValue;
          });
        }

        params.api.forEachNode((currentNode) => {
          if (currentNode.data.unique_row_id === node.data.unique_row_id) {
            params.api.refreshCells({
              force: true,
              suppressFlash: false,
              rowNodes: [currentNode],
              columns: [SHIP_MODE_COLUMN],
            });
          }
        });
      }
    } catch (error) {
      console.log("Error in onCellValueChanged", error);
    }
  };

  // Function to get top right options for vendor store table
  const getTopRightOptions = () => {
    let options = [];

    // Add Set All button when items are selected
    if (selectedOrders.length > 0) {
      // Determine if Set All button should be enabled
      const isSetAllDisabled = !isEmpty(props?.userAccess)
        ? !isUserHasSetAllAccess || selectedOrders.length === 0
        : isUserHasViewOnlyAccess || selectedOrders.length === 0;

      options.push(
        <Button
          variant="tertiary"
          color="primary"
          id="productSetAllBtn"
          onClick={openSetAllPopUp}
          disabled={isSetAllDisabled}
        >
          Set All
        </Button>
      );

      // Add Vendor Store Send Approval Button
      options.push(
        <VendorStoreSendApprovalButton
          refreshTableData={refreshTableData}
          selectedSkuCount={selectedOrders.length}
          agGridInstance={createNewOrderVendorStoreTableGridInstance.current}
          renderAgGrid={renderAgGrid}
          DATE_FORMAT={DATE_FORMAT}
        />
      );
    }

    return options;
  };

  return (
    <CoreComponentScreen
      headerBreadCrumb={props.headerBreadCrumb ? props.headerBreadCrumb : null}
      showPageRoute={false}
      showPageHeader={true}
      showFilterDashboard={true}
      contained={true}
      filterConfigKey={"CreateNewOrderFilterConfigurationVendorStore"}
      onApplyFilter={onFilterDashboardClick}
      filterDependency={filterDependency?.length ? filterDependency : null}
      disableFilters={isRedirectedFromDifferentPage}
      customDependencyValue={{}}
      preventFilterPreselection={isRedirectedFromDifferentPage}
      autoApplyEnabled={!isRedirectedFromDifferentPage}
    >
      {props.renderGroupOptions?.()}
      {customChipData?.length > 0 && isRedirectedFromDifferentPage && (
        <FilterChips
          filterConfig={customChipData}
          isDateLabelDerivedFromDimension={true}
        ></FilterChips>
      )}
      <Loader
        loader={
          pageLoader ||
          props.createNewOrderTableConfigLoader ||
          props.createNewOrderTableDataLoader
        }
      >
        {isFiltersValid && (
          <div className={classNames(globalClasses.marginVertical1rem)}>
            {renderAgGrid && tableColumns.length > 0 && (
              <AgGridComponent
                columns={tableColumns}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                selectAllHeaderComponent={true}
                hideSelectAllRecords={false}
                onCellFocused={onCellFocused}
                onSelectionChanged={onSelectionChanged}
                onCellValueChanged={onCellValueChanged}
                onBlur={onBlur}
                loadTableInstance={loadTableInstance}
                rowSelection="multiple"
                rowModelType="serverSide"
                serverSideStoreType="partial"
                onRowSelected
                totalCount={props.createNewOrderVendorStoreTableData?.total}
                cacheBlockSize={10}
                uniqueRowId={uniqueRowId}
                pagination={true}
                suppressClickEdit={true}
                processCellForClipboard={processCellForClipboard}
                hideChildSelection={true}
                showSetAll={false}
                purgeClosedRowNodes={true}
                suppressAggFuncInHeader={true}
                groupDisplayType={"custom"}
                treeData={true}
                childKey={"status_obj"}
                tableHeader={`Product Details`}
                topRightOptions={getTopRightOptions()}
                customDateFormatRequired={true}
              />
            )}
            {!renderAgGrid && (
              <div className={globalClasses.paddingAround}>
                <h3>Create New Order - Vendor Store</h3>
                <p>Loading table configuration...</p>
              </div>
            )}
          </div>
        )}
      </Loader>

      {/* Vendor Store Set All Popup */}
      {openPopUp && (
        <CreateNewOrderVendorStoreSetAllPopUp
          setShowSetAllModal={(showModal) => {
            // When closing the popup, ensure we clean up properly
            if (!showModal) {
              // Reset any component-specific state that might be causing issues
              // but preserve the overall selection state
            }
            setOpenPopUp(showModal);
          }}
          rowsData={selectedOrders}
          agGridInstance={createNewOrderVendorStoreTableGridInstance.current}
          isCreateNewOrderTableGrouping={isCreateNewOrderTableGrouping}
          TENANT_DATE_FORMAT={DATE_FORMAT}
          VENDOR_STORE_SETALL_FIELDS={
            props?.vendorToStoreScreenConfig?.setall_formdata_fields
          }
        />
      )}

      {showSafetyStockGraph && (
        <SafetyStockGraphView
          setShowSetAllModal={setShowSafetyStockGraph}
          safetyStockGraphPayload={safetyStockGraphPayload}
        />
      )}

      {packConfigState.isOpen && (
        <PackConfigBottomSheet
          openPackConfigDetailSheet={packConfigState.isOpen}
          setOpenPackConfigDetailSheet={handlePackConfigClose}
          l1DisplayName={l1DisplayName}
          activeChildHierarchyKey={packConfigState.selectedArticle}
          screenName="create_new_order"
        />
      )}
    </CoreComponentScreen>
  );
};

const mapStateToProps = (store) => {
  return {
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    filterDashboardConfigurationVendorStore:
      store.filterReducer.filterDashboardConfiguration[
        "CreateNewOrderFilterConfigurationVendorStore"
      ],
    tenantDateFormat: store.tenantReducer.tenantDateFormat,
    selectedCreateNewOrderSku:
      store.omsReducer.createNewOrderService.selectedSku,
    createNewOrderFilterLoader:
      store.omsReducer.createNewOrderService.createNewOrderFilterLoader,
    createNewOrderFilterElements:
      store.omsReducer.createNewOrderService.createNewOrderFilterElements,
    createNewOrderFilterDependency:
      store.omsReducer.createNewOrderService.createNewOrderFilterDependency,
    isFiltersValid: store.omsReducer.createNewOrderService.isFiltersValid,
    selectedFilters: store.omsReducer.createNewOrderService.selectedFilters,
    createNewOrderTableConfigLoader:
      store.omsReducer.createNewOrderService.createNewOrderTableConfigLoader,
    createNewOrderTableDataLoader:
      store.omsReducer.createNewOrderService.createNewOrderTableDataLoader,
    createNewOrderVendorStoreTableData:
      store.omsReducer.createNewOrderService.createNewOrderTableData,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.create_new_order,
    orderingAccessControl:
      store.omsReducer.orderingCommonService.orderingAccessControl,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.create_new_order,
    isPackOrderingEnabled:
      store.omsReducer.orderingCommonService.orderingPackOrderConfig
        ?.pack_ordering,
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_store,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setCreateNewOrderFilterLoader: (payload) =>
    dispatch(setCreateNewOrderFilterLoader(payload)),
  setCreateNewOrderFilterElements: (payload) =>
    dispatch(setCreateNewOrderFilterElements(payload)),
  setCreateNewOrderFilterDependency: (payload) =>
    dispatch(setCreateNewOrderFilterDependency(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  resetCreateNewOrderState: () => dispatch(resetCreateNewOrderState()),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  getOmsCreateNewOrderVendorStoreTableConfiguration: (payload) =>
    dispatch(getOmsCreateNewOrderVendorStoreTableConfiguration(payload)),
  setCreateNewOrderTableConfigLoader: (payload) =>
    dispatch(setCreateNewOrderTableConfigLoader(payload)),
  getOmsCreateNewOrderStoreTableData: (payload) =>
    dispatch(getOmsCreateNewOrderStoreTableData(payload)),
  setCreateNewOrderTableDataLoader: (payload) =>
    dispatch(setCreateNewOrderTableDataLoader(payload)),
  editOmsCreateNewOrderTableData: (payload) =>
    dispatch(editOmsCreateNewOrderTableData(payload)),
  setCreateNewOrderTableDataEditSuccess: (payload) =>
    dispatch(setCreateNewOrderTableDataEditSuccess(payload)),
  setCreateNewOrderTableDataEditFailed: (payload) =>
    dispatch(setCreateNewOrderTableDataEditFailed(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(CreateNewOrderForVendorStore);
