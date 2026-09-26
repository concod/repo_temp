import { extractDropsArr } from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
import {
  configureFiltersResponse,
  getSelectedChannel,
  getChannelOptions,
} from "./components/common-functions";
import { cloneDeep } from "lodash";

//Get store Groups for respective channel
export const getStoreGrps = async (
  props,
  channel,
  subChannel,
  setchannelBasedStoreGrps
) => {
  const storeGrpResp = await props.getChannelBasedStoreGroups(
    channel,
    subChannel,
    props.planDetails?.data?.cluster_plan_code
  );
  setchannelBasedStoreGrps(storeGrpResp.data.data);
  props.setClusterInputLoader({ loader_type: "edit_plan", status: false });
};

//Update the plan
export const updatePlan = async (
  props,
  newChannel,
  location,
  setchannelBasedStoreGrps,
  clusterType
) => {
  props.setClusterInputLoader({ loader_type: "edit_plan", status: true });
  let planDetails = cloneDeep(props.planDetails);
  planDetails["data"]["channel"] = newChannel;
  props.setPlanDetails(planDetails);
  sessionStorage.setItem("planData", JSON.stringify(planDetails));
  const reqBody = {
    ...planDetails.data,
    cluster_type: clusterType
      ? clusterType
      : props.selectedClusterTab === 0
      ? "ia_recommended"
      : "upload",
    [props.screenConfiguration?.common?.drop_key.includes("drop")
      ? "drops"
      : props.screenConfiguration?.common?.drop_key ||
        "drops"]: extractDropsArr(props.planDetails["data"], "edit"),
    [props.screenConfiguration?.common?.flow_key || "flow"]: extractDropsArr(
      props.planDetails["data"],
      "edit"
    ),
    ...(typeof props.selectedStoreGroup === "number" &&
      props.selectedStoreGroup % 1 === 0 && {
        store_group_id: props.selectedStoreGroup,
      }),
    filters: configureFiltersResponse(
      props.planDeptLevels,
      props.planDetails["data"]
    ),
  };
  try {
    // Call update API to update the channel Type and fetch the stores for the respective channel Type
    if (
      location.includes("cluster-smart") ||
      location.includes("cluster-dashboard")
    ) {
      await props.updateClusterPlan(
        reqBody,
        planDetails?.data?.cluster_plan_code
      );
    } else {
      await props.updatePlanAPI(
        reqBody,
        planDetails.data.cluster_plan_code,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
    }
    await getStoreGrps(
      props,
      newChannel,
      planDetails.data.sub_channel,
      setchannelBasedStoreGrps
    );
    //const plandata = location.includes("cluster-smart") ? props.clusterPlanDetails : props.planDetails;
    const plandata = props.planDetails;
    if (plandata?.data?.channels !== newChannel) {
      props.setDisplayAttribTable(false);
      props.setSelectedStoreGrp("");
    }
    props.setClusterInputLoader({ loader_type: "edit_plan", status: false });
  } catch (error) {
    props.addSnack({
      message: "Update plan failed",
      options: {
        variant: "error",
      },
    });
    props.setSelectedStoreGrp("");
    props.setDisplayAttribTable(false);
    props.setClusterInputLoader({ loader_type: "edit_plan", status: false });
  }
};

export const fetchInputClusterData = async (
  props,
  location,
  setchannelOptions,
  setselectedChannel,
  setchannelBasedStoreGrps
) => {
  try {
    //loading to true
    props.setClusterInputLoader({ loader_type: "index", status: true });
    const channels = await getChannelOptions(
      location,
      props.screenConfiguration
    );
    setchannelOptions(channels);

    const planData = props.planDetails;
    const channel = getSelectedChannel(planData);
    setselectedChannel(channel);
    await getStoreGrps(
      props,
      channel,
      props.planDetails?.data?.sub_channel,
      setchannelBasedStoreGrps
    );
    //If the plan step is beyond 1-1, clustering results are
    //already obtained, so we can display attributes table
    //and set the store group to the respective group code
    const planDetails = props.planDetails?.data;
    if (planDetails?.steps > 1.1 && planDetails.cluster_type !== "upload") {
      props.setSelectedStoreGrp(planDetails?.store_group_id);
      props.setDisplayAttribTable(true);
    }

    //loading to false
    props.setClusterInputLoader({ loader_type: "index", status: false });
  } catch (error) {
    //loading to false
    props.setClusterInputLoader({ loader_type: "index", status: false });
  }
};
