import { useEffect, useRef, useState } from "react";
import { useHistory } from "react-router";
import PlanInfoComponent from "./components/edit-plan-component";
import StoreSelection from "./components/store-selection";
import AttributesTables from "./components/attribute-tables";
import ClusterPlanTabViewComponent from "./components/cluster-plan-tab-view-component";
import ClusterPlanPercentageLoader from "./components/cluster-plan-percentage-loader";
import ClusterPlanFileUpload from "./components/cluster-plan-file-upload-component";
import { isEmpty } from "lodash";
import {
  getStoreChannels,
  setClusterInputLoader,
  updatePlanAPI,
  uploadClusterData,
  validateClusterData,
  getChannelBasedStoreGroups,
  setSelectedStoreGrp,
  setDisplayAttribTable,
  resetClusterSelectionFields,
} from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import {
  setClusterPlanDetails,
  updateClusterPlan,
  getClusterPlanDetails,
} from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import { connect } from "react-redux";
import { setPlanDetails } from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as clusterInputServiceActions from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import * as clusterPlanServiceActions from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import { addSnack } from "core/actions/snackbarActions";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  updatePlan,
  getStoreGrps,
  fetchInputClusterData,
} from "./cluster-initial-function";
import { makeStyles } from "@mui/styles";
import { configureFiltersResponse } from "./components/common-functions";
import { CSV_CONFIG } from "modules/clusterSmart/constants-clustersmart/stringConstants";

const useStyles = makeStyles((theme) => ({
  file_upload_container: {
    padding: theme.spacing(6.25),
  },
}));

