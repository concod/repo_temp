import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import LoadingOverlay from "core/Utils/Loader/loader";
import { getCoreFiscalCalendar } from "core/actions/inventoryAction";
import AdaDashboardFilters from "../Dashboard/adaDashboardFilters"; // allocationInventoryPayload,
import {
  getStaticForecastXaxis,
  resetState,
  setFiscalCalendarDetails,
  setXaxisStaticDates,
  fetchTenantFilters,
  getClientConfig,
  getUserConfig,
  setClientConfig,
  setClientConfigLoader,
  setTenantConfigLoader,
  setTenantFilters,
  setUserConfig,
  setUserConfigLoader,
  setEligibilityFlag,
  setIsFiltersValid,
  setCommentConfig,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import ForecastKPIWrapper from "./Forecast-KPI";
import { useTranslation } from "impact-ui-v3";
import DemandSelectionWrapper from "./Demand-Selection";
import AdaMfpBreadcrumb from "./mf-ada-breadcrumb";
// import { setResetForecastData } from "modules/ada/services-ada/ada-dashboard/ada-edit-forecast-services";
import moment from "moment";
import {
  adaPayloadFromSelectedFilters,
  getDashboardBasedOnRepoRoute,
  prepareInventoryPayload,
} from "modules/ada/utils-ada/utilityFunctions";
// import { useHistoricActual } from "modules/ada/utils-ada/customHooks/useHostoricActuals";
import ShowHistoricDropDown from "modules/ada/utils-ada/show-historic-dropdown";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "../ada-styles";
import colours from "core/Styles/colours";
import { isEmpty } from "lodash";
import { LoadingProvider } from "../Dashboard/LoaderWrapper";
import ForecastAdjustmentWrapper from "./forecast-adjustment-wrapper";
import { makeStyles } from "@mui/styles";
import DemandManageToggle from "../Dashboard/DemandManageToggle";
import { useHistory } from "react-router";
import { getModuleBasedTenantConfig } from "../../utils-ada/utilityFunctions.js";

export const redirectedFromInventoryDashboard = localStorage.getItem(
  "adaPayload"
);

const ADAForecastDashboard = (props) => {
  const classes = useStyles();

  const history = useHistory();

  const [payloadCreatedFromMFP, setPayloadCreatedFromMFP] = useState(
    props?.location?.adaPayload
  );

  const [isRedirectedFromADAVisual, setIsRedirectedFromAdaVisual] = useState(
    props?.location?.isRedirectedFromADAVisual
  );

  const [pastYear, setPastYear] = useState([]);
  const [graphPayload, setGraphPayload] = useState({});
  const [activeKey, setActiveKey] = useState(0);

  const [loader, setLoader] = useState(false);

  const [lastEditedDrivers, setLastEditedDrivers] = useState([]);
  const [activeChildHierarchyKey, setActiveChildHierarchyKey] = useState(null);
  let lastEditedDriversRef = useRef([]);
  let editHierarchyInstance = useRef({});
  let editHierarchyTotalRowInstance = useRef({});
  let editHierarchyChildInstance = useRef({});
  let editHierarchyGrandChildInstance = useRef({});
  let editHierarchyChildTotalRowInstance = useRef({});
  let allEditedChildRowData = useRef({});
  let allEditedGrandChildRowData = useRef({});
  let allEditedGrandChildRowMapping = useRef({});
  let initialEditChildRowData = useRef({});
  let initialEditRowData = useRef({});
  let initialTotalRowData = useRef({});
  let editChildRowData = useRef({});
  let forecastMultiplierInstance = useRef({});
  let SkuName = useRef({});
  let isCompareChanges = useRef(false);
  let currentHierarchyKey = useRef(null);
  const makeDemandSelectionCAll = useRef(true);
  const [showScenario, setShowScenario] = useState(false);
  const [
    counterOnEditHierarchyChange,
    setCounterOnEditHierarchyChange,
  ] = useState(0);
  const [refreshChartDataCounter, setRefreshChartDataCounter] = useState(0);
  const [parentControlledVal, setParentControlledVal] = useState(0);
  const [selectedForecast, setSelectedForecast] = useState({
    selected: "",
    activeKey: 0,
  });

  const dispatch = useDispatch();
  const { t } = useTranslation();
  // useHistoricActual(activeKey, true, true);
  const globalClasses = globalStyles();

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const adaVisualFilterConfiguration = useSelector(
    (store) =>
      store?.filterReducer?.filterDashboardConfiguration[
        "adaVisualFilterConfiguration"
      ]
  );

  const isDemandSelectionHidden =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_demand_selection_hidden;

  const updateAllData = async () => {
    setActiveKey((prevState) => prevState + 1);
  };

  //Fetching Tenant Based Filters
  useEffect(() => {
    const getTenantFilters = async () => {
      try {
        dispatch(setTenantConfigLoader(true));
        const { data } = await fetchTenantFilters();
        dispatch(setTenantFilters(data?.data));
      } catch (error) {
      } finally {
        dispatch(setTenantConfigLoader(false));
      }
    };

    if (props?.isRedirectedFromInventory) getTenantFilters();
  }, []);

  // //Fetching Client Based Configs
  useEffect(() => {
    const getClientBasedConfig = async () => {
      try {
        dispatch(setClientConfigLoader(true));
        dispatch(setModuleConfigsLoader(true));
        const [
          configuratorData,
          { data },
          commentingConfig,
        ] = await Promise.all([
          getModuleBasedTenantConfig({
            module_name: "Ada Visual Module Configurator",
            app_code: 1,
          })(),
          getClientConfig(),
          getModuleBasedTenantConfig({
            module_name: "commenting_configuration",
            app_code: 1,
          })(),
        ]);
        // Store configurator data in Redux
        dispatch(setModuleConfiguratorData(configuratorData));
        dispatch(setCommentConfig(commentingConfig || {}));
        let clientConfigData = data?.data?.[0];
        if (configuratorData?.hasOwnProperty("mfp")) {
          clientConfigData.attribute_value.mfp = configuratorData.mfp;
        }
        if (configuratorData?.hasOwnProperty("client_forecast_name")) {
          clientConfigData.attribute_value.show_features.custom_mfp_label =
            configuratorData.client_forecast_name;
        }
        dispatch(setClientConfig(clientConfigData));
        if (configuratorData?.hasOwnProperty("default_eligible_skus")) {
          dispatch(setEligibilityFlag(configuratorData?.default_eligible_skus));
        } else if (clientConfigData?.attribute_value?.hasOwnProperty("only_eligible")) {
          dispatch(setEligibilityFlag(clientConfigData?.attribute_value?.only_eligible));
        } else {
          dispatch(setEligibilityFlag(true));
        }
      } catch (error) {
        console.log(error);
      } finally {
        dispatch(setClientConfigLoader(false));
        dispatch(setModuleConfigsLoader(false));
      }
    };

    if (props?.isRedirectedFromInventory) getClientBasedConfig();
  }, []);

  //Fetching User Based Configs
  useEffect(() => {
    const getUserBasedConfig = async () => {
      try {
        dispatch(setUserConfigLoader(true));
        const { data } = await getUserConfig();
        dispatch(setUserConfig(data?.data));
      } catch (error) {
      } finally {
        dispatch(setUserConfigLoader(false));
      }
    };
    if (props?.isRedirectedFromInventory) getUserBasedConfig();
  }, []);

  //Getting Calendar Details for Date Range in the filter
  useEffect(() => {
    const getCalendarDetails = async () => {
      try {
        setLoader(true);
        const getFinancialCalendarData = await getCoreFiscalCalendar();
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        dispatch(
          setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data)
        );
      } catch (error) {
        console.log("Error in Fetching Calendar Details", error);
      } finally {
        setLoader(false);
      }
    };
    getCalendarDetails();
  }, []);

  //Resetting all redux stores
  useEffect(() => {
    return () => {
      if (adaReducer?.clientConfig?.attribute_value?.mfp) {
        return;
      }

      dispatch(resetState());
      // dispatch(setResetForecastData());
    };
  }, []);

  useEffect(() => {
    const fetch = async () => {
      if (!isEmpty(graphPayload)) {
        const data = await getStaticForecastXaxis(graphPayload);
        dispatch(setXaxisStaticDates(data));
      }
    };
    if (!activeKey) {
      return;
    } else {
      fetch();
    }
  }, [activeKey]);

  const resetDrivers = () => {
    // setDriverForecastVal(null);
    // setDriverForecastAllVal(null);
    // setLastEditedDrivers([]);

    setSelectedForecast({
      selected: "",
      activeKey: 0,
    });

    // reset previous hierarchy data on apply filter

    currentHierarchyKey.current = null;
    forecastMultiplierInstance.current = {};
    editHierarchyInstance.current = {};
    editHierarchyTotalRowInstance.current = {};
    editHierarchyChildInstance.current = {};
    editHierarchyGrandChildInstance.current = {};
    editHierarchyChildTotalRowInstance.current = {};

    editChildRowData.current = {};
    allEditedChildRowData.current = {};
    initialEditRowData.current = {};
    initialTotalRowData.current = {};
    initialEditChildRowData.current = {};
    allEditedGrandChildRowData.current = {};
    allEditedGrandChildRowMapping.current = {};
    lastEditedDriversRef.current = [];
    SkuName.current = {};
    isCompareChanges.current = false;
    setActiveChildHierarchyKey(null);
  };

  useEffect(() => {
    if (!activeKey || activeKey === 1) return;
    resetDrivers();
    setLastEditedDrivers([]);
    // setIsTabMounted(false)
    // isTabMounted.current = false;
  }, [activeKey]);

  const resetDemandSelectionRefs = () => {
    currentHierarchyKey.current = null;
    editHierarchyInstance.current = {};
    editHierarchyTotalRowInstance.current = {};
    editHierarchyChildInstance.current = {};
    editHierarchyGrandChildInstance.current = {};
    editHierarchyChildTotalRowInstance.current = {};
    editChildRowData.current = {};
    allEditedChildRowData.current = {};
    initialEditRowData.current = {};
    initialTotalRowData.current = {};
    initialEditChildRowData.current = {};
    allEditedGrandChildRowData.current = {};
    allEditedGrandChildRowMapping.current = {};
    lastEditedDriversRef.current = [];
    SkuName.current = {};
    isCompareChanges.current = false;
    setActiveChildHierarchyKey(null);
  };

  const setMakeDemandSelectionCAll = (value) => {
    makeDemandSelectionCAll.current = value;
  };

  const redirectToForecastManagement = () => {
    let dependencyData =
      adaVisualFilterConfiguration?.appliedFilterData?.dependencyData;

    let adaPayload = adaPayloadFromSelectedFilters(adaReducer, dependencyData);

    let searchParams = new URLSearchParams(window.location.search);
    let isInventoryRepo = searchParams.get("inventorysmart");

    let typeFromUrl = searchParams.get("type");
    const isInventoryRedirection = typeFromUrl === "adaPayloadFromInventory";
    const isInventoryRedirectionProp = props?.location?.isInventoryRedirection;
    const isFromInventory =
      isInventoryRedirection || isInventoryRedirectionProp;

    if (!isFromInventory) {
      dispatch(setIsFiltersValid(false));
    }

    history.push({
      pathname: getDashboardBasedOnRepoRoute(isInventoryRepo),
      isRedirectedFromMFPDashboard: true,
      isInventoryRedirection: isFromInventory,
      adaPayload: JSON.stringify(adaPayload),
    });
  };

  return (
    <>
      <LoadingProvider>
        <div className={globalClasses.paddingAround}>
          <AdaDashboardFilters
            setActiveKey={setActiveKey}
            loader={loader}
            setPastYear={setPastYear}
            setGraphPayload={setGraphPayload}
            isCalledFromMFPDashboard={true}
            setMakeDemandSelectionCAll={setMakeDemandSelectionCAll}
            headerBreadCrumb={<AdaMfpBreadcrumb />}
            {...props}
          >
            <LoadingOverlay
              loader={
                adaReducer?.fullScreenLoaderCount ||
                adaReducer?.filterFullScreenLoaderCount
              }
            >
              <>
                <DemandManageToggle
                  {...props}
                  value={"demand_selection"}
                  onChange={(val) => redirectToForecastManagement(val)}
                />

                <div
                  className={classes.forecastKpiContainer}
                  style={{ backgroundColor: colours.white }}
                >
                  <h3 style={{ margin: "0 0 1rem 0", fontWeight: "500" }}>
                    {t("ada.accordionTitles.overview")}
                  </h3>

                  <hr />

                  <ShowHistoricDropDown
                    key={activeKey}
                    activeKey={activeKey}
                    pastYear={pastYear}
                    isCalledFromMFPDashboard={true}
                  />

                  {adaReducer?.clientConfig?.attribute_value?.show_features
                    ?.kpi && (
                    <ForecastKPIWrapper
                      activeKey={activeKey}
                      updateAllData={updateAllData}
                    />
                  )}
                  <div
                    style={{
                      visibility:
                        adaReducer?.fullScreenLoaderCount ||
                        adaReducer?.filterFullScreenLoaderCount
                          ? "hidden"
                          : "visible",
                    }}
                  >
                    <ForecastAdjustmentWrapper
                      activeKey={activeKey}
                      updateAllData={updateAllData}
                      lastEditedDrivers={lastEditedDrivers}
                      setLastEditedDrivers={setLastEditedDrivers}
                      selectedForecast={selectedForecast}
                      showRedirectToADAButton={adaReducer?.isFiltersValid}
                      hidePastHistoricData={true}
                      showScenario={showScenario}
                      activeChildHierarchyKey={activeChildHierarchyKey}
                      counterOnEditHierarchyChange={
                        counterOnEditHierarchyChange
                      }
                      parentControlledVal={parentControlledVal}
                      refreshChartDataCounter={refreshChartDataCounter}
                      isRedirectedFromInventory={
                        props?.isRedirectedFromInventory
                      }
                      ref={{
                        lastEditedDriversRef,
                        activeChildHierarchyKey,
                        editHierarchyInstance,
                        editHierarchyChildTotalRowInstance,
                        editHierarchyChildInstance,
                        editHierarchyTotalRowInstance,
                        editHierarchyGrandChildInstance,
                        allEditedChildRowData,
                        allEditedGrandChildRowData,
                        allEditedGrandChildRowMapping,
                      }}
                      {...props}
                    />
                  </div>

                  {/* <ForecastSummaryWrapper
                    activeKey={activeKey}
                    updateAllData={updateAllData}
                    lastEditedDrivers={lastEditedDrivers}
                    setLastEditedDrivers={setLastEditedDrivers}
                    selectedForecast={selectedForecast}
                    ref={{
                      lastEditedDriversRef,
                      activeChildHierarchyKey,
                      editHierarchyInstance,
                      editHierarchyChildTotalRowInstance,
                      editHierarchyChildInstance,
                      editHierarchyTotalRowInstance,
                      editHierarchyGrandChildInstance,
                      allEditedChildRowData,
                      allEditedGrandChildRowData,
                      allEditedGrandChildRowMapping,
                    }}
                  />

                  <ForecastVisualWrapper
                    activeKey={activeKey}
                    updateAllData={updateAllData}
                    showRedirectToADAButton={adaReducer?.isFiltersValid}
                    hidePastHistoricData={true}
                    showScenario={showScenario}
                    activeChildHierarchyKey={activeChildHierarchyKey}
                    lastEditedDrivers={lastEditedDrivers}
                    counterOnEditHierarchyChange={counterOnEditHierarchyChange}
                    parentControlledVal={parentControlledVal}
                    refreshChartDataCounter={refreshChartDataCounter}
                    isRedirectedFromInventory={props?.isRedirectedFromInventory}
                    ref={{
                      editHierarchyTotalRowInstance,
                      editHierarchyInstance,
                      allEditedChildRowData,
                      editHierarchyChildInstance,
                      allEditedGrandChildRowData,
                      allEditedGrandChildRowMapping,
                      editHierarchyGrandChildInstance,
                    }}
                  /> */}
                </div>
                {adaReducer?.isFiltersValid &&
                  adaReducer?.clientConfig?.attribute_value?.mfp &&
                  !isDemandSelectionHidden && (
                    <DemandSelectionWrapper
                      activeKey={activeKey}
                      updateAllData={updateAllData}
                      lastEditedDrivers={lastEditedDrivers}
                      counterOnEditHierarchyChange={
                        counterOnEditHierarchyChange
                      }
                      setActiveChildHierarchyKey={setActiveChildHierarchyKey}
                      setCounterOnEditHierarchyChange={
                        setCounterOnEditHierarchyChange
                      }
                      activeChildHierarchyKey={activeChildHierarchyKey}
                      resetDemandSelectionRefs={resetDemandSelectionRefs}
                      ref={{
                        editHierarchyInstance,
                        editHierarchyTotalRowInstance,
                        forecastMultiplierInstance,
                        editHierarchyChildInstance,
                        editHierarchyGrandChildInstance,
                        editHierarchyChildTotalRowInstance,
                        initialEditChildRowData,
                        allEditedGrandChildRowData,
                        lastEditedDriversRef,
                        initialEditRowData,
                        initialTotalRowData,
                        editChildRowData,
                        currentHierarchyKey,
                        allEditedChildRowData,
                        allEditedGrandChildRowMapping,
                        SkuName,
                        isCompareChanges,
                        makeDemandSelectionCAll,
                      }}
                    />
                  )}
              </>
            </LoadingOverlay>
          </AdaDashboardFilters>
        </div>
      </LoadingProvider>
    </>
  );
};

export default ADAForecastDashboard;
