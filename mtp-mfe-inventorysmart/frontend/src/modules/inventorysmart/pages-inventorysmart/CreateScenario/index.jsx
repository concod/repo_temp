import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { Grid } from "@mui/material";
import { Button, Stepper, EmptyState } from "impact-ui-v3";
import globalStyles from "../../../../core/Styles/globalStyles";
import { connect } from "react-redux";
import makeStyles from "@mui/styles/makeStyles";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Prompt } from "impact-ui-v3";
import { createScenario } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import ArticlesTable from "../Create-Allocation/components/ArticlesTable";
import Loader from "core/Utils/Loader/loader";
import {
  deleteScenario,
  editScenarioInput,
  finalizeScenario,
  saveInputScenario,
} from "../../services-inventorysmart/Create-Scenario/store-view-services";
import { displaySnackMessages } from "../inventorysmart-utility";
import { addSnack } from "../../../../core/actions/snackbarActions";
import { setAllocationCode } from "modules/inventorysmart/services-inventorysmart/Finalize/store-view-services";
import ScenarioRecomendation from "./ScenarioRecomendation";
import {
  ALLOCATION_COMPARE_COUNT_EMPTY_DESCRIPTION,
  ALLOCATION_COMPARE_EMPTY_HEADING,
  GO_BACK_MESSAGE_DELETE_SCENARIO,
  GO_BACK_MESSAGE_FINALIZE_SCENARIO,
} from "../../constants-inventorysmart/stringConstants";
import { Container } from "@mui/material";
import { useStyles } from "../../styles/inventorySmartUseStyles";
import {
  isAllocationCompareCodes,
  isInvalidAllocationCompareCodes,
  parseAllocationCodesFromQuery,
} from "./scenarioCompareUtils";

const CREATE_SCENARIO_STEPS = ["Scenario Input", "Scenario Recommendation"];

