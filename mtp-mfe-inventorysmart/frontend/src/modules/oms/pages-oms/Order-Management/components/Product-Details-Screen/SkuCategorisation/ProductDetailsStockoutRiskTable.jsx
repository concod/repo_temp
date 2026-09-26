import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { connect, useDispatch, useSelector } from "react-redux";
import { cloneDeep } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import Loader from "core/Utils/Loader/loader";
import { Badge, Button, Select } from "impact-ui-v3";
import ArrowForwardIosRounded from "@mui/icons-material/ArrowForwardIosRounded";
import { addSnack } from "core/actions/snackbarActions";
import NormalCalendarFiscalMapping from "core/commonComponents/calendar/normalCalendarFiscalMapping";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";
import ExpeditePoSummaryBottomSheet from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/components/Deep-Dive/ExpeditePoSummaryBottomSheet";
import {
  ERROR_MESSAGE,
  defaultTableData,
  tableConfigurationMetaData,
} from "modules/oms/constants-oms/stringConstants";
import {
  fetchExpediteOrdersAlertsDetailsTableConfig,
  fetchExpediteOrdersAlertsTableData,
  getExpediteOrdersConfig,
  setExpediteOrdersConfig,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import {
  applyAlertTopRightFiltersToPayload,
  normalizeAlertTableDropdownSelection,
  normalizeAlertTopRightOptions,
} from "modules/oms/pages-oms/Decision-Dashboard/Ordering-Alerts/utils/helper";
import { mergeOmsDcIntoFilters } from "modules/oms/utils-oms/oms-utility";
import { overrideExpediteArticleFilter } from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/constants";
import { addSelectedHierarchyToFilters } from "../Style-Order-Summary/utils";
import { SKU_CATEGORISATION_STOCKOUT_TABLE_TOP_RIGHT_OPTIONS } from "modules/oms/constants-oms/stringConstants";

const UNIQUE_ROW_ID = "unique_row_id";
const RECOVERY_WINDOW_COLUMN = "recovery_window";
const PACK_ID_COLUMN = "pack_id";
const EXPEDITE_ORDERS_ALERTS_DETAILS_TABLE_CONFIG_NAME =
  "expedite_orders_alerts_details";

const buildRecoveryWindowCellRenderer = (onViewGraphClick) => (params) => (
  <Button variant="url" onClick={(event) => onViewGraphClick(params, event)}>
    View Graph
  </Button>
);

const buildPackConfigCellRenderer = (onPackConfigClick) => (params) => {
  const cellValue = params?.value || params?.data?.view_pack_config;

  if (cellValue === "View Pack Config") {
    return (
      <Button variant="url" onClick={() => onPackConfigClick(params)}>
        {cellValue}
      </Button>
    );
  }

  return cellValue || "";
};

const buildStatusBadgesCellRenderer = () => (cellProps) => {
  const isResolved = cellProps?.data?.is_resolved;
  const isApproved = cellProps?.data?.is_approved;
  const isExpedited = cellProps?.data?.is_expedited;
  const value = cellProps?.value;
  const showStatusBadges = isResolved || isApproved || isExpedited;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 8,
      }}
    >
      {value}
      {showStatusBadges && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          {isResolved && (
            <Badge
              color="success"
              label="Reviewed"
              onClick={() => {}}
              size="default"
              variant="stroke"
            />
          )}
          {isApproved && (
            <Badge
              color="success"
              label="Approved"
              onClick={() => {}}
              size="default"
              variant="stroke"
            />
          )}
          {isExpedited && (
            <Badge
              color="success"
              label="Expedited"
              onClick={() => {}}
              size="default"
              variant="stroke"
            />
          )}
        </div>
      )}
    </div>
  );
};

