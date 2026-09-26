import { Grid } from "@mui/material";
import { pivotViewOptions } from "modules/plansmart/constants-plansmart/stringConstants";
import React, { useEffect, useRef, useState } from "react";
import Select from "core/Utils/select";
import MultiSelect from "core/commonComponents/filters/Select/Select";

import { pivotStyles } from "./pivotStyles";
import PivotTable from "./PivotTable";
import {
  fetchPivotViewColDef,
  fetchPivotViewData,
  getPlanSmartMetricData,
  planSmartFormattedMetricListSelector,
  planSmartMetricDataLoaderSelector,
  planSmartPivotLoaderSelector,
  planSmartPivotViewColDefLoaderSelector,
  planSmartPivotViewColDefSelector,
  planSmartPivotViewDataLoaderSelector,
  planSmartPivotViewDataSelector,
  setPlanSmartPivotLoader,
} from "modules/plansmart/services-plansmart/BudgetPlanTable/budget-plan-table-service";
import { connect } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { cloneDeep, get } from "lodash";
import { getVersionList } from "./pivot-table-functions";

function PivotView(props) {
  const {
    tabData,
    productHierarchyFilters,
    planCode,
    setPlanSmartPivotLoaderReq,
    pivotLoader,
    getPlanSmartMetricDataReq,
    fetchPivotViewColDefReq,
    fetchPivotViewDataReq,
    colDefLoader,
    dataLoader,
    colDefList,
    dataList,
    metricDataLoader,
  } = props;
  const pivotTableRef = useRef(null);
  const [columnDef, setColumnDef] = useState({});
  const [rowData, setRowData] = useState({});
  const [viewType, setViewType] = useState(pivotViewOptions[0]);
  const [filteredMetrics, setFilteredMetrics] = useState([]);
  const [filterObj, setFilterObj] = useState({});
  const classes = pivotStyles();
  const metricList = props.metricList;
  useEffect(() => {
    if (pivotViewOptions[0].value === "kpi_view") {
      getPlanSmartMetricDataReq();
    }
  }, []);

  useEffect(() => {
    if (viewType.value === "kpi_view" && metricList.length > 0) {
      setFilteredMetrics([metricList[0]]);
    }
  }, [metricList]);

  useEffect(() => {
    pivotTableRef.current?.api?.onFilterChanged();
  }, [filterObj]);

  useEffect(() => {
    const selectedVersions = get(filterObj, "version.selectedOptions", []);
    if (viewType.value === "kpi_view") {
      const newVersionList = getVersionList(dataList);
      setFilterObj({
        ...filterObj,
        version: {
          options: newVersionList,
          selectedOptions:
            selectedVersions.length === 0
              ? newVersionList.length > 0
                ? [newVersionList[0]]
                : []
              : selectedVersions,
        },
      });
    }
  }, [dataList]);

  useEffect(() => {
    if (viewType.value === "kpi_view") {
      const formattedHierarchy = {};
      tabData.forEach((data) => {
        formattedHierarchy[data.column_name] = {
          options: data.options,
          selectedOptions: data.options,
          label: data.label,
        };
      });
      setFilterObj({
        ...filterObj,
        hierarchy: {
          groupedFilter: true,
          groupKeys: ["hierarchy_key"],
          valueKey: "hierarchy",
          filterDetails: {
            ...formattedHierarchy,
          },
        },
      });
    }
  }, [tabData]);

  useEffect(() => {
    if (viewType.value === "kpi_view" && filteredMetrics.length > 0) {
      const selectedMetrics = filteredMetrics.map((metric) => metric.value);
      const body = {
        plan_code: planCode,
        kpis: selectedMetrics,
      };
      fetchPivotViewColDefReq(body);
      fetchPivotViewDataReq(body);
    }
  }, [filteredMetrics]);

  const updateFilter = (
    filterKey,
    selectedOptions,
    isGroupUpdate,
    groupKey
  ) => {
    const updatedFilterObj = cloneDeep(filterObj);
    if (isGroupUpdate) {
      updatedFilterObj[groupKey].filterDetails[
        filterKey
      ].selectedOptions = selectedOptions;
      setFilterObj(updatedFilterObj);
    } else {
      updatedFilterObj[filterKey].selectedOptions = selectedOptions;
      setFilterObj(updatedFilterObj);
    }
    return updatedFilterObj;
  };

  const handleSelection = (valueObj, action) => {
    setViewType(valueObj);
  };
  const handleFilterSelection = (_, selectedOptions) => {
    setFilteredMetrics(selectedOptions);
  };

  const mainLoader = colDefLoader || dataLoader || metricDataLoader;

  return (
    <div>
      <LoadingOverlay loader={mainLoader}>
        <Grid container gap={2}>
          {/* <Grid item md={2} my={2}>
            <div className={classes.dropDownLabel}>View Type</div>
            <Select
              options={pivotViewOptions}
              value={viewType}
              onChange={handleSelection}
              isSearchable={false}
            />
          </Grid> */}
          <Grid item md={2} my={2}>
            <div className={classes.dropDownLabel}>
              {viewType.value === "kpi_view" || viewType.value === "ver_view"
                ? "KPI"
                : "Season"}
            </div>
            <MultiSelect
              initialData={metricList}
              selectedOptions={filteredMetrics}
              dependency={[]}
              isSearchable={false}
              is_multiple_selection={true}
              name="value"
              customLabel="label"
              data-testid={`select-levels`}
              updateDependency={handleFilterSelection}
            />
          </Grid>
        </Grid>
        {!mainLoader && (
          <PivotTable
            pivotTableRef={pivotTableRef}
            columns={colDefList}
            hierarchyKeys={columnDef.hierarchyKeys}
            rowData={dataList}
            filterObj={filterObj}
            updateFilter={updateFilter}
          />
        )}
      </LoadingOverlay>
    </div>
  );
}

const mapState = (state) => {
  const colDefData = planSmartPivotViewColDefSelector(state);
  return {
    pivotLoader: planSmartPivotLoaderSelector(state),
    metricList: planSmartFormattedMetricListSelector(state),
    metricDataLoader: planSmartMetricDataLoaderSelector(state),
    colDefLoader: planSmartPivotViewColDefLoaderSelector(state),
    dataLoader: planSmartPivotViewDataLoaderSelector(state),
    colDefList: agGridColumnFormatter(cloneDeep(colDefData)),
    dataList: planSmartPivotViewDataSelector(state),
  };
};

const mapDispatch = (dispatch) => {
  return {
    setPlanSmartPivotLoaderReq: (payload) =>
      dispatch(setPlanSmartPivotLoader(payload)),
    getPlanSmartMetricDataReq: (successCallbackFn) =>
      dispatch(getPlanSmartMetricData(successCallbackFn)),
    fetchPivotViewColDefReq: (payload) =>
      dispatch(fetchPivotViewColDef(payload)),
    fetchPivotViewDataReq: (payload) => dispatch(fetchPivotViewData(payload)),
  };
};

export default connect(mapState, mapDispatch)(PivotView);
