import React, { useState, useEffect } from "react";
import { withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import { isEmpty, cloneDeep } from "lodash";
import { Button, Card, Grid } from "@mui/material";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import mapDataUS from "@highcharts/map-collection/countries/us/us-all.geo.json";
import mapDataCA from "@highcharts/map-collection/countries/ca/ca-all.geo.json";
import PropTypes from "prop-types";
import ClusterChartComponent from "./cluster-chart-component";
import ClusterBreakdownComponent from "./cluster-breakdown-component";
import PlanDataComponent from "../../../../assortsmart/pages-assortsmart/Plan/plan-filter-data-component";
import {
  set1_2_Loader,
  clearFinalizeClusterStates,
  getAttributeGraphData,
  setAttributeGraphData,
  clearAttributeGraphData,
  clearPerformanceGraphData,
} from "../../../../assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import {
  setClusterMapViewData,
  setMapViewLoader,
} from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import { getCombinedFiltersValues } from "core/actions/filterAction";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  isChannelMultiple,
  prepareAttrGraphPayload
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import Filters from "../../../../../core/commonComponents/filters/filterGroup";
import FilterChips from "core/commonComponents/filters/filterChips";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  channelFilterFinalizeCluster,
  Plan,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import MapView from "./map-view-component";
import { MAP_VIEW_FILTERS } from "modules/clusterSmart/constants-clustersmart/stringConstants";
import { getClusterMapViewData } from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import * as clusterInputServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import * as clusterPlanServiceActions from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import * as finalizeClusterServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import { groupByCustom } from "core/Utils/formatter";
import { addSnack } from "core/actions/snackbarActions";
import { getFiltersValues } from "core/actions/filterAction";

