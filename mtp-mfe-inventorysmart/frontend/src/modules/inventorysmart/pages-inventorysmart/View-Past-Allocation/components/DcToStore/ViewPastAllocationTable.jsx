import React, { useEffect, useRef, useState } from "react";
import { Button, useTranslation } from "impact-ui-v3";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import { useNavigate } from "react-router-dom-v5-compat";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  VIEW_PAST_ALLOCATION_CACHE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getPastAllocationTableConfiguration,
  getPastAllocationTableData,
  setInventorysmartPastAllocationTableDataLoader,
  setPastAllocationCardsData,
  setVpaConfiguration,
  setAppliedFiltersVPA,
  setSelectedFiltersVPA,
} from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";
import { isEmpty, cloneDeep } from "lodash";
import { CREATE_ALLOCATION } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { scrollIntoView } from "../../../inventorysmart-utility";
import {
  setSelectedFilters,
  setFormFilters,
  setInventorySmartFinalizeFilterDependency,
  setRedirectedFrom,
} from "modules/inventorysmart/services-inventorysmart/Finalize/product-view-services";
import {
  clearActiveModuleCache,
  setKeyValueInCache,
} from "../../../../services-inventorysmart/active-module-common-service";
import { tableConfigurationMetaData } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { getPastAllocationTableDataDownload } from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";
import { setDynamicViewPastCardLabels } from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";

