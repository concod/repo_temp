import { connect } from "react-redux";
import {
  setPlanDetails,
  getPlanDetails,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import { useEffect, useState } from "react";
import PlanFilterData from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/plan-filter-data";
import { Dashboard } from "modules/assortsmart/constants-assortsmart/stringContants";
import { convertCompareYrToNum } from "modules/assortsmart/utils-assortsmart/utilityFunctions";
import { Paper, Button } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import findIndex from "lodash/findIndex";
import {
  getFilterDependency,
  getFiltersOptions,
  extractDropsArr,
  removeL2NameFromPlanAttributes,
  getSelectedL2NameArray,
  configureOptions,
} from "modules/assortsmart/pages-assortsmart/Plan-Dashboard/components/common-plan-functions";
import {
  updatePlanAPI,
  setDisplayAttribTable,
  setClusterInputLoader,
  setClusterInputFilterData,
} from "modules/assortsmart/services-assortsmart/Clustering/Cluster-Input/cluster-input-service";
import {
  updateClusterPlan,
  setClusterPlanDetails,
  getClusterPlanDetails,
} from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import * as clusterPlanServiceActions from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import * as userRoleMagamentServiceActions from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Role-Management/user-role-management-service";
import { cloneDeep, isArray, isEmpty } from "lodash";
import {
  getAllFilters,
  getCombinedCrossDimensionFiltersData,
  getCombinedFiltersValues,
} from "core/actions/filterAction";
import { configurePlanInfo, getSubChannelOption } from "./edit-plan-functions";
import { useHistory } from "react-router";
import { getfilterAttributeList } from "core/commonComponents/coreComponentScreen/utils";
const useStyles = makeStyles({
  saveBtnDiv: {
    //Div corresponding to save Btn
    //To position button inside the div on right
    flex: "1rem",
    display: "flex",
    justifyContent: "flex-end",
    paddingRight: "1rem",
    paddingBottom: "1rem",
  },
  saveBtn: {
    //extracted standard width from common btn style and modified width
    width: "6rem",
  },
});
const PlanInfoComponent = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [editPlanFiltersSelections, seteditPlanFiltersSelections] = useState(
    {}
  );
  const [editPlanFilters, seteditPlanFilters] = useState([]);
  // In case l2_name is hidden, inorder to call product api while selecting l1_name we are setting all the fields to seperate variable
  const [
    editPlanFilterConfigWithL2Name,
    setEditPlanFilterConfigWithL2Name,
  ] = useState([]);
  const history = useHistory();
  const location = history.location.pathname;
  let hide_l2_name = props.screenConfiguration?.dashboard?.hide_l2_name;

  const setEditPlanLoader_1_1 = (status) => {
    props.setClusterInputLoader({ loader_type: "edit_plan", status: status });
  };

  const handleChange = async (updatedData, id) => {
    let updatedEditPlanFilterConfig = cloneDeep(editPlanFilters);
    props.setPlanDataSelected(updatedData);
    if (
      Dashboard.__Non_Hierarchy_Fields.indexOf(id) === -1 &&
      !id.includes("drop_") &&
      !id.includes("launch_")
    ) {
      let non_heirarchy_fields = id.includes("assort_selling_period_value")
        ? "assort_selling_period_value"
        : id.includes("weightage")
        ? "weightage"
        : id;
      let index = !id.split(non_heirarchy_fields)?.[1]
        ? null
        : id.split(non_heirarchy_fields)?.[1];
      if (!index) {
        const filterIdx = props.planDeptLevels.findIndex((filter) => {
          return filter.column_name === id;
        });
        props.planDeptLevels.forEach((filter, idx) => {
          if (idx > filterIdx) {
            delete updatedData[filter.column_name];
          }
        });
        seteditPlanFiltersSelections(updatedData);
        props.setPlanDataSelected(updatedData);
        //get the index of the filter from the editPlanFilters Array
        const Idx = editPlanFilters.findIndex((filter) => {
          return filter.accessor === id;
        });
        if (hide_l2_name) {
          // Add l2_name field to generate filter options
          let l2_name_field = editPlanFilterConfigWithL2Name.filter(
            (field) => field.accessor === "l2_name"
          );
          updatedEditPlanFilterConfig.push(l2_name_field[0]);
        }

        let newdependency = getFilterDependency(
          updatedData,
          editPlanFilters,
          Idx
        );
        let crossDimensionalField = [
          "l0_name",
          "l1_name",
          "l2_name",
          "l3_name",
          "channel",
        ];
        let options = [];
        if (crossDimensionalField.includes(id)) {
          let attributeArray = [];
          updatedEditPlanFilterConfig.forEach((lvl) => {
            if (lvl.dimension === "product" || lvl.dimension === "store") {
              attributeArray.push(lvl);
            }
          });
          const attributesList = getfilterAttributeList(attributeArray);
          let body = {
            application_code: 2,
            attributes: attributesList,
            filter_type: "cascaded",
            filters: newdependency,
            is_urm_filter: true,
            screen_name: "Cluster Input",
          };
          let filterElementsData = await getCombinedCrossDimensionFiltersData(
            body
          )();
          options = updatedEditPlanFilterConfig.map((key) => {
            if (key.dimension === "product" || key.dimension === "store") {
              let options = configureOptions(
                filterElementsData.data.data[key.column_name]
              );
              key.initialData = options;
              key.options = options;
            }
            return key;
          });
        } else if (newdependency?.length > 0) {
          options = await getFiltersOptions(
            newdependency,
            updatedEditPlanFilterConfig,
            setEditPlanLoader_1_1,
            Idx
          );
        }
        if (hide_l2_name) {
          // In case l2_name is hidden from fields, set all the l2_name options to editFilterConfigSelection
          let l2_name = getSelectedL2NameArray(options);
          let formValues = cloneDeep(updatedData);
          formValues["l2_name"] = l2_name;
          seteditPlanFiltersSelections(formValues);
          props.setPlanDataSelected(formValues);
          options = removeL2NameFromPlanAttributes(options);
        }
        seteditPlanFilters(options);
      }
    }
    if (id === "channel") {
      getSubChannelOption(
        props,
        updatedData[id],
        editPlanFilters,
        seteditPlanFilters,
        appCode,
        updatedData,
        seteditPlanFiltersSelections
      );
    }
    if (hide_l2_name) {
      // In case l2_name is hidden from fields, set all the l2_name options to editFilterConfigSelection
      let l2_name = getSelectedL2NameArray(editPlanFilterConfigWithL2Name);
      let formValues = cloneDeep(updatedData);
      formValues["l2_name"] = l2_name;
      seteditPlanFiltersSelections({ ...formValues, l2_name: l2_name });
    } else {
      seteditPlanFiltersSelections(updatedData);
    }
  };

  useEffect(() => {
    props.setClusterInputFilterData(editPlanFiltersSelections);
  }, [editPlanFiltersSelections]);

  const updatePlan = async () => {
    setEditPlanLoader_1_1(true);
    let requiredFieldsError = false;
    [...editPlanFilters].forEach((item) => {
      if (item.required) {
        if (
          !editPlanFiltersSelections[item.column_name] ||
          (!editPlanFiltersSelections[item.column_name]?.length &&
            !item.column_name.includes("weightage")) ||
          (item.column_name.includes("weightage") &&
            editPlanFiltersSelections[item.column_name] === "")
        ) {
          requiredFieldsError = true;
        }
      }
    });
    if (requiredFieldsError) {
      props.addSnack({
        message: "Please fill all the required fields",
        options: {
          variant: "error",
        },
      });
      setEditPlanLoader_1_1(false);
      requiredFieldsError = false;
      return;
    }
    //Integration with the Update API is pending
    let planDetailsData = cloneDeep(props.planDetails.data);
    planDetailsData.steps = 1.1;
    let reqBody = {
      ...planDetailsData,
      cluster_type:
        props.selectedClusterTab === undefined
          ? props?.clusterPlanDetails?.data?.cluster_type
          : props.selectedClusterTab === 0
          ? "ia_recommended"
          : "upload",
      ...(typeof props.selectedStoreGroup === "number" &&
        props.selectedStoreGroup % 1 == 0 && {
          store_group_id: props.selectedStoreGroup,
        }),
      [props.screenConfiguration?.common?.drop_key.includes("drop")
        ? "drops"
        : props.screenConfiguration?.common?.drop_key ||
          "drops"]: extractDropsArr(props.planDetails["data"], "edit"),
      [props.screenConfiguration?.common?.drop_key || "flow"]: extractDropsArr(
        props.planDetails["data"],
        "edit"
      ),
      channel: editPlanFiltersSelections["channel"]
        ? Array.isArray(editPlanFiltersSelections["channel"])
          ? editPlanFiltersSelections["channel"]
          : [editPlanFiltersSelections["channel"]]
        : props.planDetails?.data?.channel,
      sub_channel: editPlanFiltersSelections["channel"]
        ? Array.isArray(editPlanFiltersSelections["sub_channel"])
          ? editPlanFiltersSelections["sub_channel"]
          : [editPlanFiltersSelections["sub_channel"]]
        : props.planDetails?.data?.sub_channel,
      compare_year:
        location.includes("cluster-smart") ||
        location.includes("cluster-dashboard")
          ? 0
          : convertCompareYrToNum(
              editPlanFiltersSelections["year_comparision_metric"]
            ),
      filters: props.planDeptLevels.map((filter) => {
        if (editPlanFiltersSelections[filter.column_name]) {
          return {
            name: filter.column_name,
            value: isArray(editPlanFiltersSelections[filter.column_name])
              ? editPlanFiltersSelections[filter.column_name]
              : [editPlanFiltersSelections[filter.column_name]],
          };
        }
        return {
          name: filter.column_name,
          value: props.planDetails.data[filter.column_name],
        };
      }),
    };
    //Yet to integrate with the API
    if (
      location.includes("cluster-smart") ||
      location.includes("cluster-dashboard")
    ) {
      let sellingPeriod = [];
      let totalWeightage = 0;
      Object.keys(editPlanFiltersSelections).map((key) => {
        if (key.includes("assort_selling_period_value")) {
          let index = key.split("assort_selling_period_value")?.[1]
            ? key.split("assort_selling_period_value")?.[1]
            : "";
          let weightage = parseInt(editPlanFiltersSelections[`weightage${index}`]) > 100 ? 100 : parseInt(editPlanFiltersSelections[`weightage${index}`]);
          sellingPeriod.push({
            end_date: editPlanFiltersSelections[
              `assort_selling_period_value${index}`
            ][1].format("YYYY-MM-DD"),
            start_date: editPlanFiltersSelections[
              `assort_selling_period_value${index}`
            ][0].format("YYYY-MM-DD"),
            weightage: weightage
          });
          reqBody[
            `weightage${index === "" ? 1 : parseInt(index) + 1}`
          ] = weightage;
          totalWeightage = totalWeightage + weightage
        }
        return key;
      });
      reqBody["selling_period"] = sellingPeriod;
      if (totalWeightage !== 100) {
        props.addSnack({
          message: "Total Weightages should add upto 100%",
          options: {
            variant: "error",
          },
        });
        setEditPlanLoader_1_1(false);
        return;
      }
      await props.updateClusterPlan(
        reqBody,
        props.planDetails?.data?.cluster_plan_code
      );
      const response = await props.getClusterPlanDetails(
        props.planDetails?.data?.cluster_plan_code
      );
      props.setPlanDetails(response?.data);
      sessionStorage.setItem("planData", JSON.stringify(response?.data));
      if (props.setReloadPlan) {
        props.setReloadPlan(true);
      }
    } else {
      await props.updatePlanAPI(
        reqBody,
        props.planDetails.data.cluster_plan_code,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      const response = await props.getPlanDetails(
        props.planDetails.data.cluster_plan_code,
        props.screenConfiguration?.common?.endpoint_project_name || "assort",
        props.planDetails?.data?.plan_code
      );
      props.setPlanDetails(response.data);
      sessionStorage.setItem("planData", JSON.stringify(response.data));
    }
    props.addSnack({
      message: "Plan updated successfully",
      options: {
        variant: "success",
      },
    });
    props.setDisplayAttribTable(false);
    if (
      !(
        location.includes("cluster-smart") ||
        location.includes("cluster-dashboard")
      )
    ) {
      setEditPlanLoader_1_1(false);
    }
  };

  useEffect(() => {
    //Prepare the plan Info array as required for the form component to render
    if (props.isPlanInfoFetched && !isEmpty(props.planDetails)) {
      configurePlanInfo(
        props,
        props.planDetails,
        props.planDeptLevels,
        history,
        setEditPlanFilterConfigWithL2Name,
        seteditPlanFilters,
        seteditPlanFiltersSelections,
        hide_l2_name,
        appCode,
        props.setPlanDataSelected
      );
    }
  }, [props.isPlanInfoFetched]);

  const assortAppIndex = findIndex(
    props.applicationCodesList,
    (item) => item.name === "AssortSmart"
  );

  const appCode =
    props.applicationCodesList?.[assortAppIndex]?.application_code || 2;
  return (
    <>
      <Paper className={globalClasses.paper}>
        <PlanFilterData
          screen_name={"cluster_input"}
          planAttributes={[...editPlanFilters]}
          selectedData={editPlanFiltersSelections}
          handleChange={handleChange}
          location={location}
        />
        <div className={classes.saveBtnDiv}>
          <Button
            variant="contained"
            color="primary"
            onClick={updatePlan}
            id="assortClusterEditPlanSaveBtn"
          >
            Save
          </Button>
        </div>
      </Paper>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state),
    userAccessList: userRoleMagamentServiceActions.userAccessListSelector(
      state
    ),
    clusterPlanDetails: clusterPlanServiceActions.clusterPlanDetailsSelector(
      state
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
    applicationCodesList: state.filterReducer.applicationCodesList,
  };
};
const mapActionsToProps = {
  addSnack,
  updatePlanAPI,
  setPlanDetails,
  getPlanDetails,
  setDisplayAttribTable,
  setClusterInputLoader,
  getAllFilters,
  setClusterInputFilterData,
  updateClusterPlan,
  setClusterPlanDetails,
  getClusterPlanDetails,
  getCombinedFiltersValues,
};
export default connect(mapStateToProps, mapActionsToProps)(PlanInfoComponent);
