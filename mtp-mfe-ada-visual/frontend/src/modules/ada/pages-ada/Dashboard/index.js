import { createContext, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  adaPayloadFromSelectedFilters,
  prepareInventoryPayload,
  getMFPBasedOnRepoRoute,
} from "modules/ada/utils-ada/utilityFunctions";
import AdaBreadcrumb from "./ada-breadcrumb";
import {
  getCoreFiscalCalendar,
  resetState,
  setFiscalCalendarDetails,
  setEligibilityFlag,
  fetchTenantFilters,
  getClientConfig,
  getUserConfig,
  setClientConfig,
  setClientConfigLoader,
  setTenantConfigLoader,
  setTenantFilters,
  setUserConfig,
  setUserConfigLoader,
  setIsRedirectedFromInventory,
  setInventorypreAppliedFilters,
  setIsFiltersValid,
  setCommentConfig,
  setForecastAttributesApiResolved,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Container } from "@mui/material";
import { Button } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
// import { setResetForecastData } from "modules/ada/services-ada/ada-dashboard/ada-edit-forecast-services";
import { Switch } from "impact-ui-v3";
import AdaDashboardFilters from "./adaDashboardFilters";
import ShowHistoricDropDown from "modules/ada/utils-ada/show-historic-dropdown";
import moment from "moment";
import {
  setResetScenario1,
  setResetScenario2,
} from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import { ADA_DASHBOARD } from "modules/ada/constants-ada/routesContants";
import { useHistory } from "react-router";
import { Prompt, useTranslation } from "impact-ui-v3";
import classNames from "classnames";
import { LoadingProvider } from "./LoaderWrapper";
import globalStyles from "core/Styles/globalStyles";

import TabContainer from "./tab-container/tab-container";
import ChannelDriverSignificance from "./driver-forecast-table/ChannelDriverSignificance";
import { useSearchParams } from "react-router-dom-v5-compat";
import DemandManageToggle from "./DemandManageToggle";
import { getModuleBasedTenantConfig } from "../../utils-ada/utilityFunctions.js";
import {
  setModuleConfiguratorData,
  setModuleConfigsLoader,
} from "modules/ada/services-ada/ada-dashboard/ada-module-configurator-service";

export const redirectedFromInventoryDashboard = localStorage.getItem(
  "adaPayload"
);

export const SaveForecastContext = createContext({});