const ViewPastAllocationsTables = (props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [pastAllocationTableColumns, setPastAllocationTableColumns] = useState(
    []
  );
  const [selectedRow, setSelectedRow] = useState([]);
  const [render, setRender] = useState(false);
  const allocationRef = useRef();
  const tableGridInstanceRef = useRef(null);
  const filterDataRef = useRef({
    selectedFilter: null,
    selectedDateRange: null,
  });

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };
  const updateDynamicCardLabels = (coldefs) => {
    const dynamicCardLabels = {};
    const dynamicCardKeys = ["no_allocated_articles", "no_stores_allocated"];
    coldefs.forEach((coldef) => {
      if (dynamicCardKeys.includes(coldef.column_name)) {
        dynamicCardLabels[coldef.column_name] = coldef.label;
      }
    });
    props.setDynamicViewPastCardLabels(dynamicCardLabels);
  };

  const latestVpaConfigurationRef = useRef(null);
  const latestAppliedFiltersVPARef = useRef({});
  const latestSelectedFiltersVPARef = useRef({});

  useEffect(() => {
    const viewCfg =
      props.filterReducer?.filterDashboardConfiguration
        ?.viewPastAllocationFilterConfiguration;
    latestVpaConfigurationRef.current = viewCfg ? cloneDeep(viewCfg) : null;
    latestAppliedFiltersVPARef.current = cloneDeep(
      viewCfg?.appliedFilterData || {}
    );
    latestSelectedFiltersVPARef.current = cloneDeep(
      props.filterReducer?.selectedFilters || {}
    );
  }, [props.filterReducer]);

  useEffect(() => {
    if (pastAllocationTableColumns) {
      updateDynamicCardLabels(pastAllocationTableColumns);
    }
  }, [pastAllocationTableColumns]);

  useEffect(() => {
    !props.selectedFilters.length && setRender(false);
    const fetchColumnConfig = async () => {
      let pastAllocationTableColumns = [];
      if (
        props.cache[VIEW_PAST_ALLOCATION_CACHE] &&
        props.cache[VIEW_PAST_ALLOCATION_CACHE][
          "viewPastAllocationTableColumns"
        ]
      ) {
        pastAllocationTableColumns =
          props.cache[VIEW_PAST_ALLOCATION_CACHE][
            "viewPastAllocationTableColumns"
          ];
        setPastAllocationTableColumns(pastAllocationTableColumns);
        setRender(true);
        scrollIntoView(allocationRef);
        tableGridInstanceRef?.current?.api?.refreshServerSideStore({
          purge: true,
        });
      } else {
        try {
          let columns = await props.getPastAllocationTableConfiguration();
          let coldefs = agGridColumnFormatter(cloneDeep(columns?.data?.data));

          props.setKeyValueInCache({
            key: "viewPastAllocationTableColumns",
            value: coldefs,
            module: VIEW_PAST_ALLOCATION_CACHE,
          });
          setPastAllocationTableColumns(coldefs);
          setRender(true);
          scrollIntoView(allocationRef);
        } catch (e) {
          handleErrorMessage(e);
        }
      }
    };
    if (props.selectedFilters.length) {
      filterDataRef.current.selectedFilter = props.selectedFilters;
      filterDataRef.current.selectedDateRange = props.startEndDate;
      fetchColumnConfig();
    }
  }, [props.selectedFilters]);

  useEffect(() => {
    // remove chache on component unmount
    return () => {
      props.clearActiveModuleCache(VIEW_PAST_ALLOCATION_CACHE);
    };
  }, []);

  const manualCallBack = async (manualbody, pageIndex) => {
    try {
      const { start_date, end_date } = filterDataRef.current.selectedDateRange;
      if (start_date == null || end_date == null) return;
      if (
        props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
          "VPAPastAllocation"
        )
      ) {
        pageIndex == 0 &&
          props.setInventorysmartPastAllocationTableDataLoader(true);
      } else {
        props.setInventorysmartPastAllocationTableDataLoader(true);
      }
      let l_formattedTableColumnsToBeSentInDataRequest = pastAllocationTableColumns
        ?.filter((columnConfig) => !columnConfig?.extra?.ignore_in_api)
        ?.map((column) => {
          return {
            attribute_name: column.column_name,
            dimension: "Product",
            filter_type: "cascaded",
            operator: "in",
            values: [],
          };
        });
      let body = {
        filters: [
          ...filterDataRef.current.selectedFilter,
          ...l_formattedTableColumnsToBeSentInDataRequest,
        ],
        date_range: { ...filterDataRef.current.selectedDateRange },
        meta: {
          ...manualbody,
          limit: { limit: props.pageSize || 10, page: pageIndex + 1 },
        },
      };
      let response = await props.getpastAllocationTableData(body);
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
      if (!response.data?.data?.length) {
        props?.setPastAllocationCardsData([]);
        return {
          data: [],
          totalCount: 0,
        };
      } else {
        // Add "View Recommendation" action to each row
        const dataWithActions = response.data.data.map((row) => ({
          ...row,
          action: t("inventorysmart.viewRecommendation"),
        }));

        props?.setPastAllocationCardsData(dataWithActions);
        return {
          data: dataWithActions,
          totalCount: response.data.total,
        };
      }
    } catch (e) {
      handleErrorMessage(e);
      return {
        data: [],
        totalCount: 0,
      };
    } finally {
      props.setInventorysmartPastAllocationTableDataLoader(false);
    }
  };

  const onReviewClick = (p_tableData) => {
    props.setSelectedFilters(props.selectedFilters);
    props.setRedirectedFrom("viewPastAllocation");
    props.setInventorySmartFinalizeFilterDependency(
      props.inventorysmartPastAllocationFilterDependency
    );
    props.setFormFilters({ selectedDates: props.selectedDates });
    props.setVpaConfiguration(
      cloneDeep(latestVpaConfigurationRef.current || {})
    );
    props.setAppliedFiltersVPA(
      cloneDeep(latestAppliedFiltersVPARef.current || {})
    );
    props.setSelectedFiltersVPA(
      cloneDeep(latestSelectedFiltersVPARef.current || {})
    );
    navigate(
      `${CREATE_ALLOCATION}?step=2&allocation_code=${p_tableData.plan_code}`,
      { state: { isRedirectedFrom: "viewPastAllocation" } }
    );
  };
  const handleDownload = async () => {
    try {
      let l_formattedTableColumnsToBeSentInDataRequest = pastAllocationTableColumns
        ?.filter((columnConfig) => !columnConfig?.extra?.ignore_in_api)
        ?.map((column) => {
          return {
            attribute_name: column.column_name,
            dimension: "Product",
            filter_type: "cascaded",
            operator: "in",
            values: [],
          };
        });
      let body = {
        filters: [
          ...filterDataRef.current.selectedFilter,
          ...l_formattedTableColumnsToBeSentInDataRequest,
        ],
        date_range: { ...filterDataRef.current.selectedDateRange },
        meta: tableConfigurationMetaData.meta,
      };
      let response = await props.getPastAllocationTableDownload(body);
      displaySnackMessages(response?.data?.data?.message, "success");
    } catch (err) {
      handleErrorMessage(err);
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

  return (
    <>
      {render && (
        <div ref={allocationRef}>
          <Loader loader={props.inventorysmartPastAllocationTableDataLoader}>
            <AgGridComponent
              tableHeader="Past Allocations"
              columns={pastAllocationTableColumns}
              manualCallBack={(body, pageIndex) =>
                manualCallBack(body, pageIndex)
              }
              hideHeaderCheckboxComponent={true}
              // enabling infinite scroll for RL based on key available in response from smart screen config api
              {...(props.inventorysmartScreenConfigForInfiniteScrolling?.includes(
                "VPAPastAllocation"
              )
                ? {
                    pagination: false,
                    rowModelType: "infinite",
                    cacheOverflowSize: 2,
                    hideSelectCurrentPageRecords: true,
                  }
                : {
                    rowModelType: "serverSide",
                    serverSideStoreType: "partial",
                  })}
              onReviewClick={(tableInfo) => onReviewClick(tableInfo.data)}
              loadTableInstance={(params) =>
                (tableGridInstanceRef.current = params)
              }
              cacheBlockSize={props.pageSize || 10}
              uniqueRowId={"plan_code"}
              skipAutoSizeColumn
              paginationPageSize={props.pageSize}
              showDownloadButton={props?.enableDownload}
              onDownloadButtonClick={() => handleDownload()}
              topCenterOptions={props.renderCenterOptions()}
            />
          </Loader>
        </div>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .selectedFilters,
    inventorysmartPastAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .inventorysmartPastAllocationFilterDependency,
    inventorysmartPastAllocationTableDataLoader:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .inventorysmartPastAllocationTableDataLoader,
    cache: store.inventorysmartReducer?.activeModulesCacheService?.cache,
    pageSize:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count,
    filterReducer: store.filterReducer,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getPastAllocationTableConfiguration: () =>
    dispatch(getPastAllocationTableConfiguration()),
  setInventorysmartPastAllocationTableDataLoader: (payload) =>
    dispatch(setInventorysmartPastAllocationTableDataLoader(payload)),
  getpastAllocationTableData: (payload) =>
    dispatch(getPastAllocationTableData(payload)),
  getPastAllocationTableDownload: (payload) =>
    dispatch(getPastAllocationTableDataDownload(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setFormFilters: (payload) => dispatch(setFormFilters(payload)),
  setInventorySmartFinalizeFilterDependency: (payload) =>
    dispatch(setInventorySmartFinalizeFilterDependency(payload)),
  setRedirectedFrom: (payload) => dispatch(setRedirectedFrom(payload)),
  setKeyValueInCache: (keyValuePair) =>
    dispatch(setKeyValueInCache(keyValuePair)),
  clearActiveModuleCache: (module) => dispatch(clearActiveModuleCache(module)),
  setPastAllocationCardsData: (newData) =>
    dispatch(setPastAllocationCardsData(newData)),
  setDynamicViewPastCardLabels: (newData) =>
    dispatch(setDynamicViewPastCardLabels(newData)),
  setAppliedFiltersVPA: (newData) => dispatch(setAppliedFiltersVPA(newData)),
  setSelectedFiltersVPA: (newData) => dispatch(setSelectedFiltersVPA(newData)),
  setVpaConfiguration: (newData) => dispatch(setVpaConfiguration(newData)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ViewPastAllocationsTables);
