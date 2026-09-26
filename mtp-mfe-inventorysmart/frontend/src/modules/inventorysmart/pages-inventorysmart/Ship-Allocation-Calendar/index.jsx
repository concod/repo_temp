import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { cloneDeep, isNull } from "lodash";
import AgGridComponent from "core/Utils/agGrid";
import { setFilterConfiguration } from "core/actions/filterAction";
import { addSnack } from "core/actions/snackbarActions";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterFieldValues,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import Loader from "core/Utils/Loader/loader";
import { getShipAllocationCalendarList } from "modules/inventorysmart/services-inventorysmart/Ship-Allocation-Calendar/ship-allocation-calendar-service";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH, IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "core/constants";
import { rangePickerConstant } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { useTranslation } from "impact-ui-v3";

function ShipAllocationCalendar(props) {
  const { t } = useTranslation();
  const [showloader, setloader] = useState(true);
  const [columns, setColumns] = useState([]);
  const onFilterDependency = useRef(null);
  const dateRangeRef = useRef(null);
  const tableInstance = useRef({});

  const setNewTableInstance = (params) => {
    tableInstance.current = params;
  };

  useEffect(() => {
    const getInitialData = async () => {
      try {
        let cols = [];
        try {
          cols = await getColumnsAg("table_name=ship_allocation_calendar_table")();
        } catch (error) {
          console.error("Error fetching columns for ship_allocation_calendar_table:", error);
        }

        cols = cols.map((item) => {
          item.editable = false;
          item.disabled = true;
          return item;
        });

        const data = await fetchFilterFieldValues(
          "Ship-Allocation Calendar",
          props.savedFilterSelection,
          props.screenName,
          []
        );

        // Create 3 separate rangePicker filters for Drop Date, Shipment Date, and Delivery Date
        // Drop Date - Mandatory
        const dropDateRangeFilter = cloneDeep(rangePickerConstant)[0];
        dropDateRangeFilter.label = t("inventorysmart.dropDate");
        dropDateRangeFilter.column_name = "drop_date";
        dropDateRangeFilter.filter_keyword = "drop_date";
        dropDateRangeFilter.accessor = "drop_date";
        dropDateRangeFilter.is_mandatory = true;
        dropDateRangeFilter.required = true;
        dropDateRangeFilter.display_order = 1;
        dropDateRangeFilter.disableType = "none";

        // Shipment Date - Optional
        const shipmentDateRangeFilter = cloneDeep(rangePickerConstant)[0];
        shipmentDateRangeFilter.label = t("inventorysmart.shipmentDate");
        shipmentDateRangeFilter.column_name = "shipment_date";
        shipmentDateRangeFilter.filter_keyword = "shipment_date";
        shipmentDateRangeFilter.accessor = "shipment_date";
        shipmentDateRangeFilter.is_mandatory = false;
        shipmentDateRangeFilter.required = false;
        shipmentDateRangeFilter.display_order = 2;
        shipmentDateRangeFilter.disableType = "none";

        // Delivery Date - Optional
        const deliveryDateRangeFilter = cloneDeep(rangePickerConstant)[0];
        deliveryDateRangeFilter.label = t("inventorysmart.deliveryDate");
        deliveryDateRangeFilter.column_name = "delivery_date";
        deliveryDateRangeFilter.filter_keyword = "delivery_date";
        deliveryDateRangeFilter.accessor = "delivery_date";
        deliveryDateRangeFilter.is_mandatory = false;
        deliveryDateRangeFilter.required = false;
        deliveryDateRangeFilter.display_order = 3;
        deliveryDateRangeFilter.disableType = "none";

        // Filter out ALL individual date filters from DB (DateTimeField type)
        // Keep only dropdown filters (cruiseline, ship)
        const filteredData = data.filter(
          (f) => f.display_type !== "DateTimeField"
        );
        
        // Combine all rangePicker filters with dropdown filters
        const filterDataWithDateRange = [
          dropDateRangeFilter,
          shipmentDateRangeFilter,
          deliveryDateRangeFilter,
          ...filteredData
        ];

        let filterConfigData = [
          {
            filterDashboardData: filterDataWithDateRange,
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        if (sessionStorage.getItem("currentApp") === "inventorysmart") {
          filterConfigData[0]["saved_filter_screen_name"] =
            "Inventorysmart Ship Allocation Calendar";
        }
        const filterConfig = formattedFilterConfiguration(
          "shipAllocationCalendarFilterConfiguration",
          filterConfigData,
          "Ship-Allocation Calendar"
        );
        props.setFilterConfiguration(filterConfig);

        setColumns(cols);
        setloader(false);
      } catch (error) {
        console.error("Error in getInitialData:", error);
        setloader(false);
      }
    };
    getInitialData();
  }, []);

  const refreshTable = () => {
    tableInstance.current?.api?.refreshServerSideStore({ purge: true });
  };

  const shipAllocationManualCallBack = async (manualbody, pageIndex, params) => {
    if (isNull(onFilterDependency.current) || isNull(dateRangeRef.current)) {
      return {
        data: [],
        totalCount: 0,
      };
    }
    setloader(true);

    const body = {
      filters: onFilterDependency.current,
      date_range: dateRangeRef.current,
      meta: {
        search: manualbody.search || [],
        sort: manualbody.sort || [],
        range: manualbody.range || [],
        limit: {
          page: pageIndex + 1,
          limit: props.pageSize || 20,
        },
      },
    };

    try {
      const response = await getShipAllocationCalendarList(body)();
      const data = response.data?.data || [];
      const total = response.data?.total_count || 0;

      setloader(false);

      return {
        data: data,
        totalCount: total,
      };
    } catch (err) {
      setloader(false);
      displaySnackMessages(
        err.response?.data?.message || t("inventorysmart.failedToFetchData"),
        "error"
      );
      return {
        data: [],
        totalCount: 0,
      };
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData, filterDates) => {
    // Find all 3 date range filters (rangePicker type)
    const dropDateFilter = dependencyData?.find(
      (f) => f.attribute_name === "drop_date" || f.filter_id === "drop_date"
    );
    const shipmentDateFilter = dependencyData?.find(
      (f) => f.attribute_name === "shipment_date" || f.filter_id === "shipment_date"
    );
    const deliveryDateFilter = dependencyData?.find(
      (f) => f.attribute_name === "delivery_date" || f.filter_id === "delivery_date"
    );

    // Extract drop_date range (mandatory) - used as primary date_range for API
    // rangePicker stores values as [start_date, end_date] in "YYYY-MM-DD" format
    if (dropDateFilter && dropDateFilter.values?.length >= 2) {
      dateRangeRef.current = {
        start_date: dropDateFilter.values[0],
        end_date: dropDateFilter.values[1],
      };
    } else {
      dateRangeRef.current = null;
    }

    // Build filters array for API
    const filters = [];

    // Add shipment_date range filter if selected
    if (shipmentDateFilter && shipmentDateFilter.values?.length >= 2) {
      filters.push({
        attribute_name: "shipment_date",
        operator: "between",
        dimension: "custom",
        values: [shipmentDateFilter.values[0], shipmentDateFilter.values[1]],
      });
    }

    // Add delivery_date range filter if selected
    if (deliveryDateFilter && deliveryDateFilter.values?.length >= 2) {
      filters.push({
        attribute_name: "delivery_date",
        operator: "between",
        dimension: "custom",
        values: [deliveryDateFilter.values[0], deliveryDateFilter.values[1]],
      });
    }

    // Add non-date filters (cruiseline, ship - dropdown type)
    const nonDateFilters = dependencyData?.filter(
      (f) => f.display_type === "dropdown" && f.values?.length > 0
    ) || [];

    nonDateFilters.forEach((filter) => {
      // Extract actual values from dropdown selections
      const filterValues = filter.values.map((v) => 
        typeof v === 'object' ? (v.value || v.id || v.label) : v
      );
      
      filters.push({
        attribute_name: filter.filter_id || filter.attribute_name || filter.column_name,
        operator: "in",
        dimension: filter.dimension || "store",
        values: filterValues,
      });
    });

    onFilterDependency.current = filters;
    refreshTable();
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const getTableHeader = () => {
    return t("inventorysmart.shipAllocationCalendar");
  };

  const renderContent = () => {
    return (
      <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
        <CoreComponentScreen
          IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
          showPageRoute={props.hideBreadCrumbs ? false : true}
          showPageHeader={false}
          showFilterDashboard={true}
          filterConfigKey={"shipAllocationCalendarFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          contained={true}
          screenName={"Ship-Allocation Calendar"}
          autoHideFilterButton={true}
          isOutsideRange={"disableOnlyPast"}
        >
          <Loader loader={showloader}>
            <div data-testid="filterContainer">
              {columns.length > 0 && (
                <div>
                  <AgGridComponent
                    columns={columns}
                    selectAllHeaderComponent={false}
                    onGridChanged
                    manualCallBack={(body, pageIndex, params) =>
                      shipAllocationManualCallBack(body, pageIndex, params)
                    }
                    rowModelType="serverSide"
                    serverSideStoreType="partial"
                    cacheBlockSize={props.pageSize || 10}
                    paginationPageSize={props.pageSize || 10}
                    // uniqueRowId={"ship_code"}
                    hideChildSelection={true}
                    loadTableInstance={setNewTableInstance}
                    showSetAll={false}
                    purgeClosedRowNodes={true}
                    suppressAggFuncInHeader={true}
                    rowSelection={"none"}
                    suppressClickEdit={true}
                    suppressColumnVirtualisation={true}
                    tableName={"ship_allocation_calendar_table"}
                    tableHeader={getTableHeader()}
                    appliedFilters={onFilterDependency.current}
                    noRowsOverlayComponent={() => (
                      <div style={{ padding: "20px", textAlign: "center" }}>
                        <p>
                          {t(
                            "inventorysmart.noDataAvailableForSelectedFilters"
                          )}
                        </p>
                      </div>
                    )}
                    noRowsOverlayComponentParams={{
                      message: t(
                        "inventorysmart.noDataAvailableForSelectedFilters"
                      ),
                    }}
                  />
                </div>
              )}
            </div>
          </Loader>
        </CoreComponentScreen>
      </div>
    );
  };

  return <React.Fragment>{renderContent()}</React.Fragment>;
}

const mapDispatchToProps = {
  addSnack,
  setFilterConfiguration,
};

const mapStateToProps = (state) => {
  return {
    filterDashboardConfiguration:
      state.filterReducer.filterDashboardConfiguration[
        "shipAllocationCalendarFilterConfiguration"
      ],
    inventorysmartModulesPermission:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    savedFilterSelection: state.filterReducer.savedFilterSelection,
    pageSize:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    inventorysmartScreenConfig:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(ShipAllocationCalendar);
