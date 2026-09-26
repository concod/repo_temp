import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import classNames from "classnames";

import {
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_CREATE_SCENARIO,
  ORDER_MANAGEMENT_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_MATRIX_SUMMARY,
} from "modules/oms/constants-oms/routeConstants";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import {
  setOrderManagementFilterElements,
  setOrderManagementFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setRedirectFromDeepDive,
  getOmsCreateScenarioEditTableData,
  setOrderScenarioApplyTableDataLoader,
  getCreateScenarioDeepDiveTableConfiguration,
  getScenarioViewTableConfiguration,
  getOmsDeepDiveTableData,
  getOmsHolidayWeeks,
  setOrderManagementDeepDiveTableData,
  setCreateScenarioViewTableData,
  resetOrderManagementDeepDiveTableData,
  resetCreateScenarioViewTableData,
  setOrderManagementKpiSummaryLoader,
  setRedirectionDetails,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import OrderCreateScenarioTable from "./OrderCreateScenarioTable";
import OrderScenarioApplyTable from "./OrderScenarioApplyTable";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import CreateScenarioStepper from "./CreateScenarioStepper";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isNil, uniq } from "lodash";
import { setCreateScenarioAggregatedData } from "modules/oms/services-oms/Order-Management/order-management-service";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { Button } from "impact-ui-v3";
import { getSkuRowsMatchingDcFilter } from "./utils";
import { useStyles as OmsUseStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import { adjustMiddleContentHeight } from "../../../utils-oms/oms-utility";
import { fetchCreateScenarioDeepDiveV3 } from "modules/oms/pages-oms/OrderManagement/CreateScenario/api/createScenarioDeepDive.api.js";
import { fetchSimulateScenarioV3 } from "modules/oms/pages-oms/OrderManagement/CreateScenario/api/simulateScenario.api.js";

const DEFAULT_SCENARIO_ROUTES = {
  orderManagement: ORDER_MANAGEMENT,
  matrixSummary: ORDER_MANAGEMENT_MATRIX_SUMMARY,
  productDetails: ORDER_MANAGEMENT_PRODUCT_DETAILS,
  createScenario: ORDER_MANAGEMENT_CREATE_SCENARIO,
};

const OrderCreateScenario = (props) => {
  const navigate = useNavigate();
  let location = useLocation();
  const routes = { ...DEFAULT_SCENARIO_ROUTES, ...(props?.routeOverrides || {}) };

  const globalClasses = globalStyles();
  const customClasses = useStyles();
  const omsCustomClasses = OmsUseStyles();

  const [isSimulateSuccess, setIsSimulateSuccess] = useState(false);
  const [dataFromOMS, setDataFromOMS] = useState(location?.state?.data);
  const [isRecommended, setIsRecommended] = useState(
    location?.state?.isRecommended
  );
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(
    location?.state?.isRedirectedFromDifferentPage
      ? location?.state?.isRedirectedFromDifferentPage
      : false
  );
  const filtersFromOMSRef = useRef(location?.state?.filters || []);
  const [simulatedTableData, setSimulatedTableData] = useState([]);
  const [progressLoader, setProgressLoader] = useState(false);
  const [progress, setProgress] = useState(0);
  const [simulationError, setSimulationError] = useState(false);
  const [isScenarioApplied, setIsScenarioApplied] = useState(false);
  const [navigateToSimulation, setNavigateToSimulation] = useState(false);
  const [deepDiveTableColumns, setDeepDiveTableColumns] = useState([]);
  const [scenarioViewTableColumns, setScenarioViewTableColumns] = useState([]);
  const [activeStep, setActiveStep] = useState(
    parseInt(new URLSearchParams(window.location.search).get("step"))
  );
  const [selectedSafetyStockSkuData, setSelectedSafetyStockSkuData] = useState(
    []
  );
  const [isSimulateButtonDisabled, setIsSimulateButtonDisabled] = useState(
    true
  );
  const [orderCreateTableEdited, setOrderCreateTableEdited] = useState(false);
  const [chartFilterData, setChartFilterData] = useState([]);
  const [simulateDownloadData, setSimulateDownloadData] = useState([]);
  const [holidayWeeksData, setHolidayWeeksData] = useState([]);
  const [isEventsChecked, setIsEventsChecked] = useState(false);
  const simulateTableRef = useRef(null);

  const deepDiveScreenConfig =
    props?.orderingScreensConfig?.oms_dashboard?.deep_dive;
  const SHOW_EVENT_GRID = deepDiveScreenConfig?.show_event_grid || false;
  const middleContentRef = useRef(null);
  const footerRef = useRef(null);

  const PRIMARY_KEY_FROM_OMS =
    location?.state?.primary_key_from_OMS ||
    props?.orderingScreensConfig?.create_scenario?.safety_stock
      ?.primary_key_from_OMS ||
    "product_code";

  const SIMULATE_SCENARIO_DEEP_DIVE_PAYLOAD_KEYS = props?.orderingScreensConfig
    ?.create_scenario?.safety_stock
    ?.simulate_scenario_deep_dive_payload_keys || ["product_code", "loc_code"];

  const SIMULATE_SCENARIO_PAYLOAD_KEYS = props?.orderingScreensConfig
    ?.create_scenario?.safety_stock?.simulate_scenario_payload_keys || [
    "article",
    "size",
    "loc_code",
  ];

  const simulateCreateScenario = (
    selectedSku,
    onFilterOrReset = false,
    dateFilters = []
  ) => {
    if (selectedSku.length > 0) {
      try {
        const filteredSelectedSku = getSkuRowsMatchingDcFilter(
          selectedSku,
          props?.selectedFilters
        );

        if (filteredSelectedSku.length === 0) {
          displaySnackMessages(
            "No Matching Refs found for the selected DCs",
            "info"
          );
          return;
        }

        const anyEdited = filteredSelectedSku.some(
          (sku) => sku.isEdited === true
        );

        if (anyEdited && !orderCreateTableEdited) {
          setOrderCreateTableEdited(true);
        }
        props.setOrderScenarioApplyTableDataLoader(true);
        setIsSimulateSuccess(true);
        setProgress(0);
        setProgressLoader(true);
        setSimulationError(false);
        if (!onFilterOrReset) {
          setNavigateToSimulation(false);
          setSimulatedTableData([]);
          navigate(`${routes.createScenario}?step=1`);
          setActiveStep(1);
          // Full step-1 grid selection only (clone before row mutations below). Do not shrink this on
          // step-2 re-simulates: DC filter + APIs use filteredSelectedSku; this pool must stay so users
          // can widen DC again and still have rows for those locs.
          setSelectedSafetyStockSkuData(cloneDeep(selectedSku));
        } else {
          // Same as the first step-1 → step-2 transition: unmount the apply panel so it
          // remounts after the APIs finish (mount-only effects + DC-filtered props stay in sync).
          setNavigateToSimulation(false);
          setSimulatedTableData([]);
        }
        filteredSelectedSku.filter((data) => {
          data.service_level_pct = parseFloat(
            parseFloat(data.service_level_pct).toFixed(2)
          );
        });
        let dataPayload = [];
        let payload = [];
        let deepDivePayload = [];
        const uniqueKeys = new Set([
          ...SIMULATE_SCENARIO_PAYLOAD_KEYS,
          ...SIMULATE_SCENARIO_DEEP_DIVE_PAYLOAD_KEYS,
        ]);
        filteredSelectedSku?.forEach((e) => {
          let prodObject = {};
          let deepDiveProdObject = {};
          SIMULATE_SCENARIO_PAYLOAD_KEYS.forEach((key) => {
            if (e[key]) prodObject[key] = replaceSpecialCharToCharCode(e[key]);
          });
          SIMULATE_SCENARIO_DEEP_DIVE_PAYLOAD_KEYS.forEach((key) => {
            if (e[key])
              deepDiveProdObject[key] = replaceSpecialCharToCharCode(e[key]);
          });
          deepDivePayload.push(deepDiveProdObject);
          payload.push(prodObject);
          let updatedObject = { ...e };
          uniqueKeys.forEach((key) => {
            if (e[key] && !isNil(e[key])) {
              updatedObject[key] = replaceSpecialCharToCharCode(e[key]); // Run value through replaceSpecialChar
            }
          });
          if (e.isEdited) {
            updatedObject.isEdited = true;
          }
          dataPayload.push(updatedObject);
        });

        let object = {
          recom_payload: {
            create_scenario_filters: cloneDeep(payload),
            date_filter: cloneDeep(dateFilters),
            is_recommended: isRecommended,
            current_cycle_order: false,
            meta: {},
          },
          data: [...dataPayload],
        };
        let body = {
          data: [...deepDivePayload],
          date_filter: cloneDeep(dateFilters),
        };
        setChartFilterData(deepDivePayload);
        setSimulateDownloadData(object);
        // New OM Create Scenario only — v3 ClickHouse; legacy keeps v2 thunks.
        const deepDiveRequest = props?.useV3CreateScenarioStep2Apis
          ? fetchCreateScenarioDeepDiveV3(body, {
              isV3Schema: props?.isV3Schema === true,
            })
          : props.getOmsDeepDiveTableData(body);
        const simulateRequest = props?.useV3CreateScenarioStep2Apis
          ? fetchSimulateScenarioV3(
              { ...object, is_v3: props?.isV3Schema === true },
              { isDownload: false }
            )
          : props.getOmsCreateScenarioEditTableData(object);
        Promise.allSettled([
          deepDiveRequest,
          simulateRequest,
          props.getCreateScenarioDeepDiveTableConfiguration(),
          props.getScenarioViewTableConfiguration(),
          SHOW_EVENT_GRID
            ? props.getOmsHolidayWeeks(body)
            : Promise.resolve(null),
        ])
          .then((data) => {
            let error = false;
            if (data[2]?.status === "fulfilled") {
              let formattedColumns = agGridColumnFormatter(
                data[2]?.value?.data?.data,
                null,
                null,
                null,
                null,
                null,
                null,
                true
              );
              setDeepDiveTableColumns(formattedColumns);
            } else {
              error = true;
            }
            if (data[3]?.status === "fulfilled") {
              let ScenarioformattedColumns = agGridColumnFormatter(
                data[3]?.value?.data?.data,
                null,
                null,
                null,
                null,
                null,
                null,
                true
              );
              setScenarioViewTableColumns(ScenarioformattedColumns);
            } else {
              error = true;
            }
            if (data[0]?.status === "fulfilled") {
              let formatedData = agGridRowFormatter(data[0]?.value?.data?.data);
              props.setOrderManagementDeepDiveTableData([...formatedData]);
            } else {
              error = true;
            }
            if (data[1].status === "fulfilled") {
              setSimulatedTableData(data[1]?.value?.data?.data?.scenario);
              let scenarioViewformatedData = agGridRowFormatter(
                data[1]?.value?.data?.data?.deep_dive_scenario
              );
              props?.setCreateScenarioViewTableData(scenarioViewformatedData);
              props?.setCreateScenarioAggregatedData(
                data[1]?.value?.data?.data?.aggregated_data || {}
              );
              setProgressLoader(false);
              setSimulationError(false);
              setNavigateToSimulation(true);
              props.setOrderScenarioApplyTableDataLoader(false);
            } else {
              error = true;
            }
            if (SHOW_EVENT_GRID) {
              const holidayResponse = data[4]?.value;
              setHolidayWeeksData(
                holidayResponse?.data?.status
                  ? holidayResponse?.data?.data || []
                  : []
              );
            }
            if (error) {
              setSimulationError(true);
              setProgressLoader(false);
              props.setOrderScenarioApplyTableDataLoader(false);
              setNavigateToSimulation(true);
              displaySnackMessages(ERROR_MESSAGE, "error");
            }
          })
          .catch((error) => {
            setSimulationError(true);
            setProgressLoader(false);
            setNavigateToSimulation(true);
            props.setOrderScenarioApplyTableDataLoader(false);
            displaySnackMessages(ERROR_MESSAGE, "error");
          });
      } catch (error) {
        setSimulationError(true);
        setProgressLoader(false);
        setNavigateToSimulation(true);
        props.setOrderScenarioApplyTableDataLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages("Select atleast one sku id", "error");
    }
  };

  const routeOptions = [
    {
      id: 0,
      label: "Home",
      to: "/home",
    },
    {
      id: 1,
      label: "Order Management",
      action: () => {
        navigateToHighLevelSummary();
      },
    },
    ...(routes.matrixSummary
      ? [
          {
            id: 2,
            label: "Matrix summary",
            action: () => {
              navigate(routes.matrixSummary);
            },
          },
        ]
      : []),
    {
      id: 3,
      label: "Product Details",
      action: () => {
        onBackButtonClickHandler();
      },
    },
    {
      id: 4,
      label: "Create Scenario",
    },
  ];
  const onBackButtonClickHandler = () => {
    let filterDependency =
      props?.filterDashboardConfiguration?.dependencyData?.length > 0
        ? props?.filterDashboardConfiguration?.dependencyData
        : props?.orderManagementFilterDependency;
    navigate(routes.productDetails, {
      state: {
        isRedirectedFromDeepDive: true,
        disabledFilter: isRedirectedFromDifferentPage,
        filterDependency: filterDependency,
      },
    });
    props.setRedirectFromDeepDive(true);
  };

  const navigateToHighLevelSummary = () => {
    props?.setRedirectionDetails({
      target: "high_level_summary",
      source: "matrix_summary",
      dateFilters: props?.redirectDetails?.dateFilters,
    });
    let filterDependency =
      props?.filterDashboardConfiguration?.dependencyData?.length > 0
        ? props?.filterDashboardConfiguration?.dependencyData
        : props?.orderManagementFilterDependency;

    navigate(routes.orderManagement, {
      state: {
        isRedirectedFromDeepDive: true,
        disabledFilter: isRedirectedFromDifferentPage,
        filterDependency: filterDependency,
      },
    });
    props.setRedirectFromDeepDive(true);
    setOrderManagementKpiSummaryLoader(true);
    sessionStorage.setItem("isRedirectedFromMatrixSummary", "true");
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    if (progressLoader && !simulationError) {
      var timer = setTimeout(() => {
        setProgress(progress + 5 <= 95 ? progress + 5 : 95);
      }, 500);
    } else {
      return () => clearInterval(timer);
    }
  }, [progressLoader, progress, simulationError]);

  useEffect(() => {
    adjustMiddleContentHeight(middleContentRef, footerRef);

    // Reset deep dive and scenario table data on unmount
    return () => {
      props.resetOrderManagementDeepDiveTableData();
      props.resetCreateScenarioViewTableData();
    };
  }, []);

  const setOrderCreateTableEditedWithLog = (edited) => {
    console.log("Order create table edited:", edited);
    setOrderCreateTableEdited(edited);
  };

  useEffect(() => {
    if (activeStep === 0) {
      setOrderCreateTableEdited(false);
      setIsSimulateButtonDisabled(true);
    }
  }, [activeStep]);

  return (
    <div className={omsCustomClasses.paddingLayout}>
      <div>
        <HeaderBreadCrumbs options={routeOptions}></HeaderBreadCrumbs>

      </div>

      <div className={omsCustomClasses.padding24}>
        <CreateScenarioStepper
          activeStep={parseInt(activeStep)}
          setActiveStep={setActiveStep}
        />
      </div>
      <div ref={middleContentRef} className="middle-content">
        {activeStep === 0 ? (
          <>
            <div>
              <OrderCreateScenarioTable
                skuData={dataFromOMS}
                simulateCreateScenario={simulateCreateScenario}
                isSimulateSuccess={isSimulateSuccess}
                isRecommended={isRecommended}
                isScenarioApplied={isScenarioApplied}
                primaryKeyFromOMS={PRIMARY_KEY_FROM_OMS}
                filters={filtersFromOMSRef?.current || []}
                setIsSimulateButtonDisabled={setIsSimulateButtonDisabled}
                onEditsDetected={setOrderCreateTableEditedWithLog}
                useV3CreateScenarioSafetyStock={
                  props?.useV3CreateScenarioSafetyStock
                }
                ref={simulateTableRef}
              />
            </div>
          </>
        ) : (
          <div>
            <Loader loader={progressLoader} minHeight={"260px"}>
              {navigateToSimulation && (
                <>
                  <OrderScenarioApplyTable
                    skuData={simulatedTableData}
                    productDetailsRoute={routes.productDetails}
                    deepDiveTableColumn={deepDiveTableColumns}
                    scenarioViewColumns={scenarioViewTableColumns}
                    scenarioViewTableData={props?.createScenarioViewTableData}
                    isRedirectedFromDifferentPage={
                      isRedirectedFromDifferentPage
                    }
                    isScenarioApplied={isScenarioApplied}
                    setIsScenarioApplied={setIsScenarioApplied}
                    selectedSafetyStockSkuData={selectedSafetyStockSkuData}
                    simulateCreateScenario={simulateCreateScenario}
                    orderCreateTableEdited={orderCreateTableEdited}
                    chartFilterData={chartFilterData}
                    simulateDownloadData={simulateDownloadData}
                    holidayWeeksData={holidayWeeksData}
                    isEventsChecked={isEventsChecked}
                    onEventsCheckedChange={setIsEventsChecked}
                    useV3CreateScenarioStep2Apis={
                      props?.useV3CreateScenarioStep2Apis
                    }
                    isV3Schema={props?.isV3Schema}
                  />
                </>
              )}
            </Loader>
          </div>
        )}
      </div>

      <div
        ref={footerRef}
        className={`${omsCustomClasses.bottomButtonsContainer} ${globalClasses.stickyFooter}`}
      >
        {activeStep === 0 ? (
          <>
            <Button
              className={customClasses.button}
              variant="tertiary"
              onClick={() => onBackButtonClickHandler()}
            >
              {"< Back to Product Details"}
            </Button>

            <Button
              className={customClasses.button}
              disabled={isSimulateButtonDisabled}
              variant="primary"
              onClick={() => {
                simulateTableRef.current?.simulate();
              }}
            >
              {"Go to Scenario Results >"}
            </Button>
          </>
        ) : (
          <Button
            className={customClasses.button}
            variant="tertiary"
            onClick={() => setActiveStep(0)}
          >
            {"< Back to Create Scenario"}
          </Button>
        )}
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    createScenarioViewTableData:
      store.omsReducer.orderManagementService.createScenarioViewTableData,
    orderManagementDeepDiveTableData:
      store.omsReducer.orderManagementService.orderManagementDeepDiveTableData,
    orderScenarioApplyTableDataLoader:
      store.omsReducer.orderManagementService.orderScenarioApplyTableDataLoader,
    orderManagementFilterLoader:
      store.omsReducer.orderManagementService.orderManagementFilterLoader,
    orderManagementFilterElements:
      store.omsReducer.orderManagementService.orderManagementFilterElements,
    orderManagementFilterDependency:
      store.omsReducer.orderManagementService.orderManagementFilterDependency,
    backButtonClicked:
      store.omsReducer.orderManagementService.backButtonClicked,
    formFilters: store.omsReducer.orderManagementService.formFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ]?.appliedFilterData,
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    redirectDetails: store.omsReducer.orderManagementService.redirectDetails,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getCreateScenarioDeepDiveTableConfiguration: (payload) =>
    dispatch(getCreateScenarioDeepDiveTableConfiguration(payload)),
  getScenarioViewTableConfiguration: (payload) =>
    dispatch(getScenarioViewTableConfiguration(payload)),
  getOmsDeepDiveTableData: (payload) =>
    dispatch(getOmsDeepDiveTableData(payload)),
  getOmsHolidayWeeks: (payload) => dispatch(getOmsHolidayWeeks(payload)),
  setOrderManagementDeepDiveTableData: (payload) =>
    dispatch(setOrderManagementDeepDiveTableData(payload)),
  setCreateScenarioViewTableData: (payload) =>
    dispatch(setCreateScenarioViewTableData(payload)),
  setCreateScenarioAggregatedData: (payload) =>
    dispatch(setCreateScenarioAggregatedData(payload)),
  setOrderManagementFilterLoader: (payload) =>
    dispatch(setOrderManagementFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setOrderManagementFilterElements: (payload) =>
    dispatch(setOrderManagementFilterElements(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
  getOmsCreateScenarioEditTableData: (payload) =>
    dispatch(getOmsCreateScenarioEditTableData(payload)),
  setOrderScenarioApplyTableDataLoader: (payload) =>
    dispatch(setOrderScenarioApplyTableDataLoader(payload)),
  resetOrderManagementDeepDiveTableData: () =>
    dispatch(resetOrderManagementDeepDiveTableData()),
  resetCreateScenarioViewTableData: () =>
    dispatch(resetCreateScenarioViewTableData()),
  setRedirectionDetails: (payload) => dispatch(setRedirectionDetails(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderCreateScenario);