const AdaDashboard = (props) => {
  const [loader, setLoader] = useState(false);
  const [tenantLoader, setTenantLoader] = useState(false);
  const [activeKey, setActiveKey] = useState(0);
  const [showScenario, setShowScenario] = useState(false);
  const [showScenario2, setShowScenario2] = useState(false);
  const [disableShowScenario, setDisableShowScenario] = useState(false);
  const [pastYear, setPastYear] = useState([]);
  const [graphPayload, setGraphPayload] = useState({});
  const [isMFPEnabled, setIsMFPEnabled] = useState(false);
  const [showTabContainer, setShowTabContainer] = useState(true);
  const [payloadCreatedFromMFP, setPayloadCreatedFromMFP] = useState(
    props?.location?.adaPayload
  );
  const [payloadForFilterChips, setPayloadForFilterChips] = useState(
    props?.location?.adaPayload && JSON.parse(props?.location?.adaPayload)
  );
  // const [isRedirectedToMFP, setIsRedirectedToMFP] = useState(false);
  const [
    isRedirectedFromMFPDashboard,
    setIsRedirectedFromMFPDashboard,
  ] = useState(props?.location?.isRedirectedFromMFPDashboard);
  const [showPrompt, setShowPrompt] = useState(false);
  const [viewMode, setViewMode] = useState("demand");

  const navigatingToMFP = useRef(false);

  const adaDashboardReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const adaForecastMultiplierReducer = useSelector(
    (store) => store?.adaReducer?.adaForecastMultiplierReducer
  );

  const adaModuleConfiguratorReducer = useSelector(
    (store) =>
      store?.adaReducer?.adaModuleConfiguratorReducer?.moduleConfiguratorData
  );

  const showDriverSignificance =
    adaDashboardReducer?.clientConfig?.attribute_value?.show_features
      ?.showDriverSignificance;

  const dispatch = useDispatch();
  const { t } = useTranslation();
  const history = useHistory();
  const [searchParams] = useSearchParams();

  const globalClasses = globalStyles();

  const isEligible = adaDashboardReducer?.isEligible;
  const handleScenario2 = (status) => {
    if (!showScenario2) {
      setShowScenario2(true);
    } else {
      dispatch(setResetScenario2());
      setShowScenario2(false);
    }
  };

  const handleScenario = (status) => {
    if (!showScenario) {
      setShowScenario(true);
    } else {
      dispatch(setResetScenario1());
      setShowScenario(false);
    }
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

  // Fetching Client Based Configs
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

  useEffect(() => {
    if (props?.isRedirectedFromInventory && redirectedFromInventoryDashboard) {
      dispatch(setIsRedirectedFromInventory(true));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (
        props?.location?.isRedirectedFromMFPDashboard ||
        props?.location?.isRedirectedFromDashboard ||
        navigatingToMFP.current
      )
        return;
      dispatch(resetState());
      // dispatch(setResetForecastData());
    };
  }, []);

  useEffect(() => {
    // This timeout allows the tab container to remount with a slight delay
    // This helps prevent loader getting stuck in loading state when applying filters
    if (!showTabContainer) {
      const timer = setTimeout(() => {
        setShowTabContainer(true);
      }, 160);
      return () => clearTimeout(timer);
    }
  }, [activeKey, showTabContainer]);

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
      } finally {
        setLoader(false);
      }
    };
    getCalendarDetails();
  }, []);

  // added to set the tenant date format in local storage for filter chips
  useEffect(() => {
    const dateFormat =
      adaDashboardReducer.clientConfig?.attribute_value
        ?.week_end_date_label_config?.week_end_date_label_formatting;
    if (dateFormat) {
      localStorage.setItem("tenantDateFormat", dateFormat);
    }
  }, [adaDashboardReducer.clientConfig]);

  const updateAllData = async () => {
    setActiveKey((prevState) => prevState + 1);
  };

  //Handling Back Button to MFP Dashboard
  const adaVisualFilterConfiguration = useSelector(
    (store) =>
      store?.filterReducer?.filterDashboardConfiguration[
        "adaVisualFilterConfiguration"
      ]
  );
  const handleBackButtonToMFP = (shouldRedirect = false) => {
    if (!shouldRedirect) {
      setShowPrompt(true);
      return;
    }

    let searchParams = new URLSearchParams(window.location.search);
    let isInventoryRepo = searchParams.get("inventorysmart");
    let typeFromUrl = searchParams.get("type");
    const isInventoryRedirectionFromUrl = typeFromUrl === "adaPayloadFromInventory";
    const isInventoryRedirectionProp = props?.location?.isInventoryRedirection;
    const isFromInventory =
      isInventoryRedirectionFromUrl || isInventoryRedirectionProp;
    let dependencyData =
      adaVisualFilterConfiguration?.appliedFilterData?.dependencyData;

    let adaPayload = adaPayloadFromSelectedFilters(
      adaDashboardReducer,
      dependencyData
    );

    if (!isFromInventory) {
      dispatch(setIsFiltersValid(false));
    }
    navigatingToMFP.current = true;
    // localStorage.setItem("adaPayload", JSON.stringify(adaPayload));
    history.push({
      pathname: getMFPBasedOnRepoRoute(isInventoryRepo),
      isRedirectedFromDashboard: true,
      isInventoryRedirection: isFromInventory,
      adaPayload: JSON.stringify(adaPayload),
    });
  };

  const classes = useStyles();

  const shouldShowEligibleToggle = (
    adaModuleConfiguratorReducer,
    adaDashboardReducer
  ) => {
    if (adaModuleConfiguratorReducer?.hasOwnProperty("show_eligible_toggle")) {
      return adaModuleConfiguratorReducer.show_eligible_toggle;
    }
    return adaDashboardReducer?.clientConfig?.attribute_value
      ?.show_eligible_toggle;
  };

  return (
    <LoadingProvider>
      {/* <Prompt
        isOpen={showPrompt}
        title="Leaving Page?"
        subHeading="Are you sure you want to leave the page?"
        infoList={["Any unsaved changes will be lost."]}
        primaryButtonProps={{
          children: "Continue",
          onClick: () => {
            handleBackButtonToMFP(true);
          },
        }}
        tertiaryButtonProps={{
          children: "Cancel",
          onClick: () => {
            setShowPrompt(false);
          },
        }}
        variant="warning"
      /> */}
      <Prompt
        isOpen={showPrompt}
        title={t("ada.dashboard.leavingPageTitle")}
        children={
          <>
            {t("ada.dashboard.leavingPageMessage")}
            <br />
            {t("ada.dashboard.unsavedChangesLost")}
          </>
        }
        primaryButtonLabel={t("ada.dashboard.continue")}
        secondaryButtonLabel={t("ada.dashboard.cancel")}
        onPrimaryButtonClick={() => {
          handleBackButtonToMFP(true);
        }}
        onSecondaryButtonClick={() => {
          setShowPrompt(false);
        }}
        primaryButtonProps={{
          children: "Continue",
          onClick: () => {
            handleBackButtonToMFP(true);
          },
        }}
        tertiaryButtonProps={{
          children: "Cancel",
          onClick: () => {
            setShowPrompt(false);
          },
        }}
        variant="warning"
      />
      <div className={!isMFPEnabled && globalClasses.paddingAround}>
        <AdaDashboardFilters
          setActiveKey={setActiveKey}
          loader={loader}
          setPastYear={setPastYear}
          setGraphPayload={setGraphPayload}
          setDisableShowScenario={setDisableShowScenario}
          headerBreadCrumb={<AdaBreadcrumb isMFPEnabled={isMFPEnabled} />}
          setShowTabContainer={setShowTabContainer}
          isRedirectedFromMFPDashboard={isRedirectedFromMFPDashboard}
          {...props}
        >
          <LoadingOverlay
            loader={
              adaDashboardReducer?.fullScreenLoaderCount ||
              adaDashboardReducer?.filterFullScreenLoaderCount ||
              adaDashboardReducer?.tenantConfigLoader ||
              adaDashboardReducer?.clientConfigLoader ||
              adaDashboardReducer?.userConfigLoader
            }
            centerLoaderStyles={centerLoaderStyles}
          >
            {adaDashboardReducer.clientConfig?.attribute_value?.mfp && (
              <DemandManageToggle
                {...props}
                value={"manage_forecast"}
                onChange={(val) => handleBackButtonToMFP(true)}
              />
            )}
            <Container
              maxWidth={false}
              className={classNames(
                classes.container,
                adaDashboardReducer?.fullScreenLoaderCount ||
                  adaDashboardReducer?.filterFullScreenLoaderCount ||
                  adaDashboardReducer?.tenantConfigLoader ||
                  adaDashboardReducer?.clientConfigLoader ||
                  adaDashboardReducer?.userConfigLoader
                  ? classes.dataLoading
                  : classes.dataLoaded
              )}
            >
              {/* remove this once new feature-demand manage toggle is tested on routing via inventory */}

              {/* {props.location.isInventoryRedirection && payloadCreatedFromMFP && (
                <div className={classes.backButtonToMFPContainer}>
                  <Button
                    variant="text"
                    onClick={() => {
                      handleBackButtonToMFP(false);
                    }}
                  >
                    Return to ADA Visual Landing Page
                  </Button>
                </div>
              )} */}

              <div className={classes.scenariosTabsContainer}>
                {adaDashboardReducer?.clientConfig?.attribute_value
                  ?.attribute_value?.dashboard?.showAddScenarioBtn && (
                  <>
                    <Button
                      disabled={disableShowScenario}
                      className={classes.addScenarioButton}
                      variant="primary"
                      onClick={handleScenario}
                    >
                      {!showScenario
                        ? t("ada.dashboard.addScenario1")
                        : t("ada.dashboard.deleteScenario1")}
                    </Button>
                    {adaDashboardReducer?.clientConfig?.attribute_value
                      ?.show_features?.show_two_scenarios &&
                      showScenario && (
                        <Button
                          disabled={disableShowScenario}
                          className={classes.addScenarioButton}
                          variant="primary"
                          onClick={handleScenario2}
                        >
                          {!showScenario2
                            ? t("ada.dashboard.addScenario2")
                            : t("ada.dashboard.deleteScenario2")}
                        </Button>
                      )}
                  </>
                )}
                {shouldShowEligibleToggle(
                  adaModuleConfiguratorReducer,
                  adaDashboardReducer
                ) && (
                  <div className={classes.switchContainer}>
                    <Switch
                      id="isparent"
                      name="isparent"
                      checked={!isEligible}
                      value={!isEligible}
                      onChange={(e) => {
                        dispatch(setForecastAttributesApiResolved(false));
                        dispatch(setEligibilityFlag(!e.target.checked));
                      }}
                      leftLabel={t("ada.dashboard.eligibleSKUs")}
                      rightLabel={t("ada.dashboard.allSKUs")}
                    />
                  </div>
                )}

                <ShowHistoricDropDown
                  key={activeKey}
                  activeKey={activeKey}
                  pastYear={pastYear}
                />
                {showDriverSignificance && (
                  <ChannelDriverSignificance
                    activeKey={activeKey}
                    label={t("ada.dashboard.viewDriversContribution")}
                  />
                )}
              </div>

              {showTabContainer && (
                <TabContainer
                  key={activeKey}
                  showScenario={showScenario}
                  showScenario2={showScenario2}
                  activeKey={activeKey}
                  graphPayload={graphPayload}
                  isMFPEnabled={isMFPEnabled}
                  updateAllData={updateAllData}
                  setDisableShowScenario={setDisableShowScenario}
                  setActiveKey={setActiveKey}
                  viewMode={viewMode}
                  {...props}
                />
              )}
            </Container>
          </LoadingOverlay>
        </AdaDashboardFilters>
      </div>
    </LoadingProvider>
  );
};

export default AdaDashboard;

const useStyles = makeStyles((theme) => ({
  container: {
    position: "relative",
    padding: 0,
  },
  dataLoading: {
    opacity: 0,
  },
  dataLoaded: {
    opacity: 1,
  },
  titleFilter: {
    marginBottom: "1rem",
  },
  backButtonToMFPContainer: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "0.75rem",
  },
  scenariosTabsContainer: {
    display: "flex",
    justifyContent: "flex-end",
    marginBottom: "2rem",
    marginTop: "1rem",
  },
  addScenarioButton: {
    whiteSpace: "nowrap",
    marginRight: ".5rem !important",
  },

  noFilterContainer: {
    border: `1px solid ${theme.palette.textColours.tiara}`,
    margin: `1rem 0`,
    padding: `0.7rem`,
    borderRadius: "3px",
    fontSize: "0.9rem",
    color: `${theme.palette.textColours.slateGrayLight}`,
  },
  switchContainer: {
    display: "flex",
    alignItems: "center",
    marginRight: "1rem",
  },
}));

const centerLoaderStyles = {
  position: "fixed",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
};
