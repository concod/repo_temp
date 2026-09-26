// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import { Button } from "impact-ui-v3";
import { useNavigate } from "react-router-dom-v5-compat";
import { useLocation } from "react-router";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import RightIcon from "@mui/icons-material/KeyboardArrowRight";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep } from "lodash";
import {
  ERROR_MESSAGE,
  REDIRECT_FROM_VIEW_PAST_ALLOCATION,
  VIEW_PAST_ALLOCATION_CACHE,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getS2SPastAllocationTableData,
  setS2SPastAllocationTableData,
  setVpaConfigurationS2S,
  setAppliedFiltersVPAS2S,
  setSelectedFiltersVPAS2S,
  setFormDataS2S,
} from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";
import {
  clearActiveModuleCache,
  setKeyValueInCache,
} from "../../../../services-inventorysmart/active-module-common-service";
import { getColumnsAg } from "core/actions/tableColumnActions";

const S2S_TABLE_COLUMNS_CACHE_KEY = "viewPastAllocationS2STableColumns";

const ViewPastAllocatoinS2STable = (props) => {
  const [pastAllocationTableColumns, setPastAllocationTableColumns] = useState(
    []
  );
  const [tableData, setTableData] = useState([]);
  const [tableDataLoader, setTableDataLoader] = useState(false);
  const tableGridInstanceRef = useRef(null);
  const navigate = useNavigate();

  const location = useLocation();
  const allocationCodeQuery = new URLSearchParams(location.search).get(
    "allocation_code"
  );

  const onViewRecommendationClick = (planCode) => {
    const viewCfg =
      props.filterReducer?.filterDashboardConfiguration
        ?.viewPastAllocationFilterConfigurationS2S;
    props.setVpaConfigurationS2S(cloneDeep(viewCfg || {}));
    props.setAppliedFiltersVPAS2S(cloneDeep(viewCfg?.appliedFilterData || {}));
    props.setSelectedFiltersVPAS2S(
      cloneDeep(props.filterReducer?.selectedFilters || {})
    );
    props.setFormDataS2S({ selectedDates: props.selectedDates });
    navigate(
      `/inventory-smart/create-store-transfer?step=1&allocation_code=${planCode}&rd=${REDIRECT_FROM_VIEW_PAST_ALLOCATION}`
    );
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const fetchColumns = async () => {
    try {
      let formattedColumns = [];
      if (
        props.cache[VIEW_PAST_ALLOCATION_CACHE] &&
        props.cache[VIEW_PAST_ALLOCATION_CACHE][S2S_TABLE_COLUMNS_CACHE_KEY]
      ) {
        formattedColumns = [
          ...props.cache[VIEW_PAST_ALLOCATION_CACHE][
            S2S_TABLE_COLUMNS_CACHE_KEY
          ],
        ];
      } else {
        const tableName = "store_transfer_view_past_plans";
        const columns = await getColumnsAg(`table_name=${tableName}`)();
        if (columns && columns.length > 0) {
          formattedColumns = columns;
          props.setKeyValueInCache({
            key: S2S_TABLE_COLUMNS_CACHE_KEY,
            value: cloneDeep(formattedColumns),
            module: VIEW_PAST_ALLOCATION_CACHE,
          });
        }
      }
      if (formattedColumns.length > 0) {
        formattedColumns.push({
          headerName: "Action",
          column_name: "plan_code",
          resiable: false,
          width: 216,
          minWidth: 216,
          maxWidth: 216,
          cellRenderer: (params) => {
            return (
              <Button
                variant="url"
                onClick={(e) => {
                  e.preventDefault();
                  onViewRecommendationClick(params.data.plan_code);
                }}
              >
                View Recommendation
                <RightIcon />
              </Button>
            );
          },
        });
        setPastAllocationTableColumns(formattedColumns);
      }
    } catch (error) {
      handleErrorMessage(error);
    }
  };

  const fetchTableData = async () => {
    try {
      setTableDataLoader(true);
      await fetchColumns();
      const startEndData = {};
      props.inventorysmartPastAllocationFilterDependency.map((item) => {
        if (item.filter_id === "range-picker") {
          startEndData.start_date = item.values[0];
          startEndData.end_date = item.values[1];
        }
      });
      let body = {
        filters: props.inventorysmartPastAllocationFilterDependency,
        date_range: startEndData,
        meta: tableConfigurationMetaData.meta,
        ...(allocationCodeQuery
          ? {
              allocation_code: allocationCodeQuery,
            }
          : {}),
      };
      let response = await props.getS2SPastAllocationTableData(body);
      if (response.data?.show_message) {
        displaySnackMessages(response.data?.message, "success");
      }
      if (response.data?.data?.length) {
        setTableData(cloneDeep(response.data.data));
        props.setS2SPastAllocationTableData(response.data.data);
      } else {
        setTableData([]);
        props.setS2SPastAllocationTableData([]);
      }
    } catch (e) {
      handleErrorMessage(e);
      setTableData([]);
    } finally {
      setTableDataLoader(false);
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [props.inventorysmartPastAllocationFilterDependency]);

  useEffect(() => {
    // remove cache on component unmount
    return () => {
      props.clearActiveModuleCache(VIEW_PAST_ALLOCATION_CACHE);
    };
  }, []);

  return (
    <Loader loader={tableDataLoader}>
      <AgGridComponent
        tableHeader="Past Allocations"
        columns={pastAllocationTableColumns}
        rowdata={tableData}
        hideHeaderCheckboxComponent={true}
        loadTableInstance={(params) => (tableGridInstanceRef.current = params)}
        skipAutoSizeColumn
        pagination={false}
        adjustTableHeight={true}
        downloadAsExcel={
          props?.enableDownload && tableData?.length ? true : false
        }
        topCenterOptions={props.renderCenterOptions()}
      />
    </Loader>
  );
};

const mapStateToProps = (store) => {
  return {
    cache: store.inventorysmartReducer?.activeModulesCacheService?.cache,
    inventorysmartPastAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .inventorysmartPastAllocationFilterDependencyS2S,
    filterReducer: store.filterReducer,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getS2SPastAllocationTableData: (payload) =>
    dispatch(getS2SPastAllocationTableData(payload)),
  setS2SPastAllocationTableData: (payload) =>
    dispatch(setS2SPastAllocationTableData(payload)),
  setVpaConfigurationS2S: (newData) =>
    dispatch(setVpaConfigurationS2S(newData)),
  setAppliedFiltersVPAS2S: (newData) =>
    dispatch(setAppliedFiltersVPAS2S(newData)),
  setSelectedFiltersVPAS2S: (newData) =>
    dispatch(setSelectedFiltersVPAS2S(newData)),
  setFormDataS2S: (newData) => dispatch(setFormDataS2S(newData)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setKeyValueInCache: (keyValuePair) =>
    dispatch(setKeyValueInCache(keyValuePair)),
  clearActiveModuleCache: (module) => dispatch(clearActiveModuleCache(module)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ViewPastAllocatoinS2STable);
