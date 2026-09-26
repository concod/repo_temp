import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import {
  set2_4_Loader,
  getFinalisePlanMetricsData,
  setFinalisePlanMetricsData,
  optimizeReviewSize,
  getReviewByAttributeGradeData,
  optimizeReviewByAttribute,
} from "../../../services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import ReviewBySizeTableComponent from "./review-by-size";
import ReviewByAttributeGradeComponent from "./review-by-cluster-grade";
import ReviewByAttributeComponent from "./review-by-attribute";
import LoadingOverlay from "core/Utils/Loader/loader";
import { generateExteralComponent } from "../../../external-feature-assortsmart/external-features-assortsmart-mapping";
import { bindActionCreators } from "redux";
import * as planDashboardServiceActions from "modules/assortsmart/services-assortsmart/Plan-Dashboard/plan-dashboard-service";
import * as planFinalizeServiceActions from "modules/assortsmart/services-assortsmart/Plan/Plan-Finalize/plan-finalize-service";
import * as commonAssortServiceActions from "modules/assortsmart/services-assortsmart/common-assort-service";
import {
  displaySnackMessage,
  getOptimizeReviewSizePayload,
} from "./plan-finalize-function";

const PlanFinalizeComponent = (props) => {
  const [showReviewByAttributeTable, setShowReviewByAttributeTable] = useState(
    false
  );
  const [
    selectedReviewByAttributeGradeData,
    setSelectedReviewByAttributeGradeData,
  ] = useState([]);
  const [gradeAttrDetailData, setGradeAttrDetailData] = useState([]);
  const [optimiseResponse, setOptimiseResponse] = useState("");
  const [optimiseAttributeResponse, setOptimiseAttributeResponse] = useState(
    ""
  );
  const [showLoader, setShowLoader] = useState(false);
  const [
    nonGenericFeatureOnFinalize,
    setNonGenericFeatureOnFinalize,
  ] = useState([]);
  const [selectedDropData, setSelectedDropData] = useState(null);

  useEffect(() => {
    return () => {
      props.setFinalisePlanMetricsData([]);
    };
  }, []);

  useEffect(() => {
    const setNonGenericFeatureOnFinalizeScreen = async () => {
      if (!props.initialLoadFinalize || props.fromDashboardScreen_2_4) {
        setShowLoader(true);
      }
      setNonGenericFeatureOnFinalize(
        props.screenConfiguration?.common?.non_generic_features_assort?.["2.4"]
      );

      props.setShowReceiptDrawer(true);
      return () => {
        props.setShowReceiptDrawer(false);
      };
    };
    setNonGenericFeatureOnFinalizeScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchDataOnPageLoad = async () => {
      props.set2_4_Loader(true);
      if (props.initialLoadFinalize && !props.fromDashboardScreen_2_4) {
        let payload = getOptimizeReviewSizePayload(props);
        try {
          let optimizeSizeResponse = await props.optimizeReviewSize(
            payload,
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
          );
          if (optimizeSizeResponse?.data?.data?.status) {
            setOptimiseResponse(optimizeSizeResponse.data.data.status);
            fetchFinalisePlanMatrics();
            try {
              let optimizeAttributeResponse = await props.optimizeReviewByAttribute(
                payload,
                props.screenConfiguration?.common?.endpoint_project_name ||
                  "assort"
              );
              setOptimiseAttributeResponse(
                optimizeAttributeResponse.data.data.status
              );
            } catch (error) {
              displaySnackMessage("Cluster grade optimization failed", "error");
            }
          }
        } catch (error) {
          displaySnackMessage("Size split optimization failed", "error", props);
        }
      } else {
        fetchFinalisePlanMatrics();
        if (props.initialLoadFinalize) {
          props.setInitialLoadFinalize(false);
        }
      }
    };
    fetchDataOnPageLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (props.reviewByAttributeGrade?.data && props.reviewBySizeData?.data) {
      setShowLoader(false);
    }
  }, [props.reviewByAttributeGrade, props.reviewBySizeData]);

  const fetchFinalisePlanMatrics = async (formData, changedType) => {
    // to fetch plan metrics details
    try {
      let payload = {
        filters: [
          {
            attribute_name: "plan_code",
            value: [props.planDetails?.plan_code],
            operator: "in",
          },
          {
            attribute_name: "l0_name",
            value: props.planDetails?.l0_name,
            prefix: "levels",
            operator: "in",
          },
        ],
      };
      let finalisePlanMatericsResponse = await props.getFinalisePlanMetricsData(
        payload,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      let l1NameList = [];
      let finalisePlanMatericsResponseDynamicL2;
      if (finalisePlanMatericsResponse?.data?.status) {
        if (
          !finalisePlanMatericsResponse?.data?.data?.[0]?.attribute_list?.length
        ) {
          props.set2_4_Loader(false);
          setShowLoader(false);
          return;
        }
        if (finalisePlanMatericsResponse?.data?.data[0]?.l1_name_list?.length) {
          l1NameList =
            finalisePlanMatericsResponse?.data?.data[0]?.l1_name_list;
          payload.filters.push({
            attribute_name: "l1_name",
            value: isEmpty(formData)
              ? [finalisePlanMatericsResponse?.data?.data[0]?.l1_name_list?.[0]]
              : Array.isArray(formData?.l1_name_list)
              ? formData?.l1_name_list
              : [formData?.l1_name_list],
            prefix: "levels",
            operator: "in",
          });
          finalisePlanMatericsResponse = await props.getFinalisePlanMetricsData(
            payload,
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
          );
          if (
            finalisePlanMatericsResponse?.data?.data[0]?.l2_name_list?.length
          ) {
            payload.filters.push({
              attribute_name: "l2_name",
              value:
                isEmpty(formData) || !formData.l2_name_list
                  ? [
                      finalisePlanMatericsResponse?.data?.data[0]
                        ?.l2_name_list?.[0],
                    ]
                  : Array.isArray(formData?.l2_name_list)
                  ? formData?.l2_name_list
                  : [formData?.l2_name_list],
              prefix: "levels",
              operator: "in",
            });
          }
          finalisePlanMatericsResponseDynamicL2 = await props.getFinalisePlanMetricsData(
            payload,
            props.screenConfiguration?.common?.endpoint_project_name || "assort"
          );
        }
        // From object l1FilterValue, get options for l2 dropdown
        // From object l2FilterValue, get options for l3 dropdown
        if (finalisePlanMatericsResponse?.data?.data) {
          const l1FilterValues = cloneDeep(
            finalisePlanMatericsResponse?.data?.data
          );
          l1FilterValues[0]["l1_name_list"] = l1NameList;
          let data = [
            {
              l1FilterValue: l1FilterValues,
              l2FilterValue: finalisePlanMatericsResponseDynamicL2?.data?.data,
              changedType: changedType,
            },
          ];
          props.setFinalisePlanMetricsData(data);
        }
      }
    } catch (error) {
      setShowLoader(false);
      displaySnackMessage("Fetching plan metrics failed", "error", props);
    }
  };

  const showReviewByAttribute = async (isShow, selectedRow) => {
    setGradeAttrDetailData([]);
    setShowReviewByAttributeTable(false);
    if (isShow) {
      const reqBody = {
        filters: [
          {
            attribute_name: "plan_finalize_grade_id",
            value: selectedRow?.plan_finalize_grade_id,
            operator: "in",
          },
        ],
      };
      let reviewByAtributeGradeData = await props.getReviewByAttributeGradeData(
        reqBody,
        props.screenConfiguration?.common?.endpoint_project_name || "assort"
      );
      if (reviewByAtributeGradeData?.data?.status) {
        setGradeAttrDetailData(reviewByAtributeGradeData?.data?.data);
        setShowReviewByAttributeTable(isShow);
      }
      setSelectedReviewByAttributeGradeData(selectedRow);
    }
  };

  return (
    <>
      <LoadingOverlay loader={props.isLoading || showLoader} spinner>
        {nonGenericFeatureOnFinalize?.map((sepecificFeature) => {
          return generateExteralComponent(sepecificFeature);
        })}
        <ReviewBySizeTableComponent
          set2_4_Loader={props.set2_4_Loader}
          optimiseResponse={optimiseResponse}
          initialLoadFinalize={props.initialLoadFinalize}
          fromDashboardScreen_2_4={props.fromDashboardScreen_2_4}
          optimiseAttributeResponse={optimiseAttributeResponse}
          levelsJson={props.levelsJson}
          selectedDropData={selectedDropData}
          setSelectedDropData={setSelectedDropData}
          fetchFinalisePlanMatrics={fetchFinalisePlanMatrics}
        />
        <ReviewByAttributeGradeComponent
          showReviewByAttribute={showReviewByAttribute}
          set2_4_Loader={props.set2_4_Loader}
          optimiseAttributeResponse={optimiseAttributeResponse}
          initialLoadFinalize={props.initialLoadFinalize}
          fromDashboardScreen_2_4={props.fromDashboardScreen_2_4}
          levelsJson={props.levelsJson}
          selectedDropData={selectedDropData}
          setSelectedDropData={setSelectedDropData}
          setGradeAttrDetailData={setGradeAttrDetailData}
        />
        {showReviewByAttributeTable && (
          <ReviewByAttributeComponent
            selectedRowData={selectedReviewByAttributeGradeData}
            gradeAttrDetailData={gradeAttrDetailData}
          />
        )}
      </LoadingOverlay>
    </>
  );
};

const mapStateToProps = (state) => {
  return {
    planDetails: planDashboardServiceActions.planDetailsDataSelector(state)
      ?.data,
    levelsJson: planDashboardServiceActions.levelsJsonDataSelector(state),
    planLevels: planDashboardServiceActions.planLevelsDataSelector(state),
    reviewBySizeData: planFinalizeServiceActions.reviewBySizeDataSelector(
      state
    ),
    isLoading: planFinalizeServiceActions.set2_4_LoaderSelector(state),
    reviewByAttributeGrade: planFinalizeServiceActions.reviewByAttributeGradeSelector(
      state
    ),
    screenConfiguration: commonAssortServiceActions.screenConfigurationSelector(
      state
    ),
  };
};

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators(
    {
      getFinalisePlanMetricsData,
      setFinalisePlanMetricsData,
      optimizeReviewSize,
      optimizeReviewByAttribute,
      getReviewByAttributeGradeData,
      set2_4_Loader,
      addSnack,
    },
    dispatch
  );
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(PlanFinalizeComponent);