function CreateScenario(props) {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPrductData, setSelectedPrductData] = useState(null);
  const [selectedStoreData, setSelectedStoreData] = useState(null);
  const [styleList, setStyleList] = useState([]);
  const [flag, setFlag] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [scenarioInputDataSaved, setScenarioInputDataSaved] = useState(false);
  const [saveDisabled, setSaveDisabled] = useState(false);
  const [deleteButtonClicked, setDeleteButtonClicked] = useState(false);
  const [finalizeButtonClicked, setFinalizeButtonClicked] = useState(false);
  const [
    selectedProductListInRecommendation,
    setSelectedProductListInRecommendation,
  ] = useState([]);

  // Notification handling refs
  const pendingFinalizeScenarioCodeRef = useRef(null);
  const allowFinalizeNavigateFromNotificationRef = useRef(true);

  const [
    totalProductListInRecommendation,
    setTotalProductListInRecommendation,
  ] = useState([]);
  const [isScenarioInvalid, setIsScenarioInvalid] = useState(false);
  const [selectedStyleStoreMap, setSelectedStyleStoreMap] = useState(new Map());

  // Memoize URL parameters to make them reactive to location changes
  const urlParams = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    return {
      scenarioIdFromParam: searchParams.get("scenario_id") || null,
      allocation_code: searchParams.get("allocation_code"),
      stepUserIsIn: searchParams.get("step"),
    };
  }, [location.search]);

  const allocationCodesFromQuery = useMemo(
    () => parseAllocationCodesFromQuery(urlParams.allocation_code),
    [urlParams.allocation_code]
  );

  const isAllocationCompare = isAllocationCompareCodes(
    allocationCodesFromQuery
  );
  const isInvalidAllocationCompareUrl = isInvalidAllocationCompareCodes(
    allocationCodesFromQuery
  );
  const compareCodes = isAllocationCompare ? allocationCodesFromQuery : null;

  const allocationCodeFromState = useMemo(() => {
    if (isInvalidAllocationCompareUrl) {
      return location.state?.allocationCode || null;
    }
    if (isAllocationCompare) {
      return location.state?.allocationCode || allocationCodesFromQuery[0];
    }
    return location.state?.allocationCode || urlParams.allocation_code;
  }, [
    location.state?.allocationCode,
    urlParams.allocation_code,
    isAllocationCompare,
    isInvalidAllocationCompareUrl,
    allocationCodesFromQuery,
  ]);

  const [scenarioId, setSceanarioId] = useState(urlParams.scenarioIdFromParam);

  useEffect(() => {
    // whenever user changes the tab or click on notification, user should be redirected to selected step page
    setScenarioInputDataSaved(false);
    setActiveStep(isAllocationCompare ? "1" : urlParams.stepUserIsIn);
    if (urlParams.scenarioIdFromParam) {
      setSceanarioId(urlParams.scenarioIdFromParam);
    }
  }, [
    urlParams.stepUserIsIn,
    urlParams.scenarioIdFromParam,
    isAllocationCompare,
  ]);

  useEffect(() => {
    const checkSceanrio = async () => {
      if (!urlParams.scenarioIdFromParam && allocationCodeFromState) {
        try {
          let reqBody = {
            allocation_code:
              allocationCodeFromState || "6_251_USA_20250428T141412",
            styles: location.state?.articleIds || ["STYLE001", "STYLE002"],
          };

          let { data } = await props.createScenario(reqBody);
          let newScenarioId = data.data.scenario_id;
          navigate(
            `/inventory-smart/create-allocation/create-scenario?step=0&scenario_id=${newScenarioId}&allocation_code=${allocationCodeFromState}`
          );
          props.setAllocationCode(allocationCodeFromState);
          setSceanarioId(newScenarioId);
        } catch (err) {
          console.error("Error creating scenario:", err);
        }
      }
    };

    if (activeStep === "0" && !isInvalidAllocationCompareUrl && !isAllocationCompare) {
      checkSceanrio();
    }
  }, [
    activeStep,
    allocationCodeFromState,
    urlParams.scenarioIdFromParam,
    location.state?.articleIds,
    isInvalidAllocationCompareUrl,
    isAllocationCompare,
  ]);

  // Notification handling utility functions
  const extractScenarioCodeFromUrl = (url) => {
    try {
      if (typeof url !== "string") return null;
      const match = url.match(/scenario_id=([^&]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  };

  const setPendingFinalizeScenarioCode = useCallback((scenarioId) => {
    if (scenarioId == null || scenarioId === "") return;
    const asString = String(scenarioId);
    pendingFinalizeScenarioCodeRef.current = asString;
    allowFinalizeNavigateFromNotificationRef.current = true;
  }, []);

  const clearPendingScenarioNotificationNav = useCallback(() => {
    pendingFinalizeScenarioCodeRef.current = null;
    allowFinalizeNavigateFromNotificationRef.current = false;
  }, []);

  const navigateToFinalizeFromMatchedUrl = useCallback(
    (urlFromNotification) => {
      if (!allowFinalizeNavigateFromNotificationRef.current) {
        return;
      }
      clearPendingScenarioNotificationNav();
      try {
        const pathAndSearch = urlFromNotification.includes("://")
          ? new URL(urlFromNotification).pathname +
            new URL(urlFromNotification).search
          : urlFromNotification.startsWith("/")
            ? urlFromNotification
            : `/${urlFromNotification}`;
        navigate(pathAndSearch, { replace: true });
      } catch (err) {
        navigate(`/inventory-smart/create-allocation/create-scenario?scenario_id=${scenarioId}&allocation_code=${allocationCodeFromState}`, { replace: true });
      }
    },
    [
      navigate,
      scenarioId,
      allocationCodeFromState,
      clearPendingScenarioNotificationNav,
    ]
  );

  // Reset component state when scenarioId or allocationCodeFromState changes
  useEffect(() => {
    setSelectedPrductData(null);
    setSelectedStoreData(null);
    setScenarioInputDataSaved(false);
    setSaveDisabled(false);
  }, [scenarioId, allocationCodeFromState]);

  // Process notifications for redirection to finalize step
  useEffect(() => {
    const pending = pendingFinalizeScenarioCodeRef.current;
    const items = props.notificationFeedFromStore;
    if (!pending || !Array.isArray(items) || items.length === 0) return;
    if (!allowFinalizeNavigateFromNotificationRef.current) {
      return;
    }

    for (const n of items) {
      const url = n?.url;
      if (!url || typeof url !== "string") continue;
      const code = extractScenarioCodeFromUrl(url);
      if (code && code === pending) {
        navigateToFinalizeFromMatchedUrl(url);
        return;
      }
    }
  }, [
    props.notificationFeedFromStore,
    navigateToFinalizeFromMatchedUrl,
  ]);

  const updateStyle = (params) => {
    setSelectedPrductData(params?.cellData?.data);
    setSelectedStoreData(null);
  };

  const onApply = async (params, level) => {
    let editedDataList = [...params];
    setFlag(false);

    const body = {
      scenario_id: scenarioId
        ? scenarioId
        : "6_251_CAN_20250505T092959_SCENARIO_1",
      level: level,
      set_all: false,
      data: editedDataList,
    };

    try {
      await props.editScenarioInput(body);
    } catch (error) {
      console.error("Error updating scenario:", error);
    } finally {
      // Set flag back to true after API call completes (success or error)
      setFlag(true);
    }
  };

  const onTriggerScenario = async () => {
    if (selectedStyleStoreMap.size) {
      const emptyStoreStyles = [];
      Array.from(selectedStyleStoreMap.entries()).forEach(([key, value]) => {
        if (value.length === 0) {
          emptyStoreStyles.push(key);
        }
      });

      if (emptyStoreStyles.length > 0) {
        const styleNames = emptyStoreStyles.map((style) => style.split("-")[0]);
        displaySnackMessages(
          `Please select at least one store for each style before saving. Impacted styles ${styleNames.join(
            ", "
          )}`,
          "error",
          props
        );
        return;
      }
    }

    // Create selected_styles array with all styles from styleList
    const selected_styles = styleList.map((style) => ({
      style: style,
      stores: selectedStyleStoreMap.has(style)
        ? selectedStyleStoreMap.get(style)
        : [],
      sizes: [],
    }));

    setSaveDisabled(true);
    let body = {
      scenario_id: scenarioId,
      selected_styles: selected_styles,
    };

    try {
      let { data } = await props.saveInputScenario(body);
      if (data?.data?.status === "SUCCESS") {
        setSelectedStyleStoreMap(new Map());
        setScenarioInputDataSaved(true);
        displaySnackMessages(data?.message, "info", props);
        setSelectedPrductData(null);
        setSelectedStoreData(null);
        setPendingFinalizeScenarioCode(scenarioId);
      }
      else {
        displaySnackMessages(data?.message, "error", props);
        setSaveDisabled(false);
      }
    } catch (error) {
      setSaveDisabled(false);
      console.error("Error saving scenario input:", error);
    }
  };

  async function handleDeleteOrFinalizeScenario(action = "finalize") {
    setSaveDisabled(true);
    let body = {
      scenario_id: scenarioId,
    };
    try {
      if (action === "delete") {
        let { data } = await props.deleteScenario(body);
        if (data?.data?.status === "SUCCESS") {
          displaySnackMessages(data?.data?.data?.message, "success", props);
          clearPendingScenarioNotificationNav();
          navigate(
            `/inventory-smart/create-allocation?step=2&allocation_code=${allocationCodeFromState}`
          );
        } else {
          displaySnackMessages(data?.data?.data?.message, "error", props);
        }
      } else {
        let articleIds = [];
        if (
          selectedProductListInRecommendation.length !==
          totalProductListInRecommendation
        ) {
          articleIds = selectedProductListInRecommendation.map(
            (item) => item.article
          );
          body.articles = articleIds;
        }
        let { data } = await props.finalizeScenario(body);
        if (data?.data?.status === "SUCCESS") {
          displaySnackMessages(data?.data?.data?.message, "success", props);
          clearPendingScenarioNotificationNav();
          navigate(
            `/inventory-smart/create-allocation?step=2&allocation_code=${allocationCodeFromState}`
          );
        } else {
          displaySnackMessages(data?.data?.data?.message, "error", props);
        }
      }
      setDeleteButtonClicked(false);
      setFinalizeButtonClicked(false);
    } catch (error) {
      setSaveDisabled(false);
      console.error("Error while performing this action", error);
    }
  }

  function isSaveDisabled() {
    if (activeStep === "0") {
      return saveDisabled;
    }
    if (isScenarioInvalid) {
      return true;
    }
    if (activeStep === "1" && !isScenarioInvalid) {
      return saveDisabled || !(selectedProductListInRecommendation.length > 0);
    }
    return false;
  }

  const scenarioRecommendationNewFlow =
    !isAllocationCompare &&
    !!props.finalizeAllocationConfig?.scenarioRecommendationNewFlow;

  if (isInvalidAllocationCompareUrl) {
    return (
      <div className={`${globalClasses.paddingAroundNew}`}>
        <div
          className={`${globalClasses.marginTop} ${globalClasses.flexRow} ${globalClasses.centerAlign}`}
        >
          <EmptyState
            heading={ALLOCATION_COMPARE_EMPTY_HEADING}
            description={ALLOCATION_COMPARE_COUNT_EMPTY_DESCRIPTION}
            primaryButtonLabel={"Go to Dashboard"}
            onPrimaryButtonClick={() => {
              navigate("/inventory-smart/decision-dashboard");
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`${globalClasses.paddingAroundNew}`}>
      {!scenarioInputDataSaved ? (
        <>
          <div
            className={`${globalClasses.filterBreadcrumbHeight} ${globalClasses.centerAlign}`}
          >
            <HeaderBreadCrumbs
              options={
                isAllocationCompare
                  ? [
                      {
                        label: "Allocation Comparison",
                      },
                    ]
                  : [
                      {
                        label: "Allocation Recommendation",
                        action: () => {
                          navigate(
                            `/inventory-smart/create-allocation?step=2&allocation_code=${allocationCodeFromState}`
                          );
                        },
                      },
                      {
                        label: "Create Scenario",
                      },
                    ]
              }
            ></HeaderBreadCrumbs>
          </div>
          {!isAllocationCompare && (
            <Container
              maxWidth={false}
              sx={{ display: "flex", justifyContent: "center", width: "70%" }}
            >
              <Stepper
                activeStep={parseInt(activeStep)}
                orientation="horizontal"
                steps={CREATE_SCENARIO_STEPS.map((label) => ({
                  label: label,
                }))}
                handleStep={(index) => {
                  if (index === 0 && isScenarioInvalid) {
                    displaySnackMessages(
                      "You can't go back to scenario input as you have made some changes to the scenario",
                      "error",
                      props
                    );
                    return;
                  }
                  return;
                }}
              />
            </Container>
          )}
          <div className={classes.marginTop24}>
            {activeStep === "0" && (
              <Loader loader={!flag} minHeight={160}>
                {scenarioId && flag && (
                  <ArticlesTable
                    key={`${scenarioId}-${allocationCodeFromState}`}
                    createSceanrio={true}
                    isRedirectedFromDifferentPage={false}
                    pageLimit={10}
                    scenarioId={scenarioId}
                    updateStyle={updateStyle}
                    onApply={onApply}
                    articleIds={location.state?.articleIds}
                    selectedStyleStoreMap={selectedStyleStoreMap}
                    setSelectedStyleStoreMap={setSelectedStyleStoreMap}
                    selectedPrductData={selectedPrductData}
                    setSelectedPrductData={setSelectedPrductData}
                    selectedStoreData={selectedStoreData}
                    setSelectedStoreData={setSelectedStoreData}
                    setSaveDisabled={setSaveDisabled}
                    setStyleList={setStyleList}
                    flag={flag}
                  />
                )}
              </Loader>
            )}
            {activeStep === "1" && (
              <ScenarioRecomendation
                key={`${scenarioId}-${allocationCodeFromState}-${compareCodes?.join(
                  ","
                )}-recommendation`}
                allocationCode={allocationCodeFromState}
                scenarioId={scenarioId}
                compareCodes={compareCodes}
                isReadOnlyCompare={isAllocationCompare}
                setAllocationCode={props.setAllocationCode}
                selectedProductListInRecommendation={
                  selectedProductListInRecommendation
                }
                setSelectedProductListInRecommendation={
                  setSelectedProductListInRecommendation
                }
                setSaveDisabled={setSaveDisabled}
                setTotalProductListInRecommendation={
                  setTotalProductListInRecommendation
                }
                isScenarioInvalid={isScenarioInvalid}
                setIsScenarioInvalid={setIsScenarioInvalid}
              />
            )}
            {!isAllocationCompare && (
              <div className={`${globalClasses.stickyFooter}`}>
                <Button
                  id="cancelButton"
                  variant="secondary"
                  onClick={() => {
                    if (activeStep === "0") {
                      navigate(
                        `/inventory-smart/create-allocation?step=2&allocation_code=${allocationCodeFromState}`
                      );
                    } else {
                      setActiveStep("0");
                      navigate(
                        `/inventory-smart/create-allocation/create-scenario?step=0&scenario_id=${scenarioId}&allocation_code=${allocationCodeFromState}`
                      );
                    }
                    setSelectedStyleStoreMap(new Map());
                  }}
                >
                  {activeStep === "0" ? "Back" : "Back to scenario input"}
                </Button>
                <div className={classes.actionButtons}>
                  {activeStep === "1" && (
                    <Button
                      id="submitButton"
                      variant="secondary"
                      onClick={() => {
                        setDeleteButtonClicked(true);
                      }}
                    disabled={isScenarioInvalid || saveDisabled}
                  >
                    {scenarioRecommendationNewFlow
                      ? "Cancel Scenario Recommendation"
                      : "Delete Scenario"}
                  </Button>
                )}
                <Button
                  id="submitButton"
                  variant="primary"
                  onClick={() => {
                    activeStep === "0"
                      ? onTriggerScenario()
                      : setFinalizeButtonClicked(true);
                  }}
                  disabled={isSaveDisabled()}
                >
                    {activeStep === "0"
                      ? "Save and move to scenario recommendation"
                      : "Finalize Scenario"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div
        className={`${globalClasses.marginTop} ${globalClasses.flexRow} ${globalClasses.centerAlign}`}
        >
          <EmptyState
            description={
              "You'll get a notification once recommendation is generated."
            }
            heading={
              "Scenario creation and comparison may take some time based on the data size."
            }
            primaryButtonLabel={"Go to Dashboard"}
            onPrimaryButtonClick={() => {
              navigate("/inventory-smart/decision-dashboard");
            }}
          />
        </div>
      )}
      <Prompt
        isOpen={deleteButtonClicked || finalizeButtonClicked}
        title={
          deleteButtonClicked
            ? "Delete Scenario, Are you sure?"
            : "Finalize Scenario"
        }
        variant={deleteButtonClicked ? "error" : "warning"}
        primaryButtonLabel={deleteButtonClicked ? "Yes, Delete" : "Yes"}
        secondaryButtonLabel={deleteButtonClicked ? "Cancel" : "No"}
        onPrimaryButtonClick={
          deleteButtonClicked
            ? () => handleDeleteOrFinalizeScenario("delete")
            : () => handleDeleteOrFinalizeScenario("finalize")
        }
        onSecondaryButtonClick={() => {
          setDeleteButtonClicked(false);
          setFinalizeButtonClicked(false);
        }}
      >
        {deleteButtonClicked
          ? GO_BACK_MESSAGE_DELETE_SCENARIO
          : GO_BACK_MESSAGE_FINALIZE_SCENARIO}
      </Prompt>
    </div>
  );
}

const mapStateToProps = (store) => {
  return {
    allocationCode:
      store.inventorysmartReducer.inventorySmartFinalizeStoreViewService
        .allocationCode,
    notificationFeedFromStore:
      store.notificationReducer?.notificationData ?? [],
    finalizeAllocationConfig:
      store?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartFinalizeAllocationConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    createScenario: (payload) => dispatch(createScenario(payload)),
    editScenarioInput: (payload) => dispatch(editScenarioInput(payload)),
    saveInputScenario: (payload) => dispatch(saveInputScenario(payload)),
    finalizeScenario: (payload) => dispatch(finalizeScenario(payload)),
    deleteScenario: (payload) => dispatch(deleteScenario(payload)),
    setAllocationCode: (payload) => dispatch(setAllocationCode(payload)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(CreateScenario);
