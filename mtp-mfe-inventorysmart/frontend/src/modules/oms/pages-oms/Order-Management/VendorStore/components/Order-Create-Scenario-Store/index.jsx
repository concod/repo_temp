import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { useEffect, useState, useRef } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import Loader from "core/Utils/Loader/loader";
import { cloneDeep, isNil, uniq } from "lodash";
import { replaceSpecialCharToCharCode } from "core/Utils/functions/utils";
import { Button } from "impact-ui-v3";

import {
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_CREATE_SCENARIO_STORE,
  ORDER_MANAGEMENT_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_ORDER_DETAILS,
} from "modules/oms/constants-oms/routeConstants";
import { ERROR_MESSAGE } from "modules/oms/constants-oms/stringConstants";
import {
  setOrderManagementFilterElements,
  setOrderManagementFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setRedirectFromDeepDive,
  setOrderScenarioApplyTableDataLoader,
  setOrderManagementDeepDiveTableData,
  setCreateScenarioViewTableData,
  resetOrderManagementDeepDiveTableData,
  resetCreateScenarioViewTableData,
  setCreateScenarioAggregatedData,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  setDeepDiveTableData,
  getOmsVendorToStoreDeepDiveTableData,
  getCreateScenarioDeepDiveTableConfigurationStore,
  getScenarioViewTableConfigurationStore,
  getOmsCreateScenarioEditTableDataStore,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import OrderCreateScenarioStoreTable from "./OrderCreateScenarioStoreTable";
import OrderScenarioStoreApplyTable from "./OrderScenarioStoreApplyTable";
import CreateScenarioStoreStepper from "./CreateScenarioStoreStepper";

const OrderCreateScenarioStore = (props) => {
  const navigate = useNavigate();
  let location = useLocation();

  const globalClasses = globalStyles();
  const customClasses = useStyles();

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
  const [completeFilters, setCompleteFilters] = useState(
    location?.state?.completeFilters
  );

  const PRIMARY_KEY_FROM_OMS =
    location?.state?.primary_key_from_OMS ||
    props?.vendorToStoreScreenConfig?.create_scenario?.safety_stock
      ?.primary_key_from_OMS ||
    "product_code";

  const SIMULATE_SCENARIO_DEEP_DIVE_PAYLOAD_KEYS = props
    ?.vendorToStoreScreenConfig?.create_scenario?.safety_stock
    ?.simulate_scenario_deep_dive_payload_keys || [
    "product_code",
    "store_code",
  ];

  const SIMULATE_SCENARIO_PAYLOAD_KEYS = props?.vendorToStoreScreenConfig
    ?.create_scenario?.safety_stock?.simulate_scenario_payload_keys || [
    "article",
    "size",
    "store_code",
  ];

  const simulateCreateScenario = (
    selectedSku,
    onFilterOrReset = false,
    dateFilters = []
  ) => {
    if (selectedSku.length > 0) {
      try {
        const anyEdited = selectedSku.some((sku) => sku.isEdited === true);

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
          navigate(`${ORDER_MANAGEMENT_CREATE_SCENARIO_STORE}?step=1`);
          setActiveStep(1);
          setSelectedSafetyStockSkuData(selectedSku);
        }
        selectedSku.filter((data) => {
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
        selectedSku?.forEach((e) => {
          let prodObject = {};
          let deepDiveProdObject = {};
          SIMULATE_SCENARIO_PAYLOAD_KEYS.forEach((key) => {
            prodObject[key] = replaceSpecialCharToCharCode(e[key]);
          });
          SIMULATE_SCENARIO_DEEP_DIVE_PAYLOAD_KEYS.forEach((key) => {
            deepDiveProdObject[key] = replaceSpecialCharToCharCode(e[key]);
          });
          deepDivePayload.push(deepDiveProdObject);
          payload.push(prodObject);
          let updatedObject = { ...e };
          uniqueKeys.forEach((key) => {
            if (!isNil(e[key])) {
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
        Promise.allSettled([
          props.getOmsVendorToStoreDeepDiveTableData(body),
          props.getOmsCreateScenarioEditTableDataStore(object),
          props.getCreateScenarioDeepDiveTableConfigurationStore(),
          props.getScenarioViewTableConfigurationStore(),
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
              props.setDeepDiveTableData([...formatedData]);
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
      displaySnackMessages("Please select at least one row.", "error");
    }
  };

  const setOrderCreateTableEditedWithLog = (flag) => {
    setOrderCreateTableEdited(flag);
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

  const navigateToOrderDetails = () => {
    navigate(ORDER_MANAGEMENT_ORDER_DETAILS);
  };

  const routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      id: 1,
      label: "Order Details",
      action: () => {
        navigateToOrderDetails();
      },
    },
    {
      id: 2,
      label: "Create Scenario",
      action: () => {},
    },
  ];

  const getStepComponent = () => {
    switch (activeStep) {
      case 0:
        return (
          <OrderCreateScenarioStoreTable
            deepDiveTableColumns={deepDiveTableColumns}
            filtersFromOMS={filtersFromOMSRef.current}
            completeFilters={completeFilters}
            selectedSafetyStockSkuData={selectedSafetyStockSkuData}
            setSelectedSafetyStockSkuData={setSelectedSafetyStockSkuData}
            setIsSimulateButtonDisabled={setIsSimulateButtonDisabled}
            setOrderCreateTableEdited={setOrderCreateTableEdited}
            setChartFilterData={setChartFilterData}
            PRIMARY_KEY_FROM_OMS={PRIMARY_KEY_FROM_OMS}
            SIMULATE_SCENARIO_PAYLOAD_KEYS={SIMULATE_SCENARIO_PAYLOAD_KEYS}
            isRecommended={isRecommended}
            primaryKeyFromOMS={PRIMARY_KEY_FROM_OMS}
            simulateCreateScenario={simulateCreateScenario}
            skuData={dataFromOMS}
            filters={filtersFromOMSRef?.current || []}
            isScenarioApplied={isScenarioApplied}
            onEditsDetected={setOrderCreateTableEditedWithLog}
            vendorToStoreScreenConfig={props?.vendorToStoreScreenConfig}
          />
        );
      case 1:
        return (
          <OrderScenarioStoreApplyTable
            simulatedTableData={simulatedTableData}
            progress={progress}
            progressLoader={progressLoader}
            simulationError={simulationError}
            isScenarioApplied={isScenarioApplied}
            setIsScenarioApplied={setIsScenarioApplied}
            selectedSafetyStockSkuData={selectedSafetyStockSkuData}
            chartFilterData={chartFilterData}
            simulateDownloadData={simulateDownloadData}
            PRIMARY_KEY_FROM_OMS={PRIMARY_KEY_FROM_OMS}
            simulateCreateScenario={simulateCreateScenario}
            deepDiveTableColumns={deepDiveTableColumns}
            scenarioViewTableColumns={scenarioViewTableColumns}
            vendorToStoreScreenConfig={props?.vendorToStoreScreenConfig}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className={globalClasses.pageContainer}>
      <div className={globalClasses.paddingAround}>
        <div className={globalClasses.marginBottom}>
          <HeaderBreadCrumbs options={routeOptions} />
        </div>

        <CreateScenarioStoreStepper
          activeStep={activeStep}
          setActiveStep={setActiveStep}
        />

        <Loader
          loader={
            props.orderManagementFilterLoader ||
            props.orderScenarioApplyTableDataLoader
          }
          minHeight={"400px"}
        >
          <div className={globalClasses.marginVertical1rem}>
            {getStepComponent()}
          </div>
        </Loader>

        {/* Bottom Navigation */}
        <div className={globalClasses.stickyFooter}>
          {activeStep === 1 ? (
            <Button variant="tertiary" onClick={() => setActiveStep(0)}>
              {"< Back to Create Scenario"}
            </Button>
          ) : (
            <Button variant="tertiary" onClick={navigateToOrderDetails}>
              {"< Back to Order Details"}
            </Button>
          )}
          <div></div>
        </div>
      </div>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    screenConfig: store?.omsReducer.orderingCommonService.orderingScreensConfig,
    vendorToStoreScreenConfig:
      store?.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.oms_dashboard,
    orderManagementFilterLoader:
      store.omsReducer.orderManagementService.orderManagementFilterLoader,
    orderScenarioApplyTableDataLoader:
      store.omsReducer.orderManagementService.orderScenarioApplyTableDataLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  setOrderManagementFilterLoader: (payload) =>
    dispatch(setOrderManagementFilterLoader(payload)),
  getCreateScenarioDeepDiveTableConfigurationStore: (payload) =>
    dispatch(getCreateScenarioDeepDiveTableConfigurationStore(payload)),
  getScenarioViewTableConfigurationStore: (payload) =>
    dispatch(getScenarioViewTableConfigurationStore(payload)),
  setOrderScenarioApplyTableDataLoader: (payload) =>
    dispatch(setOrderScenarioApplyTableDataLoader(payload)),
  setDeepDiveTableData: (payload) => dispatch(setDeepDiveTableData(payload)),
  setCreateScenarioViewTableData: (payload) =>
    dispatch(setCreateScenarioViewTableData(payload)),
  getOmsVendorToStoreDeepDiveTableData: (payload) =>
    dispatch(getOmsVendorToStoreDeepDiveTableData(payload)),
  getOmsCreateScenarioEditTableDataStore: (payload) =>
    dispatch(getOmsCreateScenarioEditTableDataStore(payload)),
  setCreateScenarioAggregatedData: (payload) =>
    dispatch(setCreateScenarioAggregatedData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderCreateScenarioStore);
