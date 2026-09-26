import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom-v5-compat";
import { connect, useDispatch } from "react-redux";
import { APP_PLATFORM } from "config/constants";
// import { logoutUser } from "core/actions/authActions";
import { homePageActions } from "core/actions/homePageActions";
import { getTenantConfigApplicationLevel, tenantConfigApiCache } from "core/actions/tenantConfigActions";
import {
  // sideBarActions,
  sideBarDataDispatch,
  setActiveUserApp,
  userConfigurationScreenData,
} from "core/actions/sideBarActions";
import Loader from "core/Utils/Loader/loader";
import { allPlatformApps } from "config/apps-config";
import { cloneDeep, isEmpty } from "lodash";
import { getSpecificScreenName, getApplicationMaster } from "core/actions/tenantConfigActions";
import {
  handleAdaDashboard,
} from "./renderFunctions";
// import PromotionBanner from "../../auth/components/PromotionBanner/PromotionBanner";
import { HomePage } from "impact-ui-v3"
import { getBaseUrl } from "core/Utils/utils";
import { ToggleLoader } from "core/actions/adminActions";
import { getClientName, getUserName, updateAppsDisplayProperties, translateApp, processChatbotConfig } from "./utils";
import { useTranslation } from "impact-ui-v3";

const HomePageUI = (props) => {
  const [mappedApp, setMappedApp] = useState({});
  const [showloader, setLoader] = useState(true);
  const navigate = useNavigate();
  const [toolKitItems, setToolKitItems] = useState([]);
  const [smartAiItems, setSmartAiItems] = useState([]);
  const dispatch = useDispatch();
  const [dataReady, setDataReady] = useState(false);
  const { t } = useTranslation();

  /**
   * @func
   * @desc Update active, mapped and store state to access user application
   * @param {Array} filteredApp
   * @returns {Boolean}
   */
  const updateFilteredApp = async (filteredApp, screenDataBatch) => {
    if (!filteredApp.length) {
      return false;
    }
    let screenArray;
    let appName;

    if (props.userScreenData[filteredApp[0].title]?.screens) {
      screenArray = props.userScreenData[filteredApp[0].title].screens;
      appName = props.userScreenData[filteredApp[0].title]?.appName;
    } else {
      const screenData = await userConfigurationScreenData(
        filteredApp[0].title
      )();

      /**
       * Structure of the api has changed to make screen accessible based on roles and screns assigned to a user
       * Default Value is "All", in case a user hasn't been given an access to a particular app, it comes as blank object and Home page fails to load
       */
      if (screenData?.data?.data?.data?.length > 0) {
        screenData.data.data.data.forEach((e) => {
          appName = e.users.app.toLowerCase();
          screenArray = e.users.screen.map((item) => item.name);
        });
      } else {
        screenArray = ["All"];
        appName = filteredApp[0]?.title;
      }

      screenDataBatch[filteredApp[0].title] = { screens: screenArray, appName };
    }
    filteredApp[0].mapped =
      appName === filteredApp[0].title && Boolean(screenArray.length);
    filteredApp[0].active = true;
    if (filteredApp[0]?.title === "ada") handleAdaDashboard(filteredApp, props);
    return true;
  };

  /**
   * @func
   * @desc update toolkit and smart ai items
   * @param {Object} platformApps
   */
  const updateToolkitAndSmartAiItems = (platformApps) => {
    const toolKit = [];
    const smartAi = [];
    platformApps.featuredApp.forEach(app => {
      if (app.active) {
        toolKit.push(app);
      } else {
        smartAi.push(app);
      }
    });
    setToolKitItems(toolKit);
    setSmartAiItems(smartAi);
  };

  /**
   * @func
   * @desc Run everytime active application list is updated and update local state
   */
  useEffect(() => {
    const fetchAppDataSequentially = async () => {
      setLoader(true);
      try {
      let clientName = localStorage.getItem("CLIENT_NAME");
      let appsConfig = localStorage.getItem("applicationCodesList");

      // Fire independent API calls in parallel
      const [{ data: chatbotAsApp }, tenantData, appsResp] = await Promise.all([
        tenantConfigApiCache(3, { attribute_name: "chatbot_as_app" })(),
        !clientName
          ? props.getTenantConfigApplicationLevel(3, { attribute_name: "client_name" })
          : Promise.resolve(null),
        !appsConfig
          ? props.getApplicationMaster()
          : Promise.resolve([]),
      ]);

      // Process chatbot config
      const platformApplications = processChatbotConfig(chatbotAsApp);

      // Process client name
      if (!clientName) {
        if (tenantData?.data?.status) {
          clientName =
            tenantData?.data?.data[0]?.attribute_value?.value || "vera_bradley";
        }
        localStorage.setItem("CLIENT_NAME", clientName);
      }

      // Process apps config
      if (!appsConfig) {
        localStorage.setItem(
          "applicationCodesList",
          JSON.stringify(appsResp?.data?.data)
        );
        appsConfig = appsResp?.data?.data;
      } else {
        appsConfig = JSON.parse(appsConfig);
      }
      //show/hide configurator option through TAM
      platformApplications.config = platformApplications.config
        ?.filter((app) => {
          if (app.title === "module configurator") {
            return !!props?.showModuleConfigurator;
          }
          return true;
        });
      updateAppsDisplayProperties(platformApplications, appsConfig);
      if (props.userAppData) {
        setLoader(true);
        // Sequentially process each app, one after the other
        const screenDataBatch = {};
        for (const appName of props.userAppData) {
          for (const key of Object.keys(platformApplications)) {
            const filteredApp = platformApplications[key].filter(
              (app) => app?.title?.toLowerCase() === appName?.toLowerCase()
            );
            if (!filteredApp.length) continue;
            const updateFilteredAppConst = await updateFilteredApp(
              filteredApp,
              screenDataBatch
            );
            if (updateFilteredAppConst) {
              break;
            }
          }
        }
        // Batch dispatch all screen data at once
        if (Object.keys(screenDataBatch).length) {
          dispatch(sideBarDataDispatch(screenDataBatch));
        }
        setMappedApp({
          ...platformApplications,
        });
        updateToolkitAndSmartAiItems(platformApplications);
      } else {
        setMappedApp(platformApplications);
        updateToolkitAndSmartAiItems(platformApplications);
      }
    } finally {
      setDataReady(true);
      setLoader(false);
      }
    };
    if(props?.userAppData?.length) {
      fetchAppDataSequentially();
    }
  }, [props.userAppData]);

  /**
   * @func
   * @desc Run only at first render and fetch active Apps and set to store.
   */

  useEffect(() => {
    const fetchData = async () => {
      setLoader(true);
      document.title = APP_PLATFORM.APP_NAME;
      if (!props.userAppData.length) {
        await props.setUserApps();
      }
      await props.getSpecificScreenName(3, {
        attribute_name: "core_screen_configuration",
      });
      setLoader(false);
    };

    fetchData();
  }, []);


  /**
   * @func
   * @desc set localstorage with the current application and redirect
   * @param {Object} app
   */
  const setApp = useCallback(async (app) => {
      const baseUrl = getBaseUrl();
      const redirectPath = props?.customAppRedirects?.attribute_value?.[app?.title];
      const appsConfigRaw = localStorage.getItem("applicationCodesList");
      let overrideBaseUrl = "";
      let launchMode = "";
      if (appsConfigRaw) {
        try {
          const parsed = JSON.parse(appsConfigRaw);
          const matchedApp = Array.isArray(parsed)
            ? parsed.find(
                (a) =>
                  (a?.name || "").toString().toLowerCase() ===
                  (app?.title || "").toString().toLowerCase()
              )
            : null;
          overrideBaseUrl = (matchedApp?.extra?.url || "").toString().trim();
          launchMode = (matchedApp?.extra?.launch_mode || "").toString().toLowerCase();
        } catch (e) {
          overrideBaseUrl = "";
        }
      }

      const targetUrl = overrideBaseUrl ? overrideBaseUrl : app?.url;

      if (redirectPath) {
        const segments = redirectPath.split("/");
        segments.length === 2
          ? window.open(`${baseUrl}/${segments[1]}`, "_blank")
          : navigate(redirectPath);
      } else if (
        launchMode === "in_app" ||
        launchMode === "external" ||
        launchMode === "new_tab"
      ) {
        const href = /^https?:\/\//i.test(targetUrl)
          ? targetUrl
          : `${window.location.origin}${targetUrl.startsWith("/") ? targetUrl : `/${targetUrl}`}`;
        if (launchMode === "new_tab") {
          window.open(href, "_blank");
        } else {
          window.location.assign(href);
        }
      } else {
      navigate(targetUrl);
      }
      props.setActiveUserApp(app.title);
      sessionStorage.setItem("currentApp", app.title);
    ToggleLoader(true) // Enabling central loader
  }, [navigate, props?.customAppRedirects?.attribute_value, props.setActiveUserApp]);

  const onBookDemoClick = useCallback(() => {
    window.open(APP_PLATFORM.DEMO_PAGE, "_blank");
  }, []);

  const onViewReleasedNotesClick = useCallback(() => {
    navigate("/release-notes");
  }, [navigate]);

  const onKnowMoreClick = useCallback((app) => {
    window.open(app.web, "_blank");
  }, []);

  const mappedConfigs = useMemo(
    () => mappedApp?.config?.filter((config) => config.mapped) ?? [],
    [mappedApp?.config]
  );

  const translatedToolKitItems = useMemo(
    () => toolKitItems.map((app) => translateApp(app, t)),
    [toolKitItems, t]
  );

  const translatedSmartAiItems = useMemo(
    () => smartAiItems.map((app) => translateApp(app, t)),
    [smartAiItems, t]
  );

  const translatedConfigs = useMemo(
    () => mappedConfigs.map((app) => translateApp(app, t)),
    [mappedConfigs, t]
  );

  const clientName = useMemo(() => getClientName(), []);
  const userName = useMemo(() => getUserName(), []);

  return (
    <Loader loader={showloader || (Boolean(props.userAppData?.length) && !dataReady)} spinner applyDefaultCenterStyle wrapperPosition="static">
      <HomePage
        clientName={clientName}
        userName={userName}
        toolKitItems={translatedToolKitItems}
        smartAiItems={translatedSmartAiItems}
        onLaunchClick={setApp}
        onBookDemoClick={onBookDemoClick}
        onViewReleasedNotesClick={onViewReleasedNotesClick}
        configurationsMenuItems={translatedConfigs}
        onConfigurationsClick={setApp}
        onKnowMoreClick={onKnowMoreClick}
        showConfigurationsButton={translatedConfigs.length > 0}
      />
    </Loader>
  );
};

