import {
  configureOptions,
  generateFilterConfig,
  removeL2NameFromPlanAttributes,
} from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
import { getChannelOptions } from "modules/clusterSmart/pages-clustersmart/Clustering/Cluster-Input/components/common-functions";
import moment from "moment";
import findIndex from "lodash/findIndex";
import { cloneDeep } from "lodash";
import { updateLyColumnHeading } from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { getfilterAttributeList } from "core/commonComponents/coreComponentScreen/utils";
import { getCombinedCrossDimensionFiltersData } from "core/actions/filterAction";

export const getSubChannelOption = async (
  props,
  selectedChannel,
  config,
  setConfig,
  appCode,
  updatedData,
  setFilterSelected
) => {
  //based on selected channel populating sub channel options
  let subChannelResponse = await props.getCombinedFiltersValues({
    application_code: appCode,
    attributes: [
      {
        attribute_name: "sub_channel",
        dimension: "store",
      },
    ],
    filter_type: "cascaded",
    filters: [
      {
        attribute_name: "channel",
        dimension: "store",
        filter_id: "channel",
        filter_type: "cascaded",
        operator: "in",
        values: Array.isArray(selectedChannel)
          ? selectedChannel
          : [selectedChannel],
      },
    ],
  });
  if (subChannelResponse?.data?.status) {
    let subChannelList = subChannelResponse?.data?.data?.sub_channel || [];
    let options = subChannelList.map((item) => {
      return {
        label: item,
        value: item,
        id: item,
      };
    });
    let subChannelIndex = findIndex(
      config,
      (item) => item.column_name === "sub_channel"
    );
    let updatedFilterConfig = cloneDeep(config);
    if (subChannelIndex !== -1) {
      updatedFilterConfig[subChannelIndex].options = options;
      config[subChannelIndex].options = options;
    }
    if (updatedData) {
      let filtersSelected = cloneDeep(updatedData);
      filtersSelected["sub_channel"] = filtersSelected["channel"];
      setFilterSelected(filtersSelected);
      setConfig(updatedFilterConfig);
    }
  }
};

export const configurePlanInfo = async (
  props,
  planData,
  filterData,
  history,
  setEditPlanFilterConfigWithL2Name,
  seteditPlanFilters,
  seteditPlanFiltersSelections,
  hide_l2_name,
  appCode,
  setPlanDataSelected
) => {
  const param = "assort edit plan";
  const editPlanFilterResponse = await props.getAllFilters(param);
  let editPlanFilterConfig = [];
  if (editPlanFilterResponse?.data?.status) {
    editPlanFilterConfig = await generateFilterConfig(
      editPlanFilterResponse?.data?.data,
      props.type,
      props.userAccessList,
      null,
      null,
      null,
      null,
      planData?.data
    );
    let attributeArray = [];
    editPlanFilterResponse.data.data.forEach(lvl=>{
      if(lvl.dimension === "product" || lvl.dimension === "store"){
        attributeArray.push(lvl)
      }
    })
    const attributesList = getfilterAttributeList(attributeArray);
    let newdependency = [];
    filterData?.forEach((obj,index)=>{
      if(index + 1 !== filterData.length){
        newdependency.push({
          "attribute_name": obj.column_name,
          "operator": "in",
          "values": planData?.data[obj.column_name],
          "filter_type": "cascaded",
          "dimension": "product"
        })
      }
    });
    let body = {
      application_code: 2,
      attributes: attributesList,
      filter_type: "cascaded",
      filters: newdependency,
      is_urm_filter: true,
      screen_name: "Cluster Input"
    };
    let filterElementsData = await getCombinedCrossDimensionFiltersData(
      body
    )();
    editPlanFilterConfig = editPlanFilterConfig.map((key) => {
      if (key.dimension === "product" || key.dimension === "store") {
        let options = configureOptions(
          filterElementsData.data.data[key.column_name]
        );
        key.initialData = options;
        key.options = options;
      }
      return key;
    });
  }
  // In case l2_name is hidden, inorder to call product api while selecting l1_name we are setting all the fields to seperate variable
  setEditPlanFilterConfigWithL2Name(editPlanFilterConfig);
  if (hide_l2_name) {
    editPlanFilterConfig = removeL2NameFromPlanAttributes(editPlanFilterConfig);
  }
  const channels = await getChannelOptions(
    history.location.pathname,
    props.screenConfiguration
  );
  editPlanFilterConfig.forEach((item) => {
    if (item.accessor === "channel") {
      item.options = channels;
    }
  });
  editPlanFilterConfig.map((config) => {
    if (config.column_name === "weightage") {
      config.value_type = "percentage";
    }
  });
  await getSubChannelOption(
    props,
    planData.data.channel,
    editPlanFilterConfig,
    seteditPlanFilters,
    appCode
  );
  seteditPlanFilters(editPlanFilterConfig);
  if (planData.data["selling_period"]?.length > 1) {
    let addedField = editPlanFilterConfig.filter(
      (filter) =>
        filter.accessor === "assort_selling_period_value" ||
        filter.accessor === "weightage"
    );
    let fixedField = addedField;
    let editPlanConfig = editPlanFilterConfig;
    planData.data["selling_period"].map((period, index) => {
      addedField = cloneDeep(fixedField);
      if (index) {
        addedField.map((field) => {
          field.accessor = field?.accessor + index;
          field.column_name = field?.column_name + index;
        });
        editPlanConfig.push(...addedField);
      }
    });
    seteditPlanFilters(editPlanConfig);
  }
  let planFieldValues = {};
  planFieldValues["cluster_name"] = planData.data["name"];
  filterData.forEach((filter) => {
    planFieldValues[filter.column_name] =
      planData.data[filter.column_name] &&
      (planData.data[filter.column_name]?.length > 1
        ? planData.data[filter.column_name]
        : planData.data[filter.column_name][0]);
  });
  planFieldValues["year_comparision_metric"] = updateLyColumnHeading(
    planData.data["compare_year"]
  );
  if (planData.data["selling_period"]?.length) {
    planData.data["selling_period"].map((period, index) => {
      if (index) {
        planFieldValues[`assort_selling_period_value${index}`] = [
          moment(period["start_date"], "YYYY-MM-DD"),
          moment(period["end_date"], "YYYY-MM-DD"),
        ];
        planFieldValues[`weightage${index}`] = period["weightage"];
      } else {
        planFieldValues["assort_selling_period_value"] = [
          moment(period["start_date"], "YYYY-MM-DD"),
          moment(period["end_date"], "YYYY-MM-DD"),
        ];
        planFieldValues[`weightage`] = period["weightage"];
      }
    });
  } else {
    planFieldValues["assort_selling_period_value"] = [
      moment(planData.data["selling_period_sdate"], "YYYY-MM-DD"),
      moment(planData.data["selling_period_edate"], "YYYY-MM-DD"),
    ];
    planFieldValues[`weightage`] = 100;
  }
  const planDeadline = moment(planData.data["deadline_date"], "YYYY-MM-DD");
  if (planDeadline.isValid()) {
    planFieldValues["completion_deadline"] = planDeadline;
  }
  planFieldValues["channel"] = planData.data.channel;
  planFieldValues["sub_channel"] = planData.data.sub_channel;
  seteditPlanFiltersSelections(planFieldValues);
  setPlanDataSelected(planFieldValues);
};