const InputClusteringComponent = (props) => {
  const [channelBasedStoreGrps, setchannelBasedStoreGrps] = useState([]);
  const [channelOptions, setchannelOptions] = useState([]);
  const [selectedChannel, setselectedChannel] = useState([]);
  const [isClusterInputMount, setisClusterInputMount] = useState(true);
  const [channelType, setChannelType] = useState("single");
  const [errorMessage, setErrorMessage] = useState("");
  const history = useHistory();
  const location = history.location.pathname;

  const clusterInputMethods = ["IA Recommended Metrics", "Upload Clusters"];
  const acceptedFileTypes = [".xlsx", ".csv"];
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [selectedClusterFile, setSelectedClusterFile] = useState([]);
  const downloadTemplateRef = useRef(null);
  const centerLoaderStyles = useRef({margin: "14rem 45rem"});
  const classes = useStyles();
  const hideClusterTabs =
    props.screenConfiguration?.["1.1"]?.hide_upload_cluster; // hide cluster tabs in uat temporarily

  const onFileUpload = (files) => {
    setSelectedClusterFile(files);
  };

  const handleReupload = () => {
    setSelectedClusterFile([]);
    props.setIsClusterUploaded(null);
    setFileUploadProgress(0);
  };

  useEffect(() => {
    if (selectedClusterFile[0]) {
      (async () => {
        try {
          const upload_filters = {
            plan_code: [props.planDetails?.data?.cluster_plan_code.toString()],
            ...configureFiltersResponse(
              props.planDeptLevels,
              props.planDetails?.data
            )?.reduce((acc, filter, index) => {
              acc[filter.name] = filter.value;
              return acc;
            }, {}),
            channel: props.planDetails?.data?.channel,
            ...(props.planDetails?.data?.channel?.length && {
              sub_channel: props.planDetails?.data?.channel,
            }),
            time_period: [
              {
                start_date: props.planDetails?.data?.selling_period?.length
                  ? props.planDetails?.data?.selling_period?.[0]?.start_date
                  : props.planDetails?.data?.selling_period_sdate,
                end_date: props.planDetails?.data?.selling_period?.length
                  ? props.planDetails?.data?.selling_period?.[0]?.end_date
                  : props.planDetails?.data?.selling_period_edate,
                weightage: props.planDetails?.data?.selling_period?.length
                  ? props.planDetails?.data?.selling_period?.[0]?.weightage
                  : "100",
              },
            ],
          };
          const validateFormData = new FormData();
          validateFormData.append("upload_file", selectedClusterFile[0]);
          validateFormData.append(
            "filters",
            JSON.stringify({ channel: [...upload_filters.channel] })
          );
          let validateClusterResponse = await props.validateClusterData(
            validateFormData,
            "cluster-smart",
            props.planDetails?.data?.cluster_plan_code
          );
          if (validateClusterResponse?.data?.data?.status) {
            setFileUploadProgress(75);
          } else {
            setErrorMessage(validateClusterResponse?.data?.data?.message);
            setFileUploadProgress(100);
            props.setIsClusterUploaded(false);
            return;
          }

          const formData = new FormData();
          formData.append("upload_file", selectedClusterFile[0]);
          formData.append("filters", JSON.stringify(upload_filters));
          let uploadClusterResponse = await props.uploadClusterData(
            formData,
            "cluster-smart",
            props.planDetails?.data?.cluster_plan_code
          );

          if (
            uploadClusterResponse?.data?.status ||
            (uploadClusterResponse?.status &&
              uploadClusterResponse?.message === "")
          ) {
            props.setIsClusterUploaded(true);
          } else {
            props.setIsClusterUploaded(false);
          }
          setFileUploadProgress(100);
        } catch (error) {
          setFileUploadProgress(100);
          props.setIsClusterUploaded(false);
        }
      })();
    }
  }, [selectedClusterFile]);

  useEffect(() => {
    if (props.planDetails?.data?.channel) {
      getStoreGrps(
        props,
        props.planDetails?.data?.channel,
        props.planDetails?.data?.sub_channel,
        setchannelBasedStoreGrps
      );
    }
  }, [props.planDetails?.data]);

  useEffect(() => {
    if (props.isPlanInfoFetched && !isClusterInputMount) {
      fetchInputClusterData(
        props,
        location,
        setchannelOptions,
        setselectedChannel,
        setchannelBasedStoreGrps
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.isPlanInfoFetched, isClusterInputMount]);

  useEffect(() => {
    setChannelType(
      props.screenConfiguration?.["1.1"]?.[
        "assort_channel_type_selection_1.1"
      ] || "single"
    );
    setisClusterInputMount(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.screenConfiguration]);

  useEffect(()=>{
    if(window.innerHeight && window.pageYOffset && (props.loader_1_1)){
      centerLoaderStyles.current = {
        margin: `calc(${window.innerHeight}px + ${window.pageYOffset}px - 650px) 45rem`,
      }
    }
  },[props.loader_1_1]);

  const onChannelChange = async (newValue) => {
    setselectedChannel(newValue);
    updatePlan(
      props,
      newValue,
      location,
      setchannelBasedStoreGrps,
      props.clusterPlanDetails?.data?.cluster_type
    );
  };

  const UploadFileComponent = () => (
    <>
      {!selectedClusterFile[0] && (
        <div className={classes.file_upload_container}>
          <ClusterPlanFileUpload
            onFileUpload={onFileUpload}
            acceptedFileTypes={acceptedFileTypes.toString()}
            downloadTemplateRef={downloadTemplateRef}
            fileName={`cluster_plan_${props.planDetails?.data?.cluster_plan_code}`}
            headerList={CSV_CONFIG}
            data={[]}
          />
        </div>
      )}
      {selectedClusterFile[0] && (
        <ClusterPlanPercentageLoader
          progress={fileUploadProgress}
          fileName={selectedClusterFile[0]?.name}
          selectedClusterFile={selectedClusterFile}
          isClusterUploaded={props.isClusterUploaded}
          setSelectedClusterFile={setSelectedClusterFile}
          handleReUpload={handleReupload}
          errorMessage={errorMessage}
        />
      )}
    </>
  );

  const IARecommendedMetricsComponent = () => (
    <>
      <StoreSelection
        storeGrps={channelBasedStoreGrps}
        selectedChannel={selectedChannel}
        channels={channelOptions}
        channelType={channelType}
        setselectedChannel={onChannelChange}
        {...props}
      />
      {props.displayAttributes && <AttributesTables {...props} />}
    </>
  );

  const clusterMethodTabList = {
    "IA Recommended Metrics": IARecommendedMetricsComponent,
    "Upload Clusters": UploadFileComponent,
  };

  const onTabChange = (value) => {
    props.setSelectedClusterTab(value);
    props.setSteps([
      {
        isEditable: true,
        isCompleted: false,
        screenCode: "1.1",
        label: "Cluster Input",
      },
      {
        isEditable: false,
        isCompleted: false,
        screenCode: "1.2",
        label: "Finalize Cluster",
      },
    ]);
  };

  return (
    <>
      <LoadingOverlay loader={props.loader_1_1} centerLoaderStyles={centerLoaderStyles.current} spinner>
        <PlanInfoComponent {...props} setReloadPlan={props.setReloadPlan} />
        {!hideClusterTabs ? (
          <ClusterPlanTabViewComponent
            clusterMethodTabValues={clusterMethodTabList}
            onChangeTab={(value) => onTabChange(value)}
            clusterInputMethods={clusterInputMethods}
            selectedClusterTab={props.selectedClusterTab}
          />
        ) : (
          IARecommendedMetricsComponent()
        )}
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    loader_1_1:
      clusterInputServiceActions.clusterInputIndexLoader_1_1Selector(store) ||
      clusterInputServiceActions.clusterInputEditPlanLoader_1_1Selector(
        store
      ) ||
      clusterInputServiceActions.clusterInputStoreSelectionLoader_1_1Selector(
        store
      ) ||
      clusterInputServiceActions.clusterInputAttributesTableLoader_1_1Selector(
        store
      ),
    planDetails: planDashboardServiceActions.planDetailsDataSelector(store),
    displayAttributes: clusterInputServiceActions.displayAttribTableSelector(
      store
    ),
    selectedStoreGroup: clusterInputServiceActions.selectedStoreGrpSelector(
      store
    ),
    clusterPlanDetails: clusterPlanServiceActions.clusterPlanDetailsSelector(
      store
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      store
    ),
  };
};
const mapActionsToProps = {
  getStoreChannels,
  setClusterInputLoader,
  updatePlanAPI,
  uploadClusterData,
  validateClusterData,
  getChannelBasedStoreGroups,
  setPlanDetails,
  setSelectedStoreGrp,
  setDisplayAttribTable,
  addSnack,
  resetClusterSelectionFields,
  setClusterPlanDetails,
  updateClusterPlan,
  getClusterPlanDetails,
};
export default connect(
  mapStateToProps,
  mapActionsToProps
)(InputClusteringComponent);