const FinalizeClusterComponent = (props) => {
  const [attributeBucketId, setAttributeBucketId] = useState("");
  const [performanceBucketId, setPerformanceBucketId] = useState("");
  const [selectedProductAttribute, setSelectedProductAttribute] = useState("");
  const [showChannelFilterButton, setChannelFilterButton] = useState(false);
  const [filterSelection, setFilterSelection] = useState({});
  const [filters, setFilters] = useState([]);
  const [filterPopup, setFilterPopup] = useState(false);
  const [filterDependency, setFilterDependency] = useState([]);
  const [initialValue, setInitialValue] = useState([]);
  const [mapViewOptions, setMapViewOptions] = useState([]);
  const [mapViewFilterConfig, setMapViewFilterConfig] = useState([]);
  const [hideMapView, setHideMapView] = useState(false);
  const [viewPlanContainer, setViewPlanContainer] = useState(false);
  const [viewState, setViewState] = useState("table");
  const globalClasses = globalStyles();
  const history = useHistory();
  const classes = useStyles();

  // clearing states on unmounting parent
  useEffect(() => {
    return () => {
      props.clearFinalizeClusterStates();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const populateChannelOptions = async () => {
    if (props.planDetails?.data?.cluster_plan_code) {
      if (isChannelMultiple(props.planDetails.data)) {
        setChannelFilterButton(true);
        let options = props.planDetails.data?.channel.map((value) => {
          return {
            value: value,
            label: value,
            id: value,
          };
        });
        options = options.filter(
          (option) => !Plan.__Ecom_Channel.includes(option.value)
        );
        const channelFilterValue = channelFilterFinalizeCluster;
        channelFilterValue["initialData"] = options;
        const channelData = [];
        channelData.push(channelFilterValue);
        let channelOptions = await Promise.all(channelData);
        setFilters(channelOptions);
        const channelSelected = {};
        channelSelected["channels"] = options[0]?.value;
        setFilterSelection(channelSelected);
        const initialValue = [
          {
            filter_id: "channels",
            filter_type: "cascaded",
            dimension: "channel",
            display_type: "dropdown",
            values: [options[0]],
          },
        ];
        props.setSelectedValue(options[0]);
        setFilterDependency(initialValue);
        setInitialValue(initialValue);
      }
    }
  };

  useEffect(() => {
    populateChannelOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.planDetails?.data]);

  const handleChange = (updatedValue) => {
    props.setSelectedValue(updatedValue[0]?.values[0]);
    setFilterDependency(updatedValue);
  };

  const onFilter = async () => {
    let filterSelection = {};
    filterSelection["channels"] = props.selectedValue?.value;
    setFilterSelection(filterSelection);
    setFilterPopup(false);
    try {
      props.set1_2_Loader(true);
      props.clearAttributeGraphData();
      props.clearFinalizeClusterStates();
      props.clearPerformanceGraphData();
      let planData = props.planDetails?.data;
      let formData = {
        attributeBucketId: props.attributeBucketId?.[props.selectedValue?.value]
          ? props.attributeBucketId?.[props.selectedValue?.value]
          : attributeBucketId,
        attribute: selectedProductAttribute,
      };
      if (props.selectedValue?.value) {
        formData.channel = props.selectedValue?.value;
      }
      let reqBodyAttrGraph = prepareAttrGraphPayload(planData, formData, props)
      let graphResponse = await props.getAttributeGraphData(reqBodyAttrGraph);
      props.setAttributeGraphData(graphResponse?.data);
      props.getEditClusterData();
    } catch (error) {}
  };

  const onReset = () => {};

  useEffect(() => {
    if (
      !isEmpty(props.planDetails) &&
      !isEmpty(props.attributeGraphData) &&
      !isEmpty(props.performanceGraphData) &&
      !isEmpty(selectedProductAttribute) &&
      !isEmpty(attributeBucketId)
    ) {
      props.set1_2_Loader(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.planDetails,
    props.attributeGraphData,
    props.performanceGraphData,
    props.clusterBreakdownData,
    attributeBucketId,
    selectedProductAttribute,
    props.clusterMapViewData,
  ]);

  const setSelectedIds = (id, graphType, isOnchange = false) => {
    if (graphType === "attribute") {
      setAttributeBucketId(id);
      let selectedChannel =
        props.selectedValue?.value || props.planDetails?.data?.channel[0];
      if (isOnchange) {
        props.setAttributeBucketId(id);
      }
    } else {
      setPerformanceBucketId(id);
      if (isOnchange) {
        props.setPerformanceBucketId(id);
      }
    }
  };

  const getClusterMapViewDetails = async (regionName) => {
    try {
      props.setMapViewLoader(true);
      const reqBody = {
        cluster_plan_code: props.planDetails?.data?.cluster_plan_code,
        performance_bucket_id: performanceBucketId,
        attribute_bucket_id: attributeBucketId,
        channel: filterSelection["channels"] ? filterSelection["channels"] : "",
      };
      if (regionName?.length) {
        const filters = [
          {
            attribute_name: "region",
            value: regionName,
            operator: "in",
          },
        ];
        reqBody.filters = filters;
      }
      let mapviewDataResp = await props.getClusterMapViewData(reqBody);
      props.setClusterMapViewData(cloneDeep(mapviewDataResp?.data?.data));
      if (mapviewDataResp?.data?.data?.is_lat_long_nulll) {
        setHideMapView(true);
        props.setMapViewLoader(false);
        return;
      }
      let mapviewData = mapviewDataResp?.data?.data?.records;
      if (!isEmpty(filterSelection) && filterSelection["channels"]) {
        mapviewData = mapviewData?.filter((item) => {
          return item.channel === filterSelection["channels"];
        });
      }
      //Collect mapview data for not null latitude & not null longitude
      mapviewData = mapviewData?.filter((item) => {
        return item.latitude !== null && item.longitude !== null;
      });
      if (mapviewData.length) {
        mapviewData.forEach((item) => {
          const performance_cluster = item.performance_cluster_name?.split(" ");
          const performance_cluster_name =
            performance_cluster?.length > 1
              ? performance_cluster[performance_cluster.length - 1]
              : item.performance_cluster_name;
          item["cluster_name"] =
            item?.attribute_cluster_name + performance_cluster_name;
        });
        const groupByProperties = ["cluster_name"];
        const groupMapViewData = groupByCustom({
          Group: mapviewData,
          By: groupByProperties,
        });
        //Get series options for map data
        const seriesData = getSeriesData(groupMapViewData);
        const mapviewOptions = {
          chartType: "mapView",
          series: seriesData,
          tooltip: {
            headerFormat: "<b>{series.name}</b><br>",
            pointFormat:
              "Region: {point.region}<br/> Store Name: {point.store_name}<br/> Store Code: {point.store_code}",
          },
          mapData:
            filterSelection["channels"] === "CA" ||
            (!filterSelection["channels"] &&
              props.planDetails?.data?.channel?.[0] === "CA")
              ? mapDataCA
              : mapDataUS,
          map:
            filterSelection["channels"] === "CA"
              ? "countries/ca/ca-all"
              : "countries/us/us-all",
        };
        setMapViewOptions(mapviewOptions);
      } else {
        const mapViewOptions = {
          chartType: "mapView",
          series: [],
        };
        setMapViewOptions(mapViewOptions);
      }
      props.setMapViewLoader(false);
    } catch (error) {
      setHideMapView(true);
      props.setMapViewLoader(false);
      //To be uncommented later
      // props.addSnack({
      //   message: "Fetching map view data failed",
      //   options: {
      //     variant: "error",
      //   },
      // });
    }
  };

  const getSeriesData = (mapOptions) => {
    const series = [];
    mapOptions?.forEach((element) => {
      const { store_code, cluster_name, backgroundColor } = element[0];
      let seriesObject = {
        id: store_code + "",
        type: "mappoint",
        name: cluster_name,
        showInLegend: true,
        dataLabels: {
          enabled: true,
        },
        marker: {
          symbol: "circle",
        },
        color: backgroundColor,
        stickyTracking: false,
      };
      let seriesData = [];
      //To add cluster data for each cluster & associate particular color to each cluster
      element.forEach((item) => {
        seriesData.push({
          region: item.region,
          store_name: item.store_name,
          store_code: item.store_code,
          lat: item.latitude,
          lon: item.longitude,
        });
      });
      seriesObject["data"] = seriesData;
      series.push(seriesObject);
    });
    return series;
  };

  const getMapViewData = async () => {
    const filtersBody = {
      attributes: [
        {
          attribute_name: "region",
          dimension: "store",
        },
      ],
      filter_type: "cascaded",
      filters: [],
    };
    try {
      const regionFilters = await props.getCombinedFiltersValues(filtersBody);
      let regions = regionFilters?.data?.data?.region;
      let mapViewFilterAttrs = props.screenConfiguration;
      const mapViewFilters = [];
      if (mapViewFilterAttrs) {
        mapViewFilterAttrs = mapViewFilterAttrs?.["1.2"]?.["mapFilters"];
        mapViewFilterAttrs?.forEach((attribute) => {
          let mapViewFilterData = cloneDeep(MAP_VIEW_FILTERS[0]);
          mapViewFilterData["accessor"] = attribute;
          mapViewFilterData["label"] = attribute.toUpperCase();
          if (attribute === "region") {
            mapViewFilterData["options"] = regions.map((item) => {
              return {
                label: item,
                value: item,
                id: item,
              };
            });
            mapViewFilterData["isClearable"] = true;
          }
          mapViewFilters.push(mapViewFilterData);
        });
      }
      setMapViewFilterConfig(mapViewFilters);
      getClusterMapViewDetails();
    } catch (error) {
      //Hide mapview if store api fails
      setHideMapView(true);
    }
  };

  useEffect(() => {
    if (
      attributeBucketId &&
      performanceBucketId &&
      ((isChannelMultiple(props.planDetails?.data) &&
        filterSelection["channels"]) ||
        !isChannelMultiple(props.planDetails?.data))
    ) {
      setViewState("table");
      setHideMapView(false);
      getMapViewData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attributeBucketId, performanceBucketId, filterSelection]);

  return (
    <>
      <div>
        {viewPlanContainer && (
          <Card className={`${globalClasses.paper} ${globalClasses.scroll}`}>
            <PlanDataComponent />
          </Card>
        )}
      </div>

      <Grid
        container
        direction="row"
        display="flex"
        justifyContent="right"
        alignItems="right"
        spacing={2}
      >
        <Grid item>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setViewPlanContainer(!viewPlanContainer)}
          >
            {viewPlanContainer ? "Hide" : "View"} Plan Details
          </Button>
        </Grid>
        {showChannelFilterButton && (
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FilterAltOutlinedIcon />}
              onClick={() => setFilterPopup(true)}
              disabled={
                props.isLoading ||
                props.mapViewLoader ||
                props.clusterBreakDownLoader
              }
            >
              Select Filters
            </Button>
          </Grid>
        )}
      </Grid>

      <FilterModal
        open={filterPopup}
        isModalFixedTop={true}
        closeOnOverlayClick={() => setFilterPopup(false)}
      >
        <CustomAccordion label="Filter" defaultExpanded={true}>
          <LoadingOverlay loader={props.isLoading} minHeight={200}>
            <Filters
              filters={filters}
              onFilter={onFilter}
              onReset={onReset}
              showBorderedWrapper={false}
              screen={"Finalize Cluster"}
              update={handleChange}
              doNotUpdateDefaultValue={false}
              inititalSelection={initialValue}
            />
          </LoadingOverlay>
        </CustomAccordion>
      </FilterModal>
      {filterDependency.length > 0 && (
        <FilterChips filterConfig={filterDependency}></FilterChips>
      )}
      <LoadingOverlay
        loader={
          props.isLoading ||
          props.mapViewLoader ||
          props.clusterBreakDownLoader ||
          props.perfLoader ||
          props.editDataLoader
        }
        spinner
      >
        <ClusterChartComponent
          fetchAttributeBucketId={(id, graphType, isOnchange = false) =>
            setSelectedIds(id, graphType, isOnchange)
          }
          fetchPerformanceBucketId={(id, graphType, isOnchange = false) =>
            setSelectedIds(id, graphType, isOnchange)
          }
          fetchActiveProductAttributeValue={(val) =>
            setSelectedProductAttribute(val)
          }
          channelSelected={filterSelection["channels"]}
          setPerformanceBucketId={props.setPerformanceBucketId}
          setAttributeBucketId={props.setAttributeBucketId}
          attributeBucketId={props.attributeBucketId}
          performanceBucketId={props.performanceBucketId}
          attributeSelection={props.attributeSelection}
        />
        <ClusterBreakdownComponent
          attributeClusterBucket={attributeBucketId}
          performanceClusterBucket={performanceBucketId}
          selectedProductAttribute={selectedProductAttribute}
          channelSelected={filterSelection["channels"]}
          setClusterEditTableData={props.setClusterEditTableData}
          clusterEditTableData={props.clusterEditTableData}
          perfAttrCharLabel={props.perfAttrCharLabel}
          attributeBucketId={props.attributeBucketId}
          performanceBucketId={props.performanceBucketId}
          viewState={viewState}
          setViewState={setViewState}
          mapViewOptions={mapViewOptions}
          getClusterMapViewDetails={getClusterMapViewDetails}
          mapViewFilterConfig={mapViewFilterConfig}
          hideMapView={hideMapView}
          attributeSelection={props.attributeSelection}
        />
      </LoadingOverlay>
    </>
  );
};

FinalizeClusterComponent.defaultProps = {
  attributeGraphData: {},
  performanceGraphData: {},
  planDetails: {},
};

FinalizeClusterComponent.propTypes = {
  set1_2_Loader: PropTypes.func.isRequired,
};

const mapStateToProps = (store) => {
  return {
    isLoading: finalizeClusterServiceActions.loader_1_2Selector(store),
    attributeGraphData: finalizeClusterServiceActions.attributeGraphDataSelector(
      store
    ),
    performanceGraphData: finalizeClusterServiceActions.performanceGraphDataSelector(
      store
    ),
    clusterBreakdownData: finalizeClusterServiceActions.clusterBreakdownDataSelector(
      store
    ),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      store
    ),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(store),
    clusterMapViewData: clusterPlanServiceActions.clusterMapViewDataSelector(
      store
    ),
    mapViewLoader: clusterPlanServiceActions.mapViewLoaderSelector(store),
    clusterBreakDownLoader: clusterPlanServiceActions.clusterBreakDownLoaderSelector(
      store
    ),
  };
};

const mapActionsToProps = {
  set1_2_Loader,
  clearFinalizeClusterStates,
  clearAttributeGraphData,
  clearPerformanceGraphData,
  getAttributeGraphData,
  setAttributeGraphData,
  getClusterMapViewData,
  addSnack,
  getFiltersValues,
  setClusterMapViewData,
  setMapViewLoader,
  getCombinedFiltersValues,
};

export default connect(
  mapStateToProps,
  mapActionsToProps
)(withRouter(FinalizeClusterComponent));
