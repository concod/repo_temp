import { useEffect, useRef, useState } from "react";
import { Paper, Typography } from "@mui/material";
import makeStyles from "@mui/styles/makeStyles";
import GlobalStyles from "core/Styles/globalStyles";
import AgGridTable from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { filterAccessibleTableData } from "core/Utils/filter-accessible-data";
import { formattedDate } from "core/Utils/formatter";
import { DEFAULT_DATE_FORMAT } from "config/constants";
import { useStyles as tickerStyles } from "core/Utils/styles/assortSmartUsestyles";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import Ticker from "core/commonComponents/ticker";
import { Prompt } from "impact-ui";
import { cloneDeep, isEmpty } from "lodash";
import {
  COMPAREPLAN,
  HINDSIGHT_PLAN_VIEW,
  MASTER_PLAN,
  OMNI_MAPPING_SCREEN,
  STRATEGY_VIEW,
} from "modules/assortsmart/constants-assortsmart/routesContants";
import {
  Dashboard,
  common,
  mfpDataMetrics,
} from "modules/assortsmart/constants-assortsmart/stringContants";
import { getUrmFilters } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Role-Management/user-role-management-service";
import { clusterSmartRollupDownload } from "modules/assortsmart/services-assortsmart/Clustering/Finalize-Cluster/finalize-cluster-service";
import {
  callColorwaySeasonFinalized,
  callPlaceholderOid,
} from "modules/assortsmart/services-assortsmart/OmniChannel/omni-channel-service";
import {
  createMasterPlan,
  deleteClusterPlans,
  deletePlans,
  deleteHindsightPlans,
  downloadBuyRollupData,
  downloadMFPData,
  fetchAssortDashboardTableData,
  fetchMFPUploadData,
  finalizeForPO,
  getPlanDetails,
  getPlanLevels,
  getSummaryViewData,
  mapStyleData,
  masterPlanDashboardData,
  setDashboardLoader,
  setLevelsJson,
  setPlansData,
  updateMFPUploadData,
  uploadMFPData,
  fetchAssortHindsightDashboardTableData,
  updateJDAStatus,
} from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import PlanInfo from "./PlanInfo";
import { fetchClusterDashboardTableData } from "modules/clusterSmart/services-clustersmart/ClusterPlan/cluster-plan-service";
import moment from "moment";
import { getUserDetails } from "core/pages/tenant-config/access-user-management/services/TenantManagement/User-Management/user-management-service";
import { connect } from "react-redux";
import { useHistory } from "react-router";
import LoadingOverlay from "../../../../../core/Utils/Loader/loader";
import { getColumnsAg } from "../../../../../core/actions/tableColumnActions";
import {
  assortAgGridCustomCellRenderer,
  getFiltersRespArr,
  getPlanPayload,
  isEcomPlan,
} from "../../../utils-assortsmart/utilityFunctions";
import CopyPlanModal from "./create-or-copy-plan-modal";
import DashboardActionButtons from "./dashboardActionButtons";
import {
  configureFetchPlansPayload,
  handleComparePlanValidation,
  handleDownloadValidation,
} from "./common-plan-functions";
import { preSeasonDashboardData } from "./dashboard-columns";

const useStyles = makeStyles({
  headerDiv: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "1rem",
  },
  topMargin: {
    marginTop: "1rem",
  },
  textStyleMFP: {
    textAlign: "center",
    margin: "3rem",
    padding: "1rem",
    fontSize: "1rem",
  },
});

const allEqual = (arr) => arr.every((v) => v === arr[0]);