const mapStateToProps = (state) => ({
  userAppData: state.homePageReducer.userAppData,
  userScreenData: state.sideBarReducer.userScreenData,
  showModuleConfigurator:
    state.tenantUserRoleMgmtReducer.userRoleManagementReducer
      .showModuleConfigurator,
  customAppRedirects: state.tenantUserRoleMgmtReducer.userRoleManagementReducer.appRedirects
});

export default connect(mapStateToProps, {
    setUserApps: homePageActions,
    setActiveUserApp: setActiveUserApp,
    getTenantConfigApplicationLevel,
    getSpecificScreenName,
    getApplicationMaster,
  },
  null,
  {
    areStatesEqual: (next, prev) =>
      prev.homePageReducer.userAppData === next.homePageReducer.userAppData &&
      prev.sideBarReducer.userScreenData === next.sideBarReducer.userScreenData &&
      prev.tenantUserRoleMgmtReducer.userRoleManagementReducer.showModuleConfigurator ===
      next.tenantUserRoleMgmtReducer.userRoleManagementReducer.showModuleConfigurator &&
      prev.tenantUserRoleMgmtReducer.userRoleManagementReducer.appRedirects ===
        next.tenantUserRoleMgmtReducer.userRoleManagementReducer.appRedirects,
  }
)(React.memo(HomePageUI));
