import { cloneDeep } from "lodash";
import { isEcomPlan } from "modules/assortsmart/utils-assortsmart/utilityFunctions";

export const formatStoreGrps = (storeGrps, defaultStore, props) => {
  // getting store grp options with label as store name + store count
  return storeGrps.map((storeGrp) => {
    if (storeGrp.name === defaultStore) {
      props.setSelectedStoreGrp(storeGrp.sg_code);
    }
    return {
      label: `${storeGrp.name}(${storeGrp.store_count})`,
      value: storeGrp.sg_code,
    };
  });
};

export const generateStoreGrps = (props, storeGrps, defaultStore) => {
  // getting all the store formatting into store grp options and returning
  let grps = [];
  grps = [...formatStoreGrps(storeGrps, defaultStore, props)];
  return grps;
};

export const onStoreGrpChange = (props, option) => {
  //If there is option, then set the value of that option to selected grp
  //Else set empty string as selected grp
  props.setSelectedStoreGrp(!option || option === "" ? "" : option.value);
  props.setDisplayAttribTable(false);
};

export const handleAttributeChange = (props, option) => {
  const attributeSelection = cloneDeep(props.attributeSelection);
  attributeSelection[option] = !attributeSelection[option];
  props.setAttributeSelection(attributeSelection);
  props.setDisplayAttribTable(false);
};

const checkLevelsNotEqual = (planDetails, clusterInputFilterData, levelArr) => {
  let levelNotEqual = false;
  levelArr.forEach((level) => {
    if (
      planDetails[level]?.toString() !==
      clusterInputFilterData[level]?.toString()
    ) {
      levelNotEqual = true;
    }
  });
  return levelNotEqual;
};

export const runSigScore = async (planDetails, props) => {
  if (
    checkLevelsNotEqual(planDetails?.data, props.clusterInputFilterData, [
      "l0_name",
      "l1_name",
      "l2_name",
    ])
  ) {
    props.addSnack({
      message: "Please save the changed hierarchy values before proceed",
      options: {
        variant: "error",
      },
    });
    return;
  }
  if (props.selectedStoreGrp === "") {
    props.addSnack({
      message: "Please select a store group",
      options: {
        variant: "error",
      },
    });
    return;
  }
  try {
    props.setClusterInputLoader({
      loader_type: "store_selection",
      status: true,
    });
    const reqBody = {
      ...planDetails.data,
      channels: planDetails?.data?.channel,
      store_group_code: props.selectedStoreGrp || 0,
      start_date: planDetails.data["selling_period_sdate"],
      end_date: planDetails.data["selling_period_edate"],
      filters: props.planDeptLevels.map((filter) => {
        return {
          name: filter.column_name,
          value: planDetails.data[filter.column_name],
        };
      }),
    };
    reqBody.filters.push({
      name: "channel",
      value: planDetails.data?.channel,
    });
    if (planDetails.data?.sub_channel?.length > 0) {
      reqBody.filters.push({
        name: "sub_channel",
        value: planDetails.data?.sub_channel,
      });
    }
    if (planDetails?.data?.selling_period) {
      reqBody.selling_period = planDetails?.data?.selling_period;
    } else {
      reqBody.selling_period = [
        {
          start_date: planDetails?.data["selling_period_sdate"],
          end_date: planDetails?.data["selling_period_edate"],
          weightage: "100",
        },
      ];
    }
    const response = await props.calculateSigScore(
      reqBody,
      planDetails?.data?.cluster_plan_code
    );
    if (!response?.data?.data?.status) {
      props.addSnack({
        message: response?.data?.data?.message,
        options: {
          variant: "error",
        },
      });
      props.setClusterInputLoader({
        loader_type: "store_selection",
        status: false,
      });
      return;
    }
    if (!isEcomPlan(planDetails.data)) {
      //Once this is done, display a toast saying significant score calcuted
      props.addSnack({
        message: "Significant score calculated successfully",
        options: {
          variant: "success",
        },
      });
    }
    let planData = cloneDeep(planDetails);
    planData["data"]["store_group_id"] = props.selectedStoreGrp;
    props.setPlanDetails(planData);
    sessionStorage.setItem("planData", JSON.stringify(planData));
    //Display the attributes table
    props.setDisplayAttribTable(true);
    props.setClusterInputLoader({
      loader_type: "store_selection",
      status: false,
    });
  } catch (error) {
    props.setClusterInputLoader({
      loader_type: "store_selection",
      status: false,
    });
  }
};