const formatStockoutRiskTableColumns = (
  formattedColumns,
  onViewGraphClick,
  onPackConfigClick
) => {
  let isGrouping = false;
  let rowGroupingColumnIndex = 0;

  return formattedColumns.map((col, index) => {
    if (col?.extra?.is_grouping_key) {
      col.cellRenderer = "agGroupCellRenderer";
      isGrouping = true;
      rowGroupingColumnIndex = index;
    }

    col?.children?.map((child) => {
      if (child?.extra?.is_grouping_key) {
        child.cellRenderer = "agGroupCellRenderer";
      }
      if (child.column_name === PACK_ID_COLUMN) {
        child.cellRenderer = buildPackConfigCellRenderer(onPackConfigClick);
      }
      if (child.column_name === RECOVERY_WINDOW_COLUMN) {
        child.cellRenderer = buildRecoveryWindowCellRenderer(onViewGraphClick);
      }
      return child;
    });

    if (col.column_name === PACK_ID_COLUMN) {
      col.cellRenderer = buildPackConfigCellRenderer(onPackConfigClick);
    }
    if (col.column_name === RECOVERY_WINDOW_COLUMN) {
      col.cellRenderer = buildRecoveryWindowCellRenderer(onViewGraphClick);
    }


    const targetIndexForBadge = isGrouping
      ? rowGroupingColumnIndex === 0
        ? 1
        : 0
      : 0;
    if (index === targetIndexForBadge) {
      col.minWidth = 200;
      col.width = 200;
      col.cellRenderer = buildStatusBadgesCellRenderer();
    }

    return col;
  });
};

