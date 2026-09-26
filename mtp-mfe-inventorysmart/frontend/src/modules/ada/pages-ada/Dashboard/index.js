import { createContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  createPayloadForADAVisual,
  prepareInventoryPayload,
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
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Container } from "@mui/material";
import { Button } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";
import DashboardTabs from "./dashboardTabs";
import { setResetForecastData } from "modules/ada/services-ada/ada-dashboard/ada-edit-forecast-services";
import { Switch } from "impact-ui-v3";
import AdaDashboardFilters, {
  allocationInventoryPayload,
} from "./adaDashboardFilters";
import ShowHistoricDropDown from "modules/ada/utils-ada/show-historic-dropdown";
import moment from "moment";
import {
  setResetScenario1,
  setResetScenario2,
} from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import { adaReducer } from "modules/ada/services-ada/ada-combined-services";
import { ADA_DASHBOARD } from "modules/ada/constants-ada/routesContants";
import { useHistory } from "react-router";
import { Prompt } from "impact-ui-v3";
import { ADA_VISUAL_MFP_DASHBOARD } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import classNames from "classnames";
import { LoadingProvider } from "./LoaderWrapper";
import globalStyles from "core/Styles/globalStyles";
import ChannelDriverSignificance from "./driver-forecast-table/ChannelDriverSignificance";

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
  const [payloadCreatedFromMFP, setPayloadCreatedFromMFP] = useState(
    props?.location?.adaPayload
  );
  const [payloadForFilterChips, setPayloadForFilterChips] = useState(
    props?.location?.adaPayload && JSON.parse(props?.location?.adaPayload)
  );
  const [isRedirectedToMFP, setIsRedirectedToMFP] = useState(false);
  const [
    isRedirectedFromMFPDashboard,
    setIsRedirectedFromMFPDashboard,
  ] = useState(props?.location?.isRedirectedFromMFPDashboard);
  const [showPrompt, setShowPrompt] = useState(false);

  const adaDashboardReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const showDriverSignificance =
    adaDashboardReducer?.clientConfig?.attribute_value?.show_features
      ?.showDriverSignificance;

  const dispatch = useDispatch();
  const history = useHistory();
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

  //Fetching Client Based Configs
  useEffect(() => {
    const getClientBasedConfig = async () => {
      try {
        dispatch(setClientConfigLoader(true));
        const { data } = await getClientConfig();
        dispatch(setClientConfig(data?.data?.[0]));

        const config = data?.data?.[0]?.attribute_value;
        if (config.hasOwnProperty("only_eligible")) {
          dispatch(setEligibilityFlag(config?.only_eligible));
        } else {
          dispatch(setEligibilityFlag(true));
        }
      } catch (error) {
      } finally {
        dispatch(setClientConfigLoader(false));
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
    if (!allocationInventoryPayload) return;

    prepareInventoryPayload(
      JSON.parse(allocationInventoryPayload),
      dispatch,
      setActiveKey
    );
  }, [allocationInventoryPayload]);

  useEffect(() => {
    if (redirectedFromInventoryDashboard) {
      prepareInventoryPayload(
        JSON.parse(redirectedFromInventoryDashboard),
        dispatch,
        setActiveKey
      );
    }
  }, [redirectedFromInventoryDashboard]);

  useEffect(() => {
    if (props?.isRedirectedFromInventory && redirectedFromInventoryDashboard) {
      dispatch(setIsRedirectedFromInventory(true));
    }
  }, []);

  useEffect(() => {
    if (
      payloadCreatedFromMFP &&
      !(redirectedFromInventoryDashboard || allocationInventoryPayload)
    ) {
      setIsMFPEnabled(true);
      prepareInventoryPayload(
        JSON.parse(payloadCreatedFromMFP),
        dispatch,
        setActiveKey,
        null,
        true
      );
    } else setIsMFPEnabled(false);
  }, [payloadCreatedFromMFP]);

  useEffect(() => {
    return () => {
      dispatch(resetState());
      dispatch(setResetForecastData());
    };
  }, []);

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
    setIsRedirectedToMFP(true);
    let adaPayload = createPayloadForADAVisual(
      adaDashboardReducer,
      adaVisualFilterConfiguration?.appliedFilterData?.dependencyData
    );
    localStorage.setItem("adaPayload", JSON.stringify(adaPayload));
    history.push({
      pathname:
        adaPayload?.isRedirectedFromInventory ||
        payloadForFilterChips?.isRedirectedFromInventory
          ? ADA_VISUAL_MFP_DASHBOARD
          : ADA_DASHBOARD,
      isRedirectedFromADAVisual: true,
      adaPayload: JSON.stringify(adaPayload),
    });
  };

  const classes = useStyles();

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
        title="Leaving Page?"
        children={
          <>
            Are you sure you want to leave the page?
            <br />
            Any unsaved changes will be lost.
          </>
        }
        primaryButtonLabel="Continue"
        secondaryButtonLabel="Cancel"
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
          isRedirectedToMFP={isRedirectedToMFP}
          headerBreadCrumb={<AdaBreadcrumb isMFPEnabled={isMFPEnabled} />}
          {...props}
        >
          <LoadingOverlay
            loader={
              adaDashboardReducer?.fullScreenLoaderCount ||
              adaDashboardReducer?.filterFullScreenLoaderCount ||
              adaReducer?.tenantConfigLoader ||
              adaReducer?.clientConfigLoader ||
              adaReducer?.userConfigLoader
            }
            centerLoaderStyles={centerLoaderStyles}
          >
            <Container
              maxWidth={false}
              className={classNames(
                classes.container,
                adaDashboardReducer?.fullScreenLoaderCount ||
                  adaDashboardReducer?.filterFullScreenLoaderCount ||
                  adaReducer?.tenantConfigLoader ||
                  adaReducer?.clientConfigLoader ||
                  adaReducer?.userConfigLoader
                  ? classes.dataLoading
                  : classes.dataLoaded
              )}
            >
              {payloadCreatedFromMFP && (
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
              )}

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
                      {!showScenario ? "+ Add Scenario 1" : "Delete Scenario 1"}
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
                            ? "+ Add Scenario 2"
                            : "Delete Scenario 2"}
                        </Button>
                      )}
                  </>
                )}
                {adaDashboardReducer?.clientConfig?.attribute_value
                  ?.show_eligible_toggle && (
                  <div className={classes.switchContainer}>
                    <Switch
                      id="isparent"
                      name="isparent"
                      checked={!isEligible}
                      value={!isEligible}
                      onChange={() => dispatch(setEligibilityFlag(!isEligible))}
                      leftLabel="Eligible SKUs"
                      rightLabel="All SKUs"
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
                    label="Driver Contribution"
                  />
                )}
              </div>

              <DashboardTabs
                showScenario={showScenario}
                showScenario2={showScenario2}
                activeKey={activeKey}
                graphPayload={graphPayload}
                isMFPEnabled={isMFPEnabled}
                updateAllData={updateAllData}
                setDisableShowScenario={setDisableShowScenario}
                setActiveKey={setActiveKey}
              />
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