const Plans = (props) => {
  const classes = useStyles();
  const [plansTableCols, setPlansTableCols] = useState([]);
  const [copyPlanDetails, setcopyDetails] = useState({});
  const [seasonValues, setSeasonValues] = useState({});
  const [showModal, setShowModal] = useState({
    copy: false,
    delete: false,
  });
  const [confirmPlanEdit, setConfirmPlanEdit] = useState(false);
  const [planInstance, setPlanInstance] = useState({});
  const [MFPUploadFile, setMFPUploadFile] = useState([]);
  const [isSaveEnabled, setIsSaveEnabled] = useState(false);
  const [mfpDownloadData, setMFPDownloadData] = useState([]);
  const [confirmDeleteClusterPlan, setConfirmDeleteClusterPlan] = useState(
    false
  );
  const mfpFilters = useRef({});
  const [deleteClusterPlanMessage, setDeleteClusterPlanMessage] = useState("");
  const [urmFilters, setUrmFilters] = useState({});

  const globalClasses = GlobalStyles();
  const history = useHistory();
  const tickerClass = tickerStyles();
  const title = history.location.pathname.includes("omnichannel")
    ? "Omni Channel Dashboard"
    : history.location.pathname.includes("cluster-smart") ||
      history.location.pathname.includes("cluster-dashboard")
    ? "Clustering Dashboard"
    : history.location.pathname.includes("master-plan-dashboard")
    ? "Master plan dashboard"
    : history.location.pathname.includes("MFP-dashboard")
    ? "MFP Upload Dashboard"
    : history.location.pathname.includes("pre-season-dashboard")
    ? "Active Plans"
    : "Dashboard";
  let DashboardPlanInstance = useRef({});
  let poSheetRefLink = useRef(null);
  useEffect(() => {
    DashboardPlanInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    setMFPDownloadData([]);
  }, [props?.location]);

  useEffect(() => {
    if (props.filterRef) {
      DashboardPlanInstance?.current?.api?.refreshServerSideStore({
        purge: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.filterValues]);

  const handleSummaryView = async (selectedPlans) => {
    if (selectedPlans?.length) {
      if (history.location.pathname.includes("master-plan-dashboard")) {
        history.push({
          pathname: MASTER_PLAN,
          state: {
            selectedPlans: selectedPlans,
          },
        });
      }
    }
  };

  const onEditPlanClick = async (instance) => {
    if (instance) {
      const clusterPlanUrl = "/assort-smart/cluster-dashboard/cluster/";
      if (history.location.pathname.includes("omnichannel")) {
        //TODO: call optmization & fetch omni mapping column api
        const plan_code = instance.plan_code;
        history.push(`${OMNI_MAPPING_SCREEN}/${plan_code}`, {
          location: "editOmniPlan",
        });
      } else if (history.location.pathname.includes("hindsight-dashboard")) {
        history.push(`${HINDSIGHT_PLAN_VIEW}/${instance.hindsight_plan_code}`, {
          view_type: "edit",
          planCode: instance.hindsight_plan_code,
        });
      } else if (history.location.pathname.includes("strategy-dashboard")) {
        history.push(`${STRATEGY_VIEW}/${instance.plan_code}`, {
          view_type: "edit",
          planCode: instance.plan_code,
        });
      } else if (
        instance.plan_step === 2.1 ||
        instance.plan_step === 2.2 ||
        instance.plan_step === 2.3 ||
        instance.plan_step === 2.4 ||
        instance.plan_step === 3 ||
        instance.plan_step === 4
      ) {
        history.push(`/assort-smart/plan/${instance.plan_code}`, {
          planStep: instance.plan_step,
        });
      } else {
        if (
          history.location.pathname.includes("cluster-smart") ||
          history.location.pathname.includes("cluster-dashboard")
        ) {
          if (instance.plan_step === 1.3) {
            //Open confirmation popup, if Cluster Finalize plan is tried to edit
            setConfirmPlanEdit(true);
            setPlanInstance(instance);
          } else {
            const url = history.location.pathname.includes("cluster-smart")
              ? `cluster/${instance.cluster_plan_code}`
              : `${clusterPlanUrl}${instance.cluster_plan_code}`;
            history.push(url, { planstep: instance.plan_step });
          }
        } else {
          const url = `${clusterPlanUrl}${instance.plan_code}`;
          history.push(url, { planstep: instance.plan_step });
        }
      }
    }
  };

  const onViewPlanClick = async (instance) => {
    if (instance) {
      if (
        instance.plan_step === 2.1 ||
        instance.plan_step === 2.2 ||
        instance.plan_step === 2.3 ||
        instance.plan_step === 2.4 ||
        instance.plan_step === 3 ||
        instance.plan_step === 4
      ) {
        history.push(`/assort-smart/plan/view/${instance.plan_code}`, {
          planStep: instance.plan_step,
        });
      }
    }
  };

  useEffect(() => {
    let cols = cloneDeep(props.cols);
    if (!history.location.pathname.includes("MFP-dashboard")) {
      cols = cols.filter((col) => {
        if (col.type === "DateTimeField") {
          col.cellRenderer = (data) =>
            formattedDate(data.value, "MM-DD-YYYY", DEFAULT_DATE_FORMAT);
          if (col.accessor === "selling_period") {
            col.cellRenderer = (data) => data.value;
          }
        }
        return col.column_name !== "is_editable";
      });
    }
    cols.forEach((eachCol) => {
      if (eachCol.type === "info_icon") {
        eachCol.cellRenderer = (instance) => {
          let cellData = { ...instance };
          cellData.value = instance?.data?.plan_code;
          if (cellData.value) {
            return (
              <div>
                <PlanInfo title={eachCol.label} {...cellData} />
              </div>
            );
          } else return instance.value;
        };
      }
    });
    setPlansTableCols(cols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.cols]);

  useEffect(() => {
    setSeasonValues(props.seasonData);
  }, [props.seasonData]);

  useEffect(() => {
    //To reset selected filters going from one route to another
    props.filterRef.current = [];
    if (props.selectedPlans?.length) {
      props.setselectedPlans([]);
      DashboardPlanInstance.current.api.deselectAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.location.pathname]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    const reqBody = configureFetchPlansPayload(manualbody, mfpFilters, props);
    try {
      props.setDashboardLoader(true);
      pageIndex = pageIndex || 0;
      let res = {};
      props.setPlansData({});
      if (
        history.location.pathname.includes("cluster-smart") ||
        history.location.pathname.includes("cluster-dashboard")
      ) {
        reqBody.filters.push(
          {
            attribute_name: "sub_channel",
            operator: "in",
            filter_type: "non-cascaded",
            values: [],
          },
          {
            attribute_name: "selling_period",
            operator: "in",
            filter_type: "non-cascaded",
            values: [],
          }
        );
        res = await props.fetchClusterDashboardTableData(reqBody, pageIndex);
      } else if (history.location.pathname.includes("MFP-dashboard")) {
        res = await props.fetchMFPUploadData(reqBody, pageIndex);
      } else if (history.location.pathname?.includes("master-plan-dashboard")) {
        res = await props.masterPlanDashboardData(reqBody, pageIndex);
      } else if (history.location.pathname?.includes("hindsight-dashboard")) {
        delete reqBody["is_hindsight"];
        res = await props.fetchAssortHindsightDashboardTableData(
          reqBody,
          // props.screenConfiguration?.common?.endpoint_project_name || "assort",
          "assort-smart",
          pageIndex
        );
      } else if (history.location.pathname?.includes("strategy-dashboard")) {
        reqBody.filters.push({
          attribute_name: "special_classification",
          operator: "in",
          filter_type: "cascaded",
          values: ["strategy"],
        });
        res = await props.fetchAssortDashboardTableData(
          reqBody,
          // props.screenConfiguration?.common?.endpoint_project_name || "assort",
          "assort-smart",
          pageIndex
        );
      } else {
        res = await props.fetchAssortDashboardTableData(
          reqBody,
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          pageIndex
        );
      }
      let dashboardTableData = cloneDeep(res?.data?.data);
      if (history.location.pathname.includes("master-plan-dashboard")) {
        dashboardTableData?.forEach((item, index) => {
          item["uniqId"] =
            item.l0_name +
            item.l1_name +
            item.l2_name +
            item.channel +
            item.sub_channel +
            item.updated_at +
            index;
        });
      }
      if (
        !history.location.pathname.includes("MFP-dashboard") &&
        !history.location.pathname.includes("master-plan-dashboard")
      ) {
        let seasonData = {};
        res?.data?.data?.forEach((item) => {
          seasonData[item.plan_code] = item.season;
        });
        setSeasonValues(seasonData);
        let finalStep = history.location.pathname.includes("omnichannel")
          ? 8
          : 4;
        dashboardTableData = res?.data?.data?.map((eachRow) => {
          if (
            (history.location.pathname.includes("cluster-smart") ||
              history.location.pathname.includes("cluster-dashboard")) &&
            eachRow.selling_period?.length
          ) {
            let reference_period = "";
            eachRow.selling_period.forEach((period) => {
              reference_period =
                reference_period +
                `${period["start_date"]} to
            ${period["end_date"]},`;
            });
            eachRow.selling_period = reference_period;
          } else {
            eachRow.selling_period = `${eachRow["selling_period_sdate"]} to
      ${eachRow["selling_period_edate"]}`;
          }
          eachRow.is_finialize_for_po =
            eachRow.plan_step === finalStep ? true : false;
          eachRow.enableToggle = true;
          return eachRow;
        });
        props.setPlansData({
          data: filterAccessibleTableData(
            dashboardTableData,
            props.userAccessList
          ),
          count: res.data.count,
        });
        res.data.data = agGridRowFormatter(
          res.data?.data,
          params?.api?.checkConfiguration,
          "name"
        );
      } else {
        props.setPlansData({
          data: dashboardTableData,
          count: res?.data?.count,
        });
      }
      if (dashboardTableData?.length) {
        const urmFilterList = await getUrmFilters({
          application: 2,
          screen_name: "AssortDashboard",
        })();
        if (urmFilterList?.length >= 0) {
          let urmFilterJson = {};
          urmFilterList.forEach((filterJson) => {
            if (
              filterJson.attribute_name === "l0_name" ||
              filterJson.attribute_name === "l1_name"
            )
              urmFilterJson[filterJson.attribute_name] = filterJson.values;
          });
          setUrmFilters(urmFilterJson);
        }
      }
      props.setDashboardLoader(false);
      return {
        data: dashboardTableData,
        totalCount: res?.data?.total,
      };
    } catch (error) {
      //Error handling
      props.setDashboardLoader(false);
    }
  };

  const onDownloadBuyRollups = async (option) => {
    props.setDashboardLoader(true);
    let completedPlansList = props.selectedPlans?.filter((items) => {
      return (
        items.plan_step > 2.2 ||
        (items.plan_step === 2.2 &&
          items.plan_sub_step === "depth-choice-table")
      );
    });

    try {
      if (props.selectedPlans?.length) {
        if (completedPlansList?.length === props.selectedPlans.length) {
          if (option === "channel") {
            const isValidPlan = handleDownloadValidation(
              completedPlansList,
              displaySnackMessages,
              seasonValues,
              allEqual,
              props
            );
            if (!isValidPlan) {
              return;
            }
          }
          const downloadRollupResponse = await props.downloadBuyRollupData(
            {
              plan_code: props.selectedPlans.map((data) => {
                return data.plan_code?.toString();
              }),
              rollup_type: option,
              data_pull_source: props.selectedPlans.map((data) => {
                return data.data_pull_source || "";
              }),
            },
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
          );

          if (downloadRollupResponse?.data?.data?.url?.length) {
            let a = document.createElement("a");
            a.href = downloadRollupResponse?.data?.data?.url;
            a.download = "BuyRoll.xlsx";
            a.click();
            displaySnackMessages("Rollup downloaded successfully", "success");
          } else {
            displaySnackMessages("Error in downloading rollups", "error");
          }
        } else {
          displaySnackMessages(
            "Only completed plans can be downloaded",
            "error"
          );
        }
      } else {
        displaySnackMessages("Please select a plan to download", "error");
      }
    } catch (error) {
      displaySnackMessages("Something went wrong", "error");
    }

    props.setDashboardLoader(false);
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const onPlansDelete = async () => {
    //if no plans are selected, throw an error
    if (props.selectedPlans.length === 0) {
      displaySnackMessages(
        "Please select atleast one or more plans to delete",
        "error"
      );
      return;
    }
    const confirmPopup = cloneDeep(showModal);
    confirmPopup["delete"] = true;
    setShowModal(confirmPopup);
  };

  const closeEditConfirmPopup = () => {
    setConfirmPlanEdit(false);
  };

  const confirmEditPlan = () => {
    const url = history.location.pathname.includes("cluster-smart")
      ? `cluster/${planInstance.cluster_plan_code}`
      : `/assort-smart/cluster-dashboard/cluster/${planInstance.cluster_plan_code}`;
    history.push(url, { planstep: planInstance.plan_step });
  };

  const closeDeleteConfirmPopUp = () => {
    const confirmPopup = cloneDeep(showModal);
    confirmPopup["delete"] = false;
    setShowModal(confirmPopup);
  };

  const closeClusterPlanDeletePopup = () => {
    setConfirmDeleteClusterPlan(false);
    DashboardPlanInstance.current.api.deselectAll();
  };

  const confirmDelete = async (forceDelete) => {
    let reqBody = {
      plan_codes: props.selectedPlans.map((plan) => {
        return history.location.pathname.includes("cluster-smart") ||
          history.location.pathname.includes("cluster-dashboard")
          ? plan.cluster_plan_code
          : history.location.pathname.includes("hindsight-dashboard")
          ? plan.hindsight_plan_code
          : plan.plan_code;
      }),
    };
    try {
      let res = {};
      if (
        history.location.pathname.includes("cluster-smart") ||
        history.location.pathname.includes("cluster-dashboard")
      ) {
        reqBody = {
          cluster_plan_codes: props.selectedPlans.map((plan) => {
            return plan.cluster_plan_code;
          }),
        };
        if (forceDelete) {
          reqBody["force_delete"] = true;
        }
        res = await props.deleteClusterPlans(reqBody);
      } else if (history.location.pathname.includes("hindsight-dashboard")) {
        reqBody = {
          hindsight_plan_codes: reqBody.plan_codes,
        };
        res = await props.deleteHindsightPlans(
          reqBody,
          // props.screenConfiguration?.common?.endpoint_project_name || "assort"
          "assort-smart"
        );
      } else {
        res = await props.deletePlans(reqBody);
      }
      if (!res.data.data.status) {
        if (
          history.location.pathname.includes("cluster-smart") ||
          history.location.pathname.includes("cluster-dashboard")
        ) {
          setConfirmDeleteClusterPlan(true);
          setDeleteClusterPlanMessage(
            "The selected cluster plan is already tagged to an Assortment plan, are you sure to proceed?"
          );
        } else {
          displaySnackMessages(
            "Unable to delete plans! Please try again",
            "error"
          );
        }
      } else {
        const updatedPlans = props.plansTableData.filter((plan) => {
          return !props.selectedPlans.some((delPlan) => {
            return delPlan.plan_code === plan.plan_code;
          });
        });
        const updatedCount = props.plansTotalCount - props.selectedPlans.length;
        props.setPlansData({
          data: filterAccessibleTableData(updatedPlans, props.userAccessList),
          count: updatedCount,
        });
        DashboardPlanInstance.current.api.deselectAll();
        DashboardPlanInstance.current.api?.refreshServerSideStore({
          purge: true,
        });
        displaySnackMessages("Deleted plan(s) successfully", "success");
        props.setselectedPlans([]);
      }
    } catch (error) {
      displaySnackMessages("Unable to delete plans! Please try again", "error");
    }
    const confirmPopup = cloneDeep(showModal);
    confirmPopup["delete"] = false;
    setShowModal(confirmPopup);
    if (forceDelete) {
      setConfirmDeleteClusterPlan(false);
    }
  };

  const onPlanCopy = async () => {
    if (props.selectedPlans.length === 0) {
      displaySnackMessages("Please select a plan to Copy", "error");
      return;
    }
    if (props.selectedPlans.length > 1) {
      displaySnackMessages("Only one plan can be copied at a time", "error");
      return;
    }
    if (props.selectedPlans[0].plan_step < 1.2) {
      displaySnackMessages(
        "Selected plan has no cluster values, please run clustering to proceed",
        "error"
      );
      return;
    }
    //Fetch plan Info
    const planId =
      props.selectedPlans[0].plan_code ||
      props.selectedPlans[0].cluster_plan_code;
    setcopyDetails(planId); //Set the copy details data to selected index
    const confirmPopup = cloneDeep(showModal);
    confirmPopup["copy"] = true;
    setShowModal(confirmPopup);
  };

  const handleCopyModal = () => {
    const confirmPopup = cloneDeep(showModal);
    confirmPopup["copy"] = false;
    setShowModal(confirmPopup);
  };

  const updateAssortDashboardData = async (e, row, column, isChanged) => {
    props.setDashboardLoader(true);
    let columnId = column.colId;
    let value = e.target.checked;
    if (columnId === "is_finialize_for_po") {
      let finalizeForPOResponse = {};
      let jdaResponse = {};
      if (history.location.pathname.includes("omnichannel")) {
        finalizeForPOResponse = await props.callPlaceholderOid(
          {
            plan_code: row.plan_code,
          },
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
      } else {
        // let mapStyleDataResponse = {};
        if (
          // props.screenConfiguration["dashboard"].call_map_style_data &&
          props.screenConfiguration?.common?.endpoint_project_name !==
            "assort_smart" &&
          value
        ) {
          // mapStyleDataResponse = await props.mapStyleData({
          //   plan_code: row.plan_code,
          // });
          jdaResponse = await props.updateJDAStatus({
            plan_code: row.plan_code,
            is_jda_approved: true,
            plan_step: "4",
          });
        }
        if (
          // mapStyleDataResponse?.data?.data?.status ||
          !value ||
          !props.screenConfiguration["dashboard"].call_map_style_data
        ) {
          finalizeForPOResponse = await props.finalizeForPO({
            plan_code: row.plan_code,
            finalize_po: value, // false if finalized po plan is un finalized
          });
          // } else if (
          //   !mapStyleDataResponse?.data?.data?.status &&
          //   !isEmpty(mapStyleDataResponse)
          // ) {
          //   displaySnackMessages(
          //     mapStyleDataResponse?.data?.data?.message,
          //     "error"
          //   );
        } else if (!jdaResponse?.data?.status && !isEmpty(jdaResponse)) {
          displaySnackMessages(jdaResponse?.data?.status, "error");
          DashboardPlanInstance?.current?.api?.refreshServerSideStore({
            purge: true,
          });
        }
      }
      if (finalizeForPOResponse?.data?.data?.status) {
        displaySnackMessages(
          finalizeForPOResponse?.data?.data?.message,
          "success"
        );
      }
      if (jdaResponse?.data?.status) {
        // if (
        //   props.screenConfiguration?.[
        //     "2.1"
        //   ]?.budget_optimization_level?.includes("carryover")
        // ) {
        try {
          const payload = getPlanPayload(row, props.planLevels, true);
          payload.filters.push({
            attribute_name: "channel",
            value: row.channel,
            operator: "in",
            prefix: "levels",
          });
          payload.filters.push({
            attribute_name: "sub_channel",
            value: row.sub_channel ? row.sub_channel : row.channel,
            operator: "in",
            prefix: "levels",
          });
          payload["compare_type"] = -1;
          const createMasterPlan = await props.createMasterPlan(payload);
          if (createMasterPlan?.data?.status) {
            displaySnackMessages(
              createMasterPlan?.data?.data?.message,
              "success"
            );
            //Refetch the Assort dashboard table data
            const body = {
              filters: getFiltersRespArr(Dashboard.__plan_levels),
              status: 0,
              meta: {},
            };
            if (history.location.pathname.includes("omnichannel")) {
              body["is_omnichannel"] = true;
            } else {
              body["is_hindsight"] = false;
            }
            let plansRes = {};
            if (
              history.location.pathname.includes("cluster-smart") ||
              history.location.pathname.includes("cluster-dashboard")
            ) {
              body.filters.push({
                attribute_name: "sub_channel",
                operator: "in",
                filter_type: "non-cascaded",
                values: [],
              });
              plansRes = await props.fetchClusterDashboardTableData(body);
            } else {
              plansRes = await props.fetchAssortDashboardTableData(
                body,
                props.screenConfiguration?.common?.endpoint_project_name ||
                  "assort"
              );
            }
            //After finalize for po is successful, update plan step to 8 for omni plans & to 4 for normal plans
            let finalStep = history.location.pathname.includes("omnichannel")
              ? 8
              : 4;
            const dashboardTableData = plansRes?.data?.data?.map((eachRow) => {
              eachRow.is_finialize_for_po =
                eachRow.plan_step === finalStep ? true : false;
              eachRow.selling_period = `${eachRow["selling_period_sdate"]} to
            ${eachRow["selling_period_edate"]}`;
              return eachRow;
            });
            props.setPlansData({
              data: filterAccessibleTableData(
                dashboardTableData,
                props.userAccessList
              ),
              count: plansRes.data.total,
            });
            // instance.setAllFilters([]);
          } else {
            displaySnackMessages(
              createMasterPlan?.data?.data?.message,
              "error"
            );
            DashboardPlanInstance?.current?.api?.refreshServerSideStore({
              purge: true,
            });
          }
        } catch (error) {
          displaySnackMessages("Creation of master plan failed", "error");
        }
        // }
      } else if (
        !finalizeForPOResponse?.data?.data?.status &&
        !isEmpty(finalizeForPOResponse)
      ) {
        displaySnackMessages(
          finalizeForPOResponse?.data?.data?.message,
          "error"
        );
        DashboardPlanInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
    }
    if (columnId === "trigger_choice_flex") {
      if (history.location.pathname.includes("omnichannel")) {
        let finalizeOmniPlanResponse = await props.callColorwaySeasonFinalized(
          {
            plan_code: row.plan_code,
          },
          props.screenConfiguration?.common?.endpoint_project_name || "assort",
          props.planDetails?.data?.plan_code
        );
        if (finalizeOmniPlanResponse?.data?.status) {
          displaySnackMessages(
            finalizeOmniPlanResponse?.data?.data?.message,
            "success"
          );
        } else {
          displaySnackMessages(finalizeOmniPlanResponse?.message, "error");
        }
      }
    }
    // instance.settabledata(tempData);
    props.setDashboardLoader(false);
  };

  const comparePlan = () => {
    const validationObj = handleComparePlanValidation(
      props.selectedPlans,
      displaySnackMessages,
      allEqual
    );
    if (validationObj.isValid) {
      history.push({
        pathname: COMPAREPLAN,
        state: {
          plan_code: validationObj.plan_code,
          drop_plan_code: validationObj.drop_plancode,
          noOfPlans: validationObj.plan_code + validationObj.drop_plancode,
          hideClusterTable: true,
        },
      });
    }
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    DashboardPlanInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data, is_selected: true });
    });
    props.setselectedPlans(selectedRows);
  };

  const loadTableInstance = (params) => {
    DashboardPlanInstance.current = params;
  };

  const handleClusterDownload = async () => {
    if (!props.selectedPlans.length) {
      return displaySnackMessages("Please select a plan to download", "error");
    } else if (parseFloat(props.selectedPlans?.[0]?.plan_step) !== 1.3) {
      return displaySnackMessages(
        "Only Cluster Finalized plans can be downloaded",
        "error"
      );
    } else if (isEcomPlan(props.selectedPlans?.[0])) {
      return displaySnackMessages(
        "Ecomm channel plans are not available for download",
        "error"
      );
    }
    let clusterPlanCodes = [];
    props.selectedPlans.forEach((plan) => {
      clusterPlanCodes.push(plan.cluster_plan_code);
    });
    props.setDashboardLoader(true);
    try {
      const payload = {
        cluster_plan_code: clusterPlanCodes,
      };
      const clusterDownload = await props.clusterSmartRollupDownload(
        payload,
        props.planDetails?.data?.cluster_plan_code
      );
      if (clusterDownload?.data?.data?.url?.length) {
        let a = document.createElement("a");
        a.href = clusterDownload?.data?.data?.url;
        a.download = "Cluster Rollup.xlsx";
        a.click();
        displaySnackMessages(
          "Cluster Rollup downloaded successfully",
          "success"
        );
      } else {
        displaySnackMessages("Error in downloading rollups", "error");
      }
      DashboardPlanInstance?.current?.api?.deselectAll();
      props.setselectedPlans([]);
      props.setDashboardLoader(false);
    } catch (error) {
      displaySnackMessages("Cluster Rollup download failed", "error");
      props.setDashboardLoader(false);
    }
  };

  useEffect(() => {
    const handleMFPUpload = async () => {
      try {
        props.setDashboardLoader(true);
        const formData = new FormData();
        formData.append("upload_file", MFPUploadFile[0]);
        formData.append("user_id", props.userId);
        const uploadMFPData = await props.uploadMFPData(formData);
        if (uploadMFPData?.data?.status) {
          displaySnackMessages(uploadMFPData?.data?.message, "success");
          props.setDashboardLoader(false);
          props.setPlansData({});
          DashboardPlanInstance?.current?.api?.refreshServerSideStore({
            purge: true,
          });
        } else {
          displaySnackMessages(uploadMFPData?.data?.message, "error");
          props.setDashboardLoader(false);
        }
      } catch (error) {
        props.setDashboardLoader(false);
      }
    };
    if (MFPUploadFile[0]) {
      handleMFPUpload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [MFPUploadFile]);

  const updateMFPData = (
    e,
    data,
    column,
    isChanged,
    value,
    initialValue,
    cellData,
    initValue,
    previousValue
  ) => {
    setIsSaveEnabled(true);
    data[column.colId] = value;
    data["is_changed"] = true; //Add is_changed field to pass only changed rows in update api payload
  };

  const handleSave = async () => {
    const tempdata = [];
    DashboardPlanInstance?.current?.api?.forEachNode((node) => {
      if (node.data?.is_changed) {
        tempdata.push(node.data);
      }
    });
    const payload = [];
    tempdata.forEach((row) => {
      const payloadObj = {
        filters: {},
      };
      for (const key in row) {
        if (
          (!key.includes("ty") && !key.includes("target")) ||
          key === "store_type"
        ) {
          payloadObj["filters"][key] = row[key];
        } else {
          payloadObj[key] = row[key];
        }
      }
      delete payloadObj["filters"].is_changed;
      payload.push(payloadObj);
    });
    try {
      props.setDashboardLoader(true);
      const reqBody = {
        mfp_ty_budgets_data: payload,
      };
      const updateMFP = await props.updateMFPUploadData(reqBody);
      if (updateMFP?.data?.status) {
        displaySnackMessages("Data updated successfully", "success");
        DashboardPlanInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
      props.setDashboardLoader(false);
    } catch (error) {
      props.setDashboardLoader(false);
    }
  };

  const handleMFPFileDownload = async () => {
    try {
      props.setDashboardLoader(true);
      let filters = [];
      if (mfpFilters?.current?.length) {
        filters = mfpFilters.current;
      }
      const reqBody = {
        filters: filters,
      };
      const res = await props.downloadMFPData(reqBody, 0, 5000);
      if (res?.data?.status) {
        const tableData = [];
        res?.data?.data?.forEach((item) => {
          let tableObj = {};
          tableObj = {
            ...item,
          };
          mfpDataMetrics.forEach((field) => {
            tableObj[field] = Math.round(item[field]);
          });
          tableData.push(tableObj);
        });
        setMFPDownloadData(tableData);
      }
      props.setDashboardLoader(false);
    } catch (error) {
      displaySnackMessages("Downloading MFP data failed", "error");
      props.setDashboardLoader(false);
    }
  };

  return (
    <>
      {showModal["copy"] ? (
        <CopyPlanModal
          filterData={props.dashboardFilterConfig}
          copyPlanData={copyPlanDetails}
          type="copy"
          open={showModal["copy"]}
          plansTableInstance={DashboardPlanInstance}
          handleClose={handleCopyModal}
          accessData={props.userAccessList}
        />
      ) : null}
      {showModal["delete"] ? (
        <Prompt
          isOpen={showModal["delete"]}
          title={Dashboard.__delete_confirm_header}
          subHeading={Dashboard.__delete_confirm_text}
          infoList={[]}
          primaryButtonProps={{
            children: common.__ConfirmBtnText,
            onClick: () => confirmDelete(),
          }}
          tertiaryButtonProps={{
            children: common.__RejectBtnText,
            onClick: () => closeDeleteConfirmPopUp(),
          }}
          variant="error"
        />
      ) : null}
      {confirmPlanEdit ? (
        <Prompt
          isOpen={confirmPlanEdit}
          title={Dashboard.__edit_confirm_header}
          subHeading={Dashboard.__edit_confirm_text}
          infoList={[]}
          primaryButtonProps={{
            children: common.__ConfirmBtnText,
            onClick: () => confirmEditPlan(),
          }}
          tertiaryButtonProps={{
            children: common.__RejectBtnText,
            onClick: () => closeEditConfirmPopup(),
          }}
        />
      ) : null}
      {deleteClusterPlanMessage?.length ? (
        <Prompt
          isOpen={confirmDeleteClusterPlan}
          title="Delete cluster plan"
          subHeading={deleteClusterPlanMessage}
          infoList={[]}
          primaryButtonProps={{
            children: common.__ConfirmBtnText,
            onClick: () => confirmDelete(true),
          }}
          tertiaryButtonProps={{
            children: common.__RejectBtnText,
            onClick: () => closeClusterPlanDeletePopup(),
          }}
          variant="error"
        />
      ) : null}

      <LoadingOverlay
        loader={
          !plansTableCols.length > 0 || props.dashboard_loader ? true : false
        }
      >
        {plansTableCols.length > 0 && (
          <>
            <Paper elevation={3} className={globalClasses.paper}>
              <div className={classes.headerDiv}>
                <Typography variant="h3">{title}</Typography>
                {((history?.location?.pathname?.includes("MFP-dashboard") &&
                  props.filterRef?.current?.length) ||
                  !history?.location?.pathname?.includes("MFP-dashboard")) && (
                  <DashboardActionButtons
                    handleClusterDownload={handleClusterDownload}
                    onPlansDelete={onPlansDelete}
                    comparePlan={comparePlan}
                    onDownloadBuyRollups={onDownloadBuyRollups}
                    onPlanCopy={onPlanCopy}
                    selectedPlans={props.selectedPlans}
                    copyPlanData={copyPlanDetails}
                    manualCallBack={manualCallBack}
                    DashboardPlanInstance={DashboardPlanInstance}
                    confirmDelete={confirmDelete}
                    poSheetRefLink={poSheetRefLink}
                    editPlanClick={(planData) => {
                      onEditPlanClick(planData);
                    }}
                    viewPlanClick={(planData) => {
                      onViewPlanClick(planData);
                    }}
                    handleSummaryView={(plans) => {
                      handleSummaryView(plans);
                    }}
                    excelHeadersList={props.excelHeadersList}
                    updateMFPData={handleSave}
                    setMFPUploadFile={setMFPUploadFile}
                    isSaveEnabled={isSaveEnabled}
                    handleMFPFileDownload={handleMFPFileDownload}
                    mfpDownloadData={mfpDownloadData}
                    urmFilters={urmFilters}
                  />
                )}
              </div>

              <LoadingOverlay
                loader={props.dashboard_loader}
                spinner
                showingLoadingOnTop
              >
                <>
                  {history?.location?.pathname?.includes("MFP-dashboard") &&
                  !props.filterRef?.current?.length ? (
                    <div className={classes.textStyleMFP}>
                      {" "}
                      Please select filters to proceed
                    </div>
                  ) : (
                    <>
                      {history.location?.pathname?.includes(
                        "pre-season-dashboard"
                      ) && (
                        <AgGridTable
                          columns={plansTableCols}
                          rowdata={preSeasonDashboardData}
                          tableId={"pre-season-dashboard-table"}
                          onSelectionChanged={onSelectionChanged}
                          selectAllHeaderComponent={true}
                          customCellRenderer={(cellProps) =>
                            assortAgGridCustomCellRenderer(
                              cellProps,
                              "pre-season-dashboard",
                              history,
                              props,
                              null,
                              null,
                              props.screenConfiguration
                            )
                          }
                          onRowSelected
                          onGridChanged
                          sideBar={false}
                        />
                      )}
                      {!history.location.pathname?.includes(
                        "pre-season-dashboard"
                      ) && (
                        <>
                          <AgGridTable
                            columns={plansTableCols || []}
                            rowModelType="serverSide"
                            rowSelection="multiple"
                            loadTableInstance={loadTableInstance}
                            onEditClick={(tableInfo) =>
                              onEditPlanClick(tableInfo.data)
                            }
                            manualCallBack={(body, pageIndex, params) =>
                              manualCallBack(body, pageIndex, params)
                            }
                            onToggleChange={updateAssortDashboardData}
                            onSelectionChanged={onSelectionChanged}
                            onBlur={updateMFPData}
                            customCellRenderer={(cellProps) =>
                              assortAgGridCustomCellRenderer(
                                cellProps,
                                "dashboard",
                                history,
                                props,
                                null,
                                null,
                                props.screenConfiguration
                              )
                            }
                            pagination={true}
                            serverSideStoreType="partial"
                            cacheBlockSize={10}
                            uniqueRowId={
                              history.location.pathname.includes(
                                "master-plan-dashboard"
                              )
                                ? "uniqId"
                                : "name"
                            }
                            selectAllHeaderComponent={
                              history.location.pathname?.includes(
                                "MFP-dashboard"
                              )
                                ? false
                                : true
                            }
                            skipAutoSizeColumn
                            sizeColumnsToFitFlag
                            onRowSelected
                            onGridChanged
                            sideBar={false}
                            tableId={"dashboard-table"}
                          />
                          {props.refreshDate && !isEmpty(props.refreshDate) && (
                            <div
                              className={classNames(
                                globalClasses.filterWrapper,
                                classes.topMargin
                              )}
                            >
                              <Ticker>
                                <div className={tickerClass.flexRow}>
                                  {props.refreshDate?.mfp_date && (
                                    <Typography
                                      component="p"
                                      className={tickerClass.tickerText}
                                    >
                                      {`MFP. Refresh Date: ${moment(
                                        props.refreshDate?.mfp_date
                                      ).format("MM-DD-YYYY")}`}
                                    </Typography>
                                  )}
                                  <Typography
                                    component="p"
                                    className={tickerClass.tickerText}
                                  >
                                    {`Inventory. Refresh Date: ${moment(
                                      props.refreshDate?.refresh_date
                                    ).format("MM-DD-YYYY")}`}
                                  </Typography>
                                  <Typography
                                    component="p"
                                    className={tickerClass.tickerText}
                                  >
                                    {`Transaction. Refresh Date: ${moment(
                                      props.refreshDate?.transaction_date
                                    ).format("MM-DD-YYYY")}`}
                                  </Typography>
                                </div>
                              </Ticker>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              </LoadingOverlay>
            </Paper>
          </>
        )}
      </LoadingOverlay>
    </>
  );
};
const mapStateToProps = (state) => {
  return {
    cols: state.assortsmartReducer.planDashboardReducer.plansTableCols,
    plansTableData:
      state.assortsmartReducer.planDashboardReducer.plansTableData,
    plansTotalCount:
      state.assortsmartReducer.planDashboardReducer.plansTotalCount,
    dashboard_loader:
      state.assortsmartReducer.planDashboardReducer.dashboard_loader,
    userAccessList:
      state.tenantUserRoleMgmtReducer.userRoleManagementReducer.userAccessList,
    planLevels: state.assortsmartReducer.planDashboardReducer.planLevels,
    screenConfiguration:
      state.assortsmartReducer.commonAssortReducer.screenConfiguration,
  };
};

const mapActionsToProps = {
  fetchAssortDashboardTableData,
  addSnack,
  deletePlans,
  deleteClusterPlans,
  deleteHindsightPlans,
  setPlansData,
  downloadBuyRollupData,
  setDashboardLoader,
  getPlanLevels,
  getPlanDetails,
  finalizeForPO,
  callPlaceholderOid,
  callColorwaySeasonFinalized,
  fetchClusterDashboardTableData,
  getColumnsAg,
  createMasterPlan,
  mapStyleData,
  updateJDAStatus,
  fetchMFPUploadData,
  getSummaryViewData,
  uploadMFPData,
  updateMFPUploadData,
  getUserDetails,
  setLevelsJson,
  downloadMFPData,
  masterPlanDashboardData,
  clusterSmartRollupDownload,
  fetchAssortHindsightDashboardTableData,
};
export default connect(mapStateToProps, mapActionsToProps)(Plans);