const ProductDetailsStockoutRiskTable = (props) => {
  const dispatch = useDispatch();
  const tableGridInstance = useRef(null);
  const topRightFiltersRef = useRef({
    dateRange: { fiscalInfoStartDate: null, fiscalInfoEndDate: null },
    dropdown: null,
  });

  const [tableColumns, setTableColumns] = useState([]);
  const [tableConfigLoading, setTableConfigLoading] = useState(false);
  const [tableDataLoading, setTableDataLoading] = useState(false);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [topRightFiltersState, setTopRightFiltersState] = useState(
    () => topRightFiltersRef.current
  );
  const [dropdownState, setDropdownState] = useState({
    isOpen: false,
    currentOptions: [],
    initialOptions: [],
  });
  const [packConfigState, setPackConfigState] = useState({
    isOpen: false,
    selectedArticle: "",
  });
  const [poSummaryState, setPoSummaryState] = useState({
    isOpen: false,
    article: "",
    requestPayload: null,
  });
  const expediteOrdersConfig = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.expediteOrdersConfig
  );
  const expediteConfigFetchedRef = useRef(false);

  const selectedStyles = useMemo(() => {
    if (Array.isArray(props?.selectedKpiStyles)) {
      return props.selectedKpiStyles;
    }

    const columnName =
      props?.orderManagementProductDetailsFilters?.[0]?.column_name;
    const stylesFromDeepDive =
      columnName && props?.orderManagementDeepDiveFiltersData
        ? props.orderManagementDeepDiveFiltersData[columnName]
        : null;

    if (Array.isArray(stylesFromDeepDive) && stylesFromDeepDive.length > 0) {
      return stylesFromDeepDive;
    }

    return Array.isArray(props?.selectedRowsFromMatrixSummary?.values)
      ? [...props.selectedRowsFromMatrixSummary.values]
      : [];
  }, [
    props?.selectedKpiStyles,
    props?.orderManagementDeepDiveFiltersData,
    props?.orderManagementProductDetailsFilters,
    props?.selectedRowsFromMatrixSummary?.values,
  ]);

  const productDetailsFilters = useMemo(() => {
    let redirectionDetails = null;
    try {
      redirectionDetails = JSON.parse(
        localStorage.getItem("omsRedirectionDetails") || "null"
      );
    } catch (error) {
      redirectionDetails = null;
    }
    const filtersFromRedirection = redirectionDetails?.isRedirection
      ? redirectionDetails?.selectedFilters || []
      : [];

    let appliedFilters = [];

    if (props?.filterDashboardConfiguration?.dependencyData?.length) {
      appliedFilters = cloneDeep(
        props.filterDashboardConfiguration.dependencyData
      );
    } else if (props?.selectedFilters?.length) {
      appliedFilters = cloneDeep(props.selectedFilters);
    } else if (filtersFromRedirection.length) {
      appliedFilters = cloneDeep(filtersFromRedirection);
    }

    let resolvedFilters = addSelectedHierarchyToFilters(
      props?.highLevelSummaryState,
      appliedFilters
    );

    const dcFilterFromSelected = props?.selectedFilters?.find(
      (filter) => filter.dimension === "dc"
    );
    if (dcFilterFromSelected) {
      resolvedFilters = mergeOmsDcIntoFilters(
        resolvedFilters,
        dcFilterFromSelected.values
      );
    }

    return resolvedFilters;
  }, [
    props?.filterDashboardConfiguration?.dependencyData,
    props?.highLevelSummaryState,
    props?.selectedFilters,
  ]);

  const productDetailsDateFilter = useMemo(() => {
    const dateFilters = [];
    if (props?.ropParentDateRange?.start_date && props?.ropParentDateRange?.end_date) {
      dateFilters.push(props.ropParentDateRange);
    }
    if (
      props?.recommRecieptParentDateRange?.start_date &&
      props?.recommRecieptParentDateRange?.end_date
    ) {
      dateFilters.push(props.recommRecieptParentDateRange);
    }
    return dateFilters;
  }, [props?.recommRecieptParentDateRange, props?.ropParentDateRange]);

  const alertTopRightOptions = useMemo(() => {
    const config =
      props?.orderingScreensConfig?.oms_dashboard?.style_order_summary
        ?.sku_categorisation_stockout_table?.top_right_options ||
      SKU_CATEGORISATION_STOCKOUT_TABLE_TOP_RIGHT_OPTIONS;
    return normalizeAlertTopRightOptions(config);
  }, [props?.orderingScreensConfig]);

  const displaySnackMessages = useCallback(
    (message, variant = "error") => {
      dispatch(addSnack({ message, options: { variant } }));
    },
    [dispatch]
  );

  const buildRequestPayload = useCallback(
    (manualbody, limitPage) => {
      const filtersWithArticle =
        Array.isArray(selectedStyles) && selectedStyles.length
          ? overrideExpediteArticleFilter(
              cloneDeep(productDetailsFilters),
              selectedStyles
            )
          : cloneDeep(productDetailsFilters);

      const payload = applyAlertTopRightFiltersToPayload(
        {
          filters: filtersWithArticle,
          date_filter: cloneDeep(productDetailsDateFilter),
          transform_flag: true,
          data: selectedStyles,
          meta: manualbody
            ? { ...manualbody, limit: limitPage }
            : {
                ...tableConfigurationMetaData.meta,
                limit: limitPage,
              },
        },
        alertTopRightOptions,
        topRightFiltersRef.current
      );

      return payload;
    },
    [
      alertTopRightOptions,
      productDetailsDateFilter,
      productDetailsFilters,
      selectedStyles,
    ]
  );

  const loadTableInstance = useCallback((params) => {
    tableGridInstance.current = params;
  }, []);

  const recoveryWindowGraphClickHandler = useCallback(
    (params, event) => {
      event?.stopPropagation?.();
      if (!props?.onRecoveryWindowViewGraph) return;
      props.onRecoveryWindowViewGraph({
        rowData: params?.data ?? null,
        selectedFilters: productDetailsFilters,
        alertTopRightOptions,
        dateRange: topRightFiltersRef.current.dateRange,
      });
    },
    [props?.onRecoveryWindowViewGraph, productDetailsFilters, alertTopRightOptions]
  );

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

  const viewPoClickHandler = useCallback(
    (params) => {
      const row = params?.data;
      if (!row) return;

      const filtersWithoutArticle = (
        Array.isArray(productDetailsFilters) ? productDetailsFilters : []
      ).filter((filter) => filter?.attribute_name !== "article");

      const requestPayload = {
        filters: cloneDeep(filtersWithoutArticle),
        unique_row_id: row?.[UNIQUE_ROW_ID],
        article: row?.article,
        loc_code: row?.loc_code,
      };

      setPoSummaryState({
        isOpen: true,
        article: row?.article,
        requestPayload,
      });
    },
    [productDetailsFilters]
  );

  const handlePoSummaryClose = useCallback(() => {
    setPoSummaryState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    if (expediteConfigFetchedRef.current) return;
    if (expediteOrdersConfig && Object.keys(expediteOrdersConfig).length) {
      expediteConfigFetchedRef.current = true;
      return;
    }
    expediteConfigFetchedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const config = await dispatch(getExpediteOrdersConfig());
        if (!cancelled) dispatch(setExpediteOrdersConfig(config || {}));
      } catch (error) {
        console.error(error);
        if (!cancelled) dispatch(setExpediteOrdersConfig({}));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dispatch, expediteOrdersConfig]);

  useEffect(() => {
    let cancelled = false;

    const fetchColumnConfig = async () => {
      setTableConfigLoading(true);
      setRenderAgGrid(false);
      try {
        const response = await dispatch(
          fetchExpediteOrdersAlertsDetailsTableConfig()
        );
        if (cancelled) return;

        let formattedColumns = agGridColumnFormatter(
          response?.data?.data,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );
        formattedColumns = formatStockoutRiskTableColumns(
          formattedColumns,
          recoveryWindowGraphClickHandler,
          sizeColumnClickHandler
        );

        const actionColumn = {
          column_name: "action",
          field: "action",
          accessor: "action",
          headerName: "Action",
          label: "Action",
          pinned: "right",
          lockPosition: "right",
          suppressMenu: true,
          sortable: false,
          suppressSizeToFit: true,
          minWidth: 140,
          width: 140,
          cellRenderer: (params) => {
            if (params?.node?.level !== 0) return "";
            return (
              <Button
                variant="url"
                onClick={() => viewPoClickHandler(params)}
                iconPlacement="right"
                icon={<ArrowForwardIosRounded style={{ fontSize: 14 }} />}
              >
                <span>View PO</span>
              </Button>
            );
          },
        };
        formattedColumns.push(actionColumn);

        setTableColumns(formattedColumns);
        setRenderAgGrid(true);
      } catch (error) {
        console.error(error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      } finally {
        if (!cancelled) {
          setTableConfigLoading(false);
        }
      }
    };

    fetchColumnConfig();

    return () => {
      cancelled = true;
    };
  }, [
    dispatch,
    displaySnackMessages,
    recoveryWindowGraphClickHandler,
    sizeColumnClickHandler,
    viewPoClickHandler,
  ]);

  useEffect(() => {
    if (!alertTopRightOptions.length) return;
    const dropdownConfig = alertTopRightOptions.find(
      (opt) => opt.type === "dropdown"
    );
    if (!dropdownConfig?.options?.length) return;

    const formattedOptions = dropdownConfig.options.map((opt) => ({
      label: opt.label,
      value: opt.value,
    }));
    setDropdownState((prev) => {
      const optionsChanged =
        JSON.stringify(prev.initialOptions) !== JSON.stringify(formattedOptions);
      if (optionsChanged) {
        return {
          ...prev,
          currentOptions: formattedOptions,
          initialOptions: formattedOptions,
        };
      }
      return prev;
    });

    if (dropdownConfig.default_value && !topRightFiltersState.dropdown) {
      const defaultOption = dropdownConfig.options.find(
        (opt) => opt.value === dropdownConfig.default_value
      );
      if (defaultOption) {
        const nextFilters = {
          ...topRightFiltersRef.current,
          dropdown: {
            label: defaultOption.label,
            value: defaultOption.value,
          },
        };
        topRightFiltersRef.current = nextFilters;
        setTopRightFiltersState(nextFilters);
      }
    }
  }, [alertTopRightOptions, topRightFiltersState.dropdown]);

  const refreshTableData = useCallback(() => {
    if (!tableGridInstance.current?.api) return;
    tableGridInstance.current.api.refreshServerSideStore({ purge: true });
  }, []);

  const handleDateRangeChange = useCallback(
    (dateRange) => {
      const nextFilters = { ...topRightFiltersRef.current, dateRange };
      topRightFiltersRef.current = nextFilters;
      setTopRightFiltersState(nextFilters);
      setTableDataLoading(true);
      queueMicrotask(() => refreshTableData());
    },
    [refreshTableData]
  );

  const handleDropdownChange = useCallback(
    (selectedOption, dropdownOptions = []) => {
      const dropdown = normalizeAlertTableDropdownSelection(
        selectedOption,
        dropdownOptions
      );
      const currentValue = topRightFiltersRef.current.dropdown?.value ?? null;
      const nextValue = dropdown?.value ?? null;
      if (currentValue === nextValue) return;

      const nextFilters = { ...topRightFiltersRef.current, dropdown };
      topRightFiltersRef.current = nextFilters;
      setTopRightFiltersState(nextFilters);
      setTableDataLoading(true);
      queueMicrotask(() => refreshTableData());
    },
    [refreshTableData]
  );

  const renderTopRightOptions = useCallback(() => {
    if (!Array.isArray(alertTopRightOptions) || !alertTopRightOptions.length) {
      return [];
    }
    const sortedOptions = [...alertTopRightOptions]
      .filter((opt) => opt.type !== "info_tooltip")
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    return sortedOptions
      .map((option, index) => {
        if (option.type === "date_range_picker") {
          return (
            <NormalCalendarFiscalMapping
              key={option.id || `date-range-${index}`}
              label={option.label}
              fiscalCalendarData={props?.fiscalCalendarDetails || []}
              selectedDate={topRightFiltersState.dateRange}
              onDateChange={handleDateRangeChange}
              displayRow={true}
              showClearDates={true}
              setValueOnBlur={true}
            />
          );
        }
        if (option.type === "dropdown") {
          const dropdownOptions =
            option.options?.map((opt) => ({
              label: opt.label,
              value: opt.value,
            })) || [];
          const currentOptions =
            Array.isArray(dropdownState.currentOptions) &&
            dropdownState.currentOptions.length > 0
              ? dropdownState.currentOptions
              : dropdownOptions;
          const initialOptions =
            Array.isArray(dropdownState.initialOptions) &&
            dropdownState.initialOptions.length > 0
              ? dropdownState.initialOptions
              : dropdownOptions;

          return (
            <Select
              key={option.id || `dropdown-${index}`}
              id={option.id || "stockout-risk-top-right-dropdown"}
              label={option.label}
              currentOptions={currentOptions}
              setCurrentOptions={(options) => {
                if (!Array.isArray(options)) return;
                setDropdownState((prev) => ({ ...prev, currentOptions: options }));
              }}
              initialOptions={initialOptions}
              selectedOptions={topRightFiltersState.dropdown}
              setSelectedOptions={(selected) =>
                handleDropdownChange(selected, dropdownOptions)
              }
              handleChange={(selected) =>
                handleDropdownChange(selected, dropdownOptions)
              }
              isOpen={dropdownState.isOpen}
              setIsOpen={(isOpen) =>
                setDropdownState((prev) => ({ ...prev, isOpen }))
              }
              isClearable={true}
              placeholder={option.placeholder || "Select..."}
              isCloseWhenClickOutside={true}
            />
          );
        }
        return null;
      })
      .filter(Boolean);
  }, [
    alertTopRightOptions,
    dropdownState.currentOptions,
    dropdownState.initialOptions,
    dropdownState.isOpen,
    handleDateRangeChange,
    handleDropdownChange,
    props?.fiscalCalendarDetails,
    topRightFiltersState.dateRange,
    topRightFiltersState.dropdown,
  ]);

  useEffect(() => {
    if (!renderAgGrid || !tableGridInstance.current?.api) return;
    tableGridInstance.current.api.refreshServerSideStore({ purge: true });
  }, [
    renderAgGrid,
    props?.reloadFromParent,
    props?.selectedKpiStyles,
    selectedStyles,
    productDetailsFilters,
    productDetailsDateFilter,
  ]);

  const manualCallBack = useCallback(
    async (manualbody, pageIndex, params) => {
      if (!selectedStyles.length) {
        return defaultTableData;
      }

      try {
        setTableDataLoading(true);
        const limitPage = {
          limit: 10,
          page: Number(pageIndex) ? pageIndex + 1 : 1,
        };
        const body = buildRequestPayload(manualbody, limitPage);
        const response = await dispatch(fetchExpediteOrdersAlertsTableData(body));

        if (!response?.data?.status) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          return defaultTableData;
        }

        const rawRows =
          response?.data?.data?.result ??
          response?.data?.data ??
          [];
        const rows = Array.isArray(rawRows) ? rawRows : [];
        const formattedData = agGridRowFormatter(
          rows,
          params?.api?.checkConfiguration,
          UNIQUE_ROW_ID
        );
        const totalCount =
          response?.data?.total != null
            ? Number(response.data.total)
            : rows.length;

        return { data: formattedData, totalCount };
      } catch (error) {
        console.error(error);
        displaySnackMessages(ERROR_MESSAGE, "error");
        return defaultTableData;
      } finally {
        setTableDataLoading(false);
      }
    },
    [
      buildRequestPayload,
      dispatch,
      displaySnackMessages,
      selectedStyles.length,
    ]
  );

  return (
    <Loader loader={tableConfigLoading} minHeight="260px">
      {renderAgGrid && (
        <Loader loader={tableDataLoading} minHeight="260px">
          <div style={{ marginTop: 16 }}>
            <AgGridComponent
              columns={tableColumns}
              manualCallBack={(body, pageIndex, gridParams) =>
                manualCallBack(body, pageIndex, gridParams)
              }
              loadTableInstance={loadTableInstance}
              rowModelType="serverSide"
              serverSideStoreType="partial"
              uniqueRowId={UNIQUE_ROW_ID}
              pagination
              purgeClosedRowNodes={true}
              suppressAggFuncInHeader={true}
              suppressClickEdit={true}
              groupDisplayType={"custom"}
              treeData={true}
              childKey={"product_details"}
              cacheBlockSize={10}
              showSaveTableConfig
              showSearchModalBtn
              tableHeader="Selected Styles Details"
              noRowOverlayMessage="No data found"
              topRightOptions={renderTopRightOptions()}
            />
          </div>
        </Loader>
      )}

      {packConfigState.isOpen && (
        <PackConfigBottomSheet
          openPackConfigDetailSheet={packConfigState.isOpen}
          setOpenPackConfigDetailSheet={handlePackConfigClose}
          l1DisplayName="Master SKU ID"
          activeChildHierarchyKey={packConfigState.selectedArticle}
          screenName={EXPEDITE_ORDERS_ALERTS_DETAILS_TABLE_CONFIG_NAME}
        />
      )}

      {poSummaryState.isOpen && (
        <ExpeditePoSummaryBottomSheet
          open={poSummaryState.isOpen}
          onClose={handlePoSummaryClose}
          article={poSummaryState.article}
          requestPayload={poSummaryState.requestPayload}
        />
      )}
    </Loader>
  );
};

const mapStateToProps = (store) => ({
  filterDashboardConfiguration:
    store.filterReducer.filterDashboardConfiguration[
      "orderManagementFilterConfiguration"
    ]?.appliedFilterData,
  orderingScreensConfig:
    store.omsReducer.orderingCommonService.orderingScreensConfig,
  orderManagementDeepDiveFiltersData:
    store.omsReducer.orderManagementService.orderManagementDeepDiveFiltersData,
  orderManagementProductDetailsFilters:
    store.omsReducer.orderManagementService.orderManagementProductDetailsFilters,
  selectedRowsFromMatrixSummary:
    store.omsReducer.orderManagementService.selectedRowsFromMatrixSummary,
  selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
  highLevelSummaryState:
    store.omsReducer.orderManagementService.highLevelSummaryState,
});

export default connect(mapStateToProps)(ProductDetailsStockoutRiskTable);
