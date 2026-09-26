import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { cloneDeep } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import Loader from "core/Utils/Loader/loader";
import moment from "moment/moment";
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
  loadExpediteRecoveryWindowChartInDeepDive,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import {
  ensureExpediteArticleScope,
  getExpediteActiveArticles,
} from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/constants";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";
import {
  applyAlertTopRightFiltersToPayload,
  getExpediteAlertsTopRightOptionsFromConfig,
  normalizeAlertTableDropdownSelection,
} from "modules/oms/pages-oms/Decision-Dashboard/Ordering-Alerts/utils/helper";
import {
  CREATE_NEW_ORDER,
  OFF_CYCLE_ORDER_EXPEDITE_ORDERS,
} from "modules/oms/constants-oms/routeConstants";

const UNIQUE_ROW_ID = "unique_row_id";
const EXPEDITE_ORDERS_ALERTS_DETAILS_TABLE_CONFIG_NAME =
  "expedite_orders_alerts_details";

// Status badge colour coding (impact-ui Badge `color` values).
const STATUS_BADGE_COLOR = {
  approved: "success",
  reviewed: "warning",
  expedited: "info",
  draft: "default",
};

/** Title-case a status string ("expedited" -> "Expedited"). */
const toTitleCase = (str) =>
  String(str ?? "")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const ExpediteOrdersAlertsDetailsTable = () => {
  const dispatch = useDispatch();
  const tableGridInstance = useRef(null);
  const topRightFiltersRef = useRef({
    dateRange: { fiscalInfoStartDate: null, fiscalInfoEndDate: null },
    dropdown: null,
  });

  const sessionId = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.sessionId
  );
  const baseExpeditePayload = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.baseExpeditePayload
  );
  const generatedOrders = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.generatedOrders
  );
  const deepDiveFiltersPayload = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.deepDiveFiltersPayload
  );
  const deepDiveWeekRange = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.deepDiveWeekRange
  );
  const expediteOrdersConfig = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.expediteOrdersConfig
  );
  const isBeforeChartLoading = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.isBeforeChartLoading
  );

  const [tableColumns, setTableColumns] = useState([]);
  const [tableConfigLoading, setTableConfigLoading] = useState(false);
  const [tableDataLoading, setTableDataLoading] = useState(false);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const alertTopRightOptions = useMemo(
    () => getExpediteAlertsTopRightOptionsFromConfig(expediteOrdersConfig),
    [expediteOrdersConfig]
  );
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
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
  const [tableConfigName] = useState(
    EXPEDITE_ORDERS_ALERTS_DETAILS_TABLE_CONFIG_NAME
  );

  const selectedFiltersForRecoveryWindow = useMemo(() => {
    const candidateFilters = deepDiveFiltersPayload?.filters;
    if (Array.isArray(candidateFilters) && candidateFilters.length > 0) {
      return candidateFilters;
    }
    return Array.isArray(baseExpeditePayload?.filters)
      ? baseExpeditePayload.filters
      : [];
  }, [baseExpeditePayload?.filters, deepDiveFiltersPayload?.filters]);

  const displaySnackMessages = useCallback(
    (message, variant = "error") => {
      dispatch(addSnack({ message, options: { variant } }));
    },
    [dispatch]
  );

  const isDraftBackedRow = useCallback(
    (row) =>
      row?.draft_id !== null &&
      row?.draft_id !== undefined &&
      row?.draft_id !== "",
    []
  );

  const handleStatusDraftClick = useCallback((params) => {
    const row = params?.data || {};
    const draftId = row?.draft_id;
    if (!draftId) return;
    const isExpediteDraft =
      row?.is_expedite_draft === true ||
      (row?.draft_type || "").toLowerCase().includes("expedite");
    const url = isExpediteDraft
      ? `${OFF_CYCLE_ORDER_EXPEDITE_ORDERS}?draft_id=${draftId}&tab=before`
      : `${CREATE_NEW_ORDER}?type=offcycle&step=1&draft_id=${draftId}`;
    window.open(url, "_self", "noopener,noreferrer");
  }, []);

  const buildRequestPayload = useCallback(
    (manualbody, limitPage) => {
      const filtersFromPayload = deepDiveFiltersPayload?.filters;
      const rawPayloadFilters =
        Array.isArray(filtersFromPayload) && filtersFromPayload.length > 0
          ? cloneDeep(filtersFromPayload)
          : cloneDeep(baseExpeditePayload?.filters || []);

      const activeArticles = getExpediteActiveArticles(
        baseExpeditePayload?.data,
        generatedOrders
      );
      const payloadFilters = ensureExpediteArticleScope(
        rawPayloadFilters,
        activeArticles
      );

      const date_filter = cloneDeep(baseExpeditePayload?.date_filter || []);
      if (
        deepDiveWeekRange &&
        typeof deepDiveWeekRange === "object" &&
        deepDiveWeekRange.attribute_name &&
        (deepDiveWeekRange.start_date != null ||
          deepDiveWeekRange.end_date != null)
      ) {
        const idx = date_filter.findIndex(
          (d) => d?.attribute_name === deepDiveWeekRange.attribute_name
        );
        if (idx >= 0) {
          date_filter[idx] = { ...date_filter[idx], ...deepDiveWeekRange };
        } else {
          date_filter.push(deepDiveWeekRange);
        }
      }

      const payload = applyAlertTopRightFiltersToPayload(
        {
          filters: payloadFilters,
          date_filter,
          transform_flag: baseExpeditePayload?.transform_flag ?? true,
          data: baseExpeditePayload?.data,
          session_id: sessionId,
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
      baseExpeditePayload,
      deepDiveFiltersPayload,
      deepDiveWeekRange,
      generatedOrders,
      sessionId,
    ]
  );

  const loadTableInstance = useCallback((params) => {
    tableGridInstance.current = params;
  }, []);

  const recoveryWindowGraphClickHandler = useCallback(
    (params, event) => {
      event?.stopPropagation?.();
      dispatch(
        loadExpediteRecoveryWindowChartInDeepDive({
          rowData: params?.data ?? null,
          selectedFilters: selectedFiltersForRecoveryWindow,
          alertTopRightOptions,
          dateRange: topRightFiltersRef.current.dateRange,
        })
      ).catch((error) => {
        console.error(error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      });
    },
    [
      alertTopRightOptions,
      dispatch,
      displaySnackMessages,
      selectedFiltersForRecoveryWindow,
    ]
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

      const filtersWithoutArticle = (Array.isArray(
        selectedFiltersForRecoveryWindow
      )
        ? selectedFiltersForRecoveryWindow
        : []
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
    [selectedFiltersForRecoveryWindow]
  );

  const handlePoSummaryClose = useCallback(() => {
    setPoSummaryState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  useEffect(() => {
    if (!sessionId) return;

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
        let isGrouping = false;
        let rowGroupingColumnIndex = 0;
        formattedColumns = formattedColumns.map((col, index) => {
          if (col?.extra?.is_grouping_key) {
            col.cellRenderer = "agGroupCellRenderer";
            isGrouping = true;
            rowGroupingColumnIndex = index;
          }

          col?.children?.map((child) => {
            if (child?.extra?.is_grouping_key) {
              child.cellRenderer = "agGroupCellRenderer";
            }

            if (child.column_name === "pack_id") {
              child.cellRenderer = (params, extraProps) => {
                const cellValue =
                  params?.value || params?.data?.view_pack_config;

                if (cellValue === "View Pack Config") {
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

            if (child.column_name === "recovery_window") {
              child.cellRenderer = (params) => (
                <Button
                  variant="url"
                  onClick={(event) =>
                    recoveryWindowGraphClickHandler(params, event)
                  }
                >
                  View Graph
                </Button>
              );
            }

            return child;
          });

          if (col.column_name === "pack_id") {
            col.cellRenderer = (params, extraProps) => {
              const cellValue = params?.value || params?.data?.view_pack_config;

              if (cellValue === "View Pack Config") {
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

          if (col.column_name === "recovery_window") {
            col.cellRenderer = (params) => (
              <Button
                variant="url"
                onClick={(event) =>
                  recoveryWindowGraphClickHandler(params, event)
                }
              >
                View Graph
              </Button>
            );
          }

          const targetIndexForBadge = isGrouping
            ? rowGroupingColumnIndex === 0
              ? 1
              : 0
            : 0;
          if (index === targetIndexForBadge) {
            col.minWidth = 200;
            col.width = 200;
            col.cellRenderer = (cellProps, extraProps) => {
              const status = cellProps?.data?.status;
              const is_resolved = cellProps?.data?.is_resolved;
              const is_approved = cellProps?.data?.is_approved;
              const is_expedited = cellProps?.data?.is_expedited;
              const value = cellProps?.value;
              const hasStatus =
                status !== null && status !== undefined && status !== "";
              const showLegacyBadges =
                is_resolved || is_approved || is_expedited;

              return (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    height: "100%",
                  }}
                >
                  {value !== status ? value : null}
                  {hasStatus ? (
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <Badge
                        color={
                          STATUS_BADGE_COLOR[String(status).toLowerCase()] ||
                          "success"
                        }
                        label={toTitleCase(status)}
                        size="default"
                        variant="stroke"
                        {...(isDraftBackedRow(cellProps?.data)
                          ? {
                              onClick: () => handleStatusDraftClick(cellProps),
                              style: { cursor: "pointer" },
                            }
                          : {})}
                      />
                    </div>
                  ) : (
                    showLegacyBadges && (
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {is_resolved && (
                          <Badge
                            color="success"
                            label="Reviewed"
                            onClick={() => {}}
                            size="default"
                            variant="stroke"
                          />
                        )}
                        {is_approved && (
                          <Badge
                            color="success"
                            label="Approved"
                            onClick={() => {}}
                            size="default"
                            variant="stroke"
                          />
                        )}
                        {is_expedited && (
                          <Badge
                            color="success"
                            label="Expedited"
                            onClick={() => {}}
                            size="default"
                            variant="stroke"
                          />
                        )}
                      </div>
                    )
                  )}
                </div>
              );
            };
          }

          return col;
        });

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
    sessionId,
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
        JSON.stringify(prev.initialOptions) !==
        JSON.stringify(formattedOptions);
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

  useEffect(() => {
    if (!alertTopRightOptions.some((opt) => opt.type === "date_range_picker")) {
      return;
    }
    let cancelled = false;
    const fetchFiscalCalendar = async () => {
      try {
        const startYear = moment().year();
        const endYear = moment().year() + 2;
        const queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const response = await getOmsCoreFiscalCalendar(queryParams);
        if (!cancelled) {
          const payload = response?.data?.data;
          moment.updateLocale("en", {
            week: { dow: payload?.week_start_day || 0 },
          });
          setFiscalCalendarDetails(payload?.data || []);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchFiscalCalendar();
    return () => {
      cancelled = true;
    };
  }, [alertTopRightOptions]);

  const refreshTableData = useCallback(() => {
    if (!tableGridInstance.current?.api) return;
    tableGridInstance.current.api.refreshServerSideStore({ purge: true });
  }, []);

  useEffect(() => {
    if (!renderAgGrid || !alertTopRightOptions.length) return;
    refreshTableData();
  }, [alertTopRightOptions, renderAgGrid, refreshTableData]);

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
              fiscalCalendarData={fiscalCalendarDetails}
              selectedDate={topRightFiltersState.dateRange}
              onDateChange={handleDateRangeChange}
              displayRow={true}
              showClearDates={true}
              setValueOnBlur={true}
              labelOrientation="left"
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
              id={option.id || "expedite-alerts-top-right-dropdown"}
              label={option.label}
              currentOptions={currentOptions}
              setCurrentOptions={(options) => {
                if (!Array.isArray(options)) return;
                setDropdownState((prev) => ({
                  ...prev,
                  currentOptions: options,
                }));
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
              labelOrientation="left"
            />
          );
        }
        return null;
      })
      .filter(Boolean);
  }, [
    alertTopRightOptions,
    dropdownState.currentOptions,
    fiscalCalendarDetails,
    handleDateRangeChange,
    handleDropdownChange,
    topRightFiltersState.dateRange,
    topRightFiltersState.dropdown,
    dropdownState.isOpen,
  ]);

  useEffect(() => {
    if (!renderAgGrid || !tableGridInstance.current?.api) return;
    tableGridInstance.current.api.refreshServerSideStore({ purge: true });
  }, [
    sessionId,
    baseExpeditePayload,
    deepDiveFiltersPayload,
    deepDiveWeekRange,
    renderAgGrid,
  ]);

  const manualCallBack = useCallback(
    async (manualbody, pageIndex, params) => {
      if (!sessionId || !baseExpeditePayload) {
        return defaultTableData;
      }

      try {
        setTableDataLoading(true);
        const limitPage = {
          limit: 10,
          page: Number(pageIndex) ? pageIndex + 1 : 1,
        };
        const body = buildRequestPayload(manualbody, limitPage);
        const response = await dispatch(
          fetchExpediteOrdersAlertsTableData(body)
        );

        if (!response?.data?.status) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          return defaultTableData;
        }

        const rawRows =
          response?.data?.data?.result ?? response?.data?.data ?? [];
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
      baseExpeditePayload,
      buildRequestPayload,
      dispatch,
      displaySnackMessages,
      sessionId,
    ]
  );

  if (!sessionId || isBeforeChartLoading) {
    return null;
  }

  return (
    <Loader loader={tableConfigLoading} minHeight="260px">
      {renderAgGrid && (
        <Loader loader={tableDataLoading} minHeight="260px">
          <div style={{ marginTop: 16 }}>
            <AgGridComponent
              columns={tableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
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
              showSkeleton={true}
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
          screenName={tableConfigName}
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

export default ExpediteOrdersAlertsDetailsTable;
