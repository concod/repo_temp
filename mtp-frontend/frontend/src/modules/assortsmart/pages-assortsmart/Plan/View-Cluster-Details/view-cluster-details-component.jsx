import React, { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";
import ClusterChartComponent from "../../../../clusterSmart/pages-clustersmart/Clustering/Finalize-Cluster/cluster-chart-component";
import ClusterBreakdownComponent from "../../../../clusterSmart/pages-clustersmart/Clustering/Finalize-Cluster/cluster-breakdown-component";
import LoadingOverlay from "core/Utils/Loader/loader";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";
import { isEmpty } from "lodash";
import {
  set1_2_Loader,
  getAttributeGraphData,
  setAttributeGraphData,
  clearFinalizeClusterStates,
} from "../../../services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import {
  isChannelMultiple,
  prepareAttrGraphPayload,
} from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import {
  channelFilterFinalizeCluster,
  Plan,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import * as clusterPlanServiceActions from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import FilterModal from "core/commonComponents/filterModal/FilterModal";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import Filters from "core/commonComponents/filters/filterGroup";
import FilterChips from "core/commonComponents/filters/filterChips";
import { ATTRIBUTES_CLUSTERING } from "modules/clusterSmart/constants-clustersmart/stringConstants";

const ViewClusterGradeComponent = (props) => {
  const [attributeBucketId, setAttributeBucketId] = useState("");
  const [channelAttributeBucketId, setChannelAttributeBucketId] = useState({});
  const [performanceBucketId, setPerformanceBucketId] = useState("");
  const [channelPerformanceBucketId, setChannelPerformanceBucketId] = useState(
    {}
  );
  const [selectedProductAttribute, setSelectedProductAttribute] = useState("");
  const [showChannelFilterButton, setChannelFilterButton] = useState(false);
  const [filterPopup, setFilterPopup] = useState(false);
  const [filterSelection, setFilterSelection] = useState({});
  const [filters, setFilters] = useState([]);
  const [filterDependency, setFilterDependency] = useState([]);
  const [filterChip, setFilterChip] = useState([]);
  const [initialValue, setInitialValue] = useState([]);
  let [attributeJson, setAttributeJson] = useState({});
  const [attributeSelection, setAttributeSelection] = useState({
    performance: false,
    product: false,
  });
  const classes = useStyles();
  useEffect(() => {
    if (
      !isEmpty(props.attributeGraphData) &&
      !isEmpty(props.performanceGraphData) &&
      !isEmpty(selectedProductAttribute) &&
      !isEmpty(attributeBucketId) &&
      !isEmpty(props.clusterBreakdownData)
    ) {
      props.set1_2_Loader(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    props.attributeGraphData,
    props.performanceGraphData,
    selectedProductAttribute,
    attributeBucketId,
    props.clusterBreakdownData,
  ]);

  useEffect(() => {
    const fetchData = async () => {
      if (isChannelMultiple(props.planDetails?.data)) {
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
        channelSelected["channel"] = options[0]?.value;
        setFilterSelection(channelSelected);
        const initialValue = [
          {
            filter_id: "channels",
            filter_type: "cascaded",
            dimension: "channel",
            values: [options[0]],
          },
        ];
        setFilterDependency(initialValue);
        setInitialValue(initialValue);
        setFilterChip(initialValue);
      }
    };
    fetchData();
  }, [props.planDetails]);

  useEffect(() => {
    if (props.planDetails?.status) {
      let selection = attributeSelection;
      if (props.planDetails?.data?.selected_attribute) {
        ATTRIBUTES_CLUSTERING?.forEach((attr) => {
          if (
            props.planDetails?.data?.selected_attribute?.includes(attr.value)
          ) {
            selection[attr.value] = true;
          } else {
            selection[attr.value] = false;
          }
        });
        setAttributeSelection(selection);
      } else {
        selection["performance"] = true;
        selection["product"] = true;
        setAttributeSelection(selection);
      }
    }
  }, [props.planDetails?.data]);

  const setSelectedIds = (id, graphType, isOnchange = false) => {
    if (graphType === "attribute") {
      setAttributeBucketId(id);
      let selectedChannel =
        props.selectedValue?.value || props.planDetails?.data?.channel[0];
      if (isOnchange) {
        setAttributeBucketIdFn(id);
      }
    } else {
      setPerformanceBucketId(id);
      if (isOnchange) {
        setPerformanceBucketIdFn(id);
      }
    }
  };

  const setAttributeBucketIdFn = (id, chan = "") => {
    if (id) {
      let attrBucketId = channelAttributeBucketId;
      let selectedChannel = chan
        ? chan
        : filterSelection["channel"] || props.planDetails?.data?.channel[0];
      attrBucketId[selectedChannel] = parseInt(id);
      setChannelAttributeBucketId(attrBucketId);
    }
  };

  const setPerformanceBucketIdFn = (id, chan = "") => {
    if (id) {
      let prefBucketId = channelPerformanceBucketId;
      let selectedChannel = chan
        ? chan
        : filterSelection["channel"] || props.planDetails?.data?.channel[0];
      prefBucketId[selectedChannel] = parseInt(id);
      setChannelPerformanceBucketId(prefBucketId);
    }
  };

  const onFilter = async () => {
    let filterSelection = {};
    filterSelection["channel"] = filterDependency?.[0]?.values?.[0]?.value;
    setFilterSelection(filterSelection);
    setFilterPopup(false);
    try {
      props.set1_2_Loader(true);
      props.clearFinalizeClusterStates();
      let planData = props.planDetails?.data;
      let formData = {
        // attributeBucketId: attributeBucketId,
        // attribute: selectedProductAttribute,
      };
      if (filterDependency?.[0]?.values?.[0]) {
        formData.channel = filterDependency?.[0]?.values?.[0]?.value;
      }
      setFilterChip(filterDependency);
      let reqBodyAttrGraph = prepareAttrGraphPayload(
        planData,
        formData,
        props,
        props?.clusterPlanDetails?.data
      );
      let graphResponse = await props.getAttributeGraphData(
        reqBodyAttrGraph,
        props.clusterPlanDetails?.data?.cluster_plan_code
      );
      props.setAttributeGraphData(graphResponse?.data);
    } catch (error) {
      console.log("error:", error);
    }
  };

  const onReset = () => {};

  const handleChange = (updatedValue) => {
    setFilterDependency(updatedValue);
  };

  return (
    <Dialog
      maxWidth={"lg"}
      aria-labelledby="customized-dialog-title"
      open={props.showViewClusterModal}
      fullWidth={true}
      onClose={() => props.toggleViewClusterModal(false)}
    >
      <DialogTitle id="customized-dialog-title">
        <Grid
          container
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Typography variant="h5" gutterBottom>
            {" "}
            View cluster details
          </Typography>
          <IconButton aria-label="close" size="large">
            <CloseIcon onClick={() => props.toggleViewClusterModal(false)} />
          </IconButton>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <div className={classes.contentBody}>
          {showChannelFilterButton && (
            <Grid
              container
              direction="row-reverse"
              justifyContent="space-between"
              alignItems="center"
            >
              <Grid>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<FilterAltOutlinedIcon />}
                  onClick={() => setFilterPopup(true)}
                  disabled={props.isLoading || props.loader_1_2}
                >
                  Select Filters
                </Button>
              </Grid>
            </Grid>
          )}
          <FilterModal
            open={filterPopup}
            isModalFixedTop={true}
            closeOnOverlayClick={() => setFilterPopup(false)}
            showFilterButton={true}
            hideOverflow={true}
          >
            <CustomAccordion label="Filter" defaultExpanded={true}>
              <LoadingOverlay loader={props.isLoading} minHeight={200}>
                <Filters
                  isViewCluster={true}
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
          {filterChip.length > 0 && (
            <FilterChips filterConfig={filterChip}></FilterChips>
          )}
          <LoadingOverlay loader={props.loader_1_2}>
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
              fromPlanBudgetScreen={true}
              channelSelected={filterSelection["channel"]}
              setPerformanceBucketId={setPerformanceBucketIdFn}
              setAttributeBucketId={setAttributeBucketIdFn}
              attributeBucketId={channelAttributeBucketId}
              performanceBucketId={channelPerformanceBucketId}
              attributeSelection={attributeSelection}
              type={props.type}
              setAttributeJson={setAttributeJson}
              attributeJson={attributeJson}
            />
            <ClusterBreakdownComponent
              attributeClusterBucket={attributeBucketId}
              performanceClusterBucket={performanceBucketId}
              fromPlanBudgetScreen={true}
              channelSelected={filterSelection["channel"]}
              setClusterEditTableData={props.setClusterEditTableData}
              viewState="table"
              selectedProductAttribute={selectedProductAttribute}
              attributeBucketId={channelAttributeBucketId}
              performanceBucketId={channelPerformanceBucketId}
            />
          </LoadingOverlay>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const mapStateToProps = (store) => {
  return {
    loader_1_2: store.assortsmartReducer.finalizeClusterReducer.loader_1_2,
    performanceGraphData:
      store.assortsmartReducer.finalizeClusterReducer.performanceGraphData,
    attributeGraphData:
      store.assortsmartReducer.finalizeClusterReducer.attributeGraphData,
    clusterBreakdownData:
      store.assortsmartReducer.finalizeClusterReducer.clusterBreakdownData,
    planLevels: store.assortsmartReducer.planDashboardReducer.planLevels,
    clusterPlanDetails: clusterPlanServiceActions.clusterPlanDetailsSelector(
      store
    ),
  };
};

const mapDispatchToProps = (dispatch) => ({
  set1_2_Loader: (payload) => dispatch(set1_2_Loader(payload)),
  getAttributeGraphData: (payload, objID) =>
    dispatch(getAttributeGraphData(payload, objID)),
  setAttributeGraphData: (payload) => dispatch(setAttributeGraphData(payload)),
  clearFinalizeClusterStates: (payload) =>
    dispatch(clearFinalizeClusterStates(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(withRouter(ViewClusterGradeComponent));
